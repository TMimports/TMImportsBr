import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

function calcularNumeroLancamentos(recorrencia: string): number {
  switch (recorrencia) {
    case 'SEMANAL': return 52;
    case 'QUINZENAL': return 26;
    case 'MENSAL': return 12;
    case 'SEMESTRAL': return 4;
    case 'ANUAL': return 2;
    default: return 12;
  }
}

function proximaData(data: Date, recorrencia: string): Date {
  const proxima = new Date(data);
  switch (recorrencia) {
    case 'SEMANAL':
      proxima.setDate(proxima.getDate() + 7);
      break;
    case 'QUINZENAL':
      proxima.setDate(proxima.getDate() + 15);
      break;
    case 'MENSAL':
      proxima.setMonth(proxima.getMonth() + 1);
      break;
    case 'SEMESTRAL':
      proxima.setMonth(proxima.getMonth() + 6);
      break;
    case 'ANUAL':
      proxima.setFullYear(proxima.getFullYear() + 1);
      break;
  }
  return proxima;
}

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
    const filter = applyTenantFilter(req);

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const contas = await prisma.contaReceber.findMany({
      where,
      include: { loja: true },
      orderBy: { vencimento: 'asc' }
    });

    const contasComCliente = await Promise.all(contas.map(async (conta) => {
      let cliente = null;
      if (conta.clienteId) {
        cliente = await prisma.cliente.findUnique({ where: { id: conta.clienteId } });
      }
      return { ...conta, cliente };
    }));

    res.json(contasComCliente);
  } catch (error) {
    console.error('Erro ao listar contas a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-receber', async (req: AuthRequest, res) => {
  try {
    const { lojaId, clienteId, descricao, valor, vencimento, recorrente, recorrencia } = req.body;

    if (!lojaId || !valor || !vencimento || !descricao) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const conta = await prisma.contaReceber.create({
      data: {
        lojaId: Number(lojaId),
        clienteId: clienteId ? Number(clienteId) : null,
        descricao,
        valor: Number(valor),
        vencimento: new Date(vencimento),
        recorrente: recorrente || false,
        recorrencia: recorrente ? recorrencia : null,
        createdBy: req.user!.id
      }
    });

    if (recorrente && recorrencia) {
      const numLancamentos = calcularNumeroLancamentos(recorrencia);
      let dataAtual = new Date(vencimento);
      
      for (let i = 1; i < numLancamentos; i++) {
        dataAtual = proximaData(dataAtual, recorrencia);
        await prisma.contaReceber.create({
          data: {
            lojaId: Number(lojaId),
            clienteId: clienteId ? Number(clienteId) : null,
            descricao,
            valor: Number(valor),
            vencimento: dataAtual,
            recorrente: true,
            recorrencia,
            createdBy: req.user!.id
          }
        });
      }
    }

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-receber/:id', async (req: AuthRequest, res) => {
  try {
    const { descricao, valor, vencimento } = req.body;
    const filter = applyTenantFilter(req);
    
    const contaExistente = await prisma.contaReceber.findFirst({
      where: {
        id: Number(req.params.id),
        ...(filter.lojaId ? { lojaId: filter.lojaId } : {}),
        ...(filter.grupoId ? { loja: { grupoId: filter.grupoId } } : {})
      }
    });
    
    if (!contaExistente) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }
    
    const conta = await prisma.contaReceber.update({
      where: { id: Number(req.params.id) },
      data: {
        descricao,
        valor: Number(valor),
        vencimento: new Date(vencimento)
      }
    });
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-receber/:id/receber', async (req: AuthRequest, res) => {
  try {
    const conta = await prisma.contaReceber.update({
      where: { id: Number(req.params.id) },
      data: { pago: true, dataPago: new Date() }
    });

    await prisma.caixa.create({
      data: {
        lojaId: conta.lojaId,
        tipo: 'entrada',
        descricao: `Recebimento: ${conta.descricao}`,
        valor: conta.valor,
        referencia: `receber_${conta.id}`
      }
    });

    res.json(conta);
  } catch (error) {
    console.error('Erro ao receber conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/contas-receber/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.contaReceber.update({
      where: { id: Number(req.params.id) },
      data: { deletedAt: new Date(), deletedBy: req.user!.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar/resumo', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const [totalPagar, totalPago] = await Promise.all([
      prisma.contaPagar.aggregate({
        where: { ...where, pago: false },
        _sum: { valor: true }
      }),
      prisma.contaPagar.aggregate({
        where: { ...where, pago: true },
        _sum: { valor: true }
      })
    ]);

    res.json({
      totalPagar: Number(totalPagar._sum.valor || 0),
      totalPago: Number(totalPago._sum.valor || 0),
      saldoAberto: Number(totalPagar._sum.valor || 0)
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const { due, status } = req.query;

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };
    
    if (status === 'pendentes') where.pago = false;
    if (status === 'pagas') where.pago = true;

    if (due) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limite = new Date();
      limite.setDate(limite.getDate() + Number(due));
      limite.setHours(23, 59, 59, 999);
      where.vencimento = { gte: hoje, lte: limite };
      where.pago = false;
    }

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

    if (recorrente && recorrencia) {
      const numLancamentos = calcularNumeroLancamentos(recorrencia);
      let dataAtual = new Date(vencimento);
      
      for (let i = 1; i < numLancamentos; i++) {
        dataAtual = proximaData(dataAtual, recorrencia);
        await prisma.contaPagar.create({
          data: {
            lojaId: Number(lojaId),
            categoria,
            descricao,
            valor: Number(valor),
            vencimento: dataAtual,
            recorrente: true,
            recorrencia,
            createdBy: req.user!.id
          }
        });
      }
    }

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-pagar/:id', async (req: AuthRequest, res) => {
  try {
    const { descricao, categoria, valor, vencimento } = req.body;
    const filter = applyTenantFilter(req);
    
    const contaExistente = await prisma.contaPagar.findFirst({
      where: {
        id: Number(req.params.id),
        ...(filter.lojaId ? { lojaId: filter.lojaId } : {}),
        ...(filter.grupoId ? { loja: { grupoId: filter.grupoId } } : {})
      }
    });
    
    if (!contaExistente) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }
    
    const conta = await prisma.contaPagar.update({
      where: { id: Number(req.params.id) },
      data: {
        descricao,
        categoria,
        valor: Number(valor),
        vencimento: new Date(vencimento)
      }
    });
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error);
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

    res.json(conta);
  } catch (error) {
    console.error('Erro ao pagar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/contas-pagar/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.contaPagar.update({
      where: { id: Number(req.params.id) },
      data: { deletedAt: new Date(), deletedBy: req.user!.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
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
