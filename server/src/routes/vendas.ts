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
    if (req.user?.role === 'VENDEDOR') where.vendedorId = req.user.id;

    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: true,
        vendedor: { select: { id: true, nome: true } },
        loja: true,
        itens: { include: { produto: true, servico: true, unidadeFisica: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: true,
        vendedor: true,
        loja: true,
        itens: { include: { produto: true, servico: true, unidadeFisica: true } }
      }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { tipo, clienteId, vendedorId, lojaId, formaPagamento, parcelas, itens } = req.body;

    if (!clienteId || !lojaId || !formaPagamento || !itens?.length) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const config = await prisma.configuracao.findFirst();

    let valorTotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      let precoUnitario = Number(item.precoUnitario);
      let desconto = Number(item.desconto || 0);

      if (item.produtoId) {
        const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
        if (produto) {
          const maxDesconto = produto.tipo === 'MOTO' ? (config?.descontoMaxMoto || 3.5) : (config?.descontoMaxPeca || 10);
          if (desconto > Number(maxDesconto)) desconto = Number(maxDesconto);
        }
      }

      if (formaPagamento === 'CARTAO') desconto = 0;

      const subtotal = precoUnitario * item.quantidade * (1 - desconto / 100);
      valorTotal += subtotal;

      itensProcessados.push({
        produtoId: item.produtoId || null,
        servicoId: item.servicoId || null,
        unidadeFisicaId: item.unidadeFisicaId || null,
        quantidade: item.quantidade,
        precoUnitario,
        desconto
      });
    }

    const venda = await prisma.venda.create({
      data: {
        tipo: tipo || 'VENDA',
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId || req.user!.id),
        lojaId: Number(lojaId),
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : null,
        valorTotal,
        createdBy: req.user!.id,
        itens: { create: itensProcessados }
      },
      include: { itens: true }
    });

    for (const item of itensProcessados) {
      if (item.unidadeFisicaId) {
        await prisma.unidadeFisica.update({
          where: { id: item.unidadeFisicaId },
          data: { status: 'VENDIDA' }
        });
      }
    }

    res.status(201).json(venda);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/confirmar', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const venda = await prisma.venda.update({
      where: { id: Number(req.params.id) },
      data: { confirmadaFinanceiro: true }
    });

    await prisma.caixa.create({
      data: {
        lojaId: venda.lojaId,
        tipo: 'entrada',
        descricao: `Venda #${venda.id}`,
        valor: venda.valorTotal,
        formaPagamento: venda.formaPagamento,
        referencia: `venda_${venda.id}`
      }
    });

    res.json(venda);
  } catch (error) {
    console.error('Erro ao confirmar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
