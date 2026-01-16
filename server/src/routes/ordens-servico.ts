import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const ordens = await prisma.ordemServico.findMany({
      where,
      include: {
        cliente: true,
        loja: true,
        unidadeFisica: { include: { produto: true } },
        itens: { include: { produto: true, servico: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ordens);
  } catch (error) {
    console.error('Erro ao listar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const os = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: true,
        loja: true,
        unidadeFisica: { include: { produto: true } },
        itens: { include: { produto: true, servico: true } }
      }
    });

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    res.json(os);
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { clienteId, unidadeFisicaId, motoDescricao, tecnico, observacoes, lojaId, itens, desconto } = req.body;

    if (!clienteId || !lojaId) {
      return res.status(400).json({ error: 'Cliente e loja são obrigatórios' });
    }

    const config = await prisma.configuracao.findFirst();
    const maxDesconto = Number(config?.descontoMaxOS || 10);
    const descontoAplicado = Math.min(Number(desconto || 0), maxDesconto);

    let valorTotal = 0;
    const itensProcessados = [];

    if (itens?.length) {
      for (const item of itens) {
        const subtotal = Number(item.precoUnitario) * item.quantidade;
        valorTotal += subtotal;
        itensProcessados.push({
          produtoId: item.produtoId || null,
          servicoId: item.servicoId || null,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario)
        });
      }
    }

    valorTotal = valorTotal * (1 - descontoAplicado / 100);

    const os = await prisma.ordemServico.create({
      data: {
        clienteId: Number(clienteId),
        unidadeFisicaId: unidadeFisicaId ? Number(unidadeFisicaId) : null,
        motoDescricao,
        tecnico,
        observacoes,
        lojaId: Number(lojaId),
        desconto: descontoAplicado,
        valorTotal,
        createdBy: req.user!.id,
        itens: { create: itensProcessados }
      },
      include: { itens: true }
    });

    res.status(201).json(os);
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });

    res.json(os);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/confirmar', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { confirmadaFinanceiro: true, status: 'EXECUTADA' }
    });

    await prisma.caixa.create({
      data: {
        lojaId: os.lojaId,
        tipo: 'entrada',
        descricao: `OS #${os.numero}`,
        valor: os.valorTotal,
        referencia: `os_${os.id}`
      }
    });

    res.json(os);
  } catch (error) {
    console.error('Erro ao confirmar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
