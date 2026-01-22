import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/caixa', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const movimentos = await prisma.caixa.findMany({
      where,
      include: { loja: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(movimentos);
  } catch (error) {
    console.error('Erro ao listar caixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-receber', async (req: AuthRequest, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Erro ao listar contas a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const contas = await prisma.contaPagar.findMany({
      where,
      include: { loja: true },
      orderBy: { vencimento: 'asc' }
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar/alertas', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const baseWhere: any = { pago: false, deletedAt: null };
    if (filter.lojaId) baseWhere.lojaId = filter.lojaId;
    if (filter.grupoId) baseWhere.loja = { grupoId: filter.grupoId };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);
    
    const em3dias = new Date();
    em3dias.setDate(em3dias.getDate() + 3);
    em3dias.setHours(23, 59, 59, 999);
    
    const em7dias = new Date();
    em7dias.setDate(em7dias.getDate() + 7);
    em7dias.setHours(23, 59, 59, 999);

    const [contasHoje, contasEm3Dias, contasEm7Dias] = await Promise.all([
      prisma.contaPagar.findMany({
        where: { ...baseWhere, vencimento: { gte: hoje, lte: fimHoje } },
        include: { loja: true },
        orderBy: { vencimento: 'asc' }
      }),
      prisma.contaPagar.findMany({
        where: { ...baseWhere, vencimento: { gt: fimHoje, lte: em3dias } },
        include: { loja: true },
        orderBy: { vencimento: 'asc' }
      }),
      prisma.contaPagar.findMany({
        where: { ...baseWhere, vencimento: { gt: em3dias, lte: em7dias } },
        include: { loja: true },
        orderBy: { vencimento: 'asc' }
      })
    ]);

    res.json({
      hoje: contasHoje,
      em3dias: contasEm3Dias,
      em7dias: contasEm7Dias
    });
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const { lojaId, categoria, descricao, valor, vencimento, recorrente, recorrencia } = req.body;

    if (!lojaId || !categoria || !valor || !vencimento) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const conta = await prisma.contaPagar.create({
      data: {
        lojaId: Number(lojaId),
        categoria,
        descricao,
        valor: Number(valor),
        vencimento: new Date(vencimento),
        recorrente: recorrente || false,
        recorrencia: recorrente ? recorrencia : null,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-pagar/:id/pagar', async (req: AuthRequest, res) => {
  try {
    const contaAtual = await prisma.contaPagar.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!contaAtual) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const conta = await prisma.contaPagar.update({
      where: { id: Number(req.params.id) },
      data: { pago: true, dataPago: new Date() }
    });

    await prisma.caixa.create({
      data: {
        lojaId: conta.lojaId,
        tipo: 'saida',
        descricao: `${conta.categoria}: ${conta.descricao}`,
        valor: conta.valor,
        referencia: `conta_${conta.id}`
      }
    });

    if (contaAtual.recorrente && contaAtual.recorrencia) {
      let proximoVencimento = new Date(contaAtual.vencimento);
      
      switch (contaAtual.recorrencia) {
        case 'SEMANAL':
          proximoVencimento.setDate(proximoVencimento.getDate() + 7);
          break;
        case 'QUINZENAL':
          proximoVencimento.setDate(proximoVencimento.getDate() + 15);
          break;
        case 'MENSAL':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
          break;
        case 'SEMESTRAL':
          proximoVencimento.setMonth(proximoVencimento.getMonth() + 6);
          break;
        case 'ANUAL':
          proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
          break;
      }

      await prisma.contaPagar.create({
        data: {
          lojaId: contaAtual.lojaId,
          categoria: contaAtual.categoria,
          descricao: contaAtual.descricao,
          valor: contaAtual.valor,
          vencimento: proximoVencimento,
          recorrente: true,
          recorrencia: contaAtual.recorrencia,
          createdBy: contaAtual.createdBy
        }
      });
    }

    res.json(conta);
  } catch (error) {
    console.error('Erro ao pagar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/comissoes', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    
    if (req.user?.role === 'VENDEDOR' || req.user?.role === 'TECNICO') {
      where.usuarioId = req.user.id;
    }

    const comissoes = await prisma.comissao.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true } },
        venda: { select: { id: true } },
        ordemServico: { select: { id: true, numero: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comissoes);
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/comissoes/:id/pagar', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const comissao = await prisma.comissao.update({
      where: { id: Number(req.params.id) },
      data: { pago: true, dataPago: new Date() }
    });

    res.json(comissao);
  } catch (error) {
    console.error('Erro ao pagar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
