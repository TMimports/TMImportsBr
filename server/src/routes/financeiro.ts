import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    case 'SEMANAL': proxima.setDate(proxima.getDate() + 7); break;
    case 'QUINZENAL': proxima.setDate(proxima.getDate() + 15); break;
    case 'MENSAL': proxima.setMonth(proxima.getMonth() + 1); break;
    case 'SEMESTRAL': proxima.setMonth(proxima.getMonth() + 6); break;
    case 'ANUAL': proxima.setFullYear(proxima.getFullYear() + 1); break;
  }
  return proxima;
}

function tenantWhere(req: AuthRequest) {
  const filter = applyTenantFilter(req);
  const where: any = {};
  if (filter.lojaId) where.lojaId = filter.lojaId;
  if (filter.grupoId) where.loja = { grupoId: filter.grupoId };
  return where;
}

// ── Caixa ─────────────────────────────────────────────────────────────────────

router.get('/caixa', async (req: AuthRequest, res) => {
  try {
    const where = tenantWhere(req);
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

// ── Dashboard Financeiro ──────────────────────────────────────────────────────

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7); em7dias.setHours(23, 59, 59, 999);

    // ADMIN_GERAL pode filtrar por loja específica via query param
    const { lojaId: queryLojaId } = req.query;
    if (queryLojaId && !tw.lojaId && !tw.loja) {
      (tw as any).lojaId = Number(queryLojaId);
    }

    const baseCP: any = { ...tw, deletedAt: null };
    const baseCR: any = { ...tw, deletedAt: null };

    const [
      cpAberto, cpVencendo, cpVencido,
      crAberto, crVencendo, crVencido,
      cpPagoMes, crRecebidoMes
    ] = await Promise.all([
      prisma.contaPagar.aggregate({ where: { ...baseCP, pago: false }, _sum: { valor: true }, _count: true }),
      prisma.contaPagar.aggregate({ where: { ...baseCP, pago: false, vencimento: { gte: hoje, lte: em7dias } }, _sum: { valor: true }, _count: true }),
      prisma.contaPagar.aggregate({ where: { ...baseCP, pago: false, vencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
      prisma.contaReceber.aggregate({ where: { ...baseCR, pago: false }, _sum: { valor: true }, _count: true }),
      prisma.contaReceber.aggregate({ where: { ...baseCR, pago: false, vencimento: { gte: hoje, lte: em7dias } }, _sum: { valor: true }, _count: true }),
      prisma.contaReceber.aggregate({ where: { ...baseCR, pago: false, vencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
      prisma.contaPagar.aggregate({ where: { ...baseCP, pago: true, dataPago: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { valor: true } }),
      prisma.contaReceber.aggregate({ where: { ...baseCR, pago: true, dataPago: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { valor: true } }),
    ]);

    res.json({
      contasPagar: {
        totalAberto: Number(cpAberto._sum.valor || 0),
        qtdAberto: cpAberto._count,
        totalVencendo7dias: Number(cpVencendo._sum.valor || 0),
        qtdVencendo7dias: cpVencendo._count,
        totalVencido: Number(cpVencido._sum.valor || 0),
        qtdVencido: cpVencido._count,
        totalPagoMes: Number(cpPagoMes._sum.valor || 0),
      },
      contasReceber: {
        totalAberto: Number(crAberto._sum.valor || 0),
        qtdAberto: crAberto._count,
        totalVencendo7dias: Number(crVencendo._sum.valor || 0),
        qtdVencendo7dias: crVencendo._count,
        totalVencido: Number(crVencido._sum.valor || 0),
        qtdVencido: crVencido._count,
        totalRecebidoMes: Number(crRecebidoMes._sum.valor || 0),
      },
      saldoLiquido: Number(crAberto._sum.valor || 0) - Number(cpAberto._sum.valor || 0),
    });
  } catch (error) {
    console.error('Erro no dashboard financeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Contas a Receber ──────────────────────────────────────────────────────────

router.get('/contas-receber/resumo', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const { lojaId: queryLojaId } = req.query;
    if (queryLojaId && !tw.lojaId && !tw.loja) (tw as any).lojaId = Number(queryLojaId);
    const where: any = { ...tw, deletedAt: null };
    const [aberto, recebido] = await Promise.all([
      prisma.contaReceber.aggregate({ where: { ...where, pago: false }, _sum: { valor: true } }),
      prisma.contaReceber.aggregate({ where: { ...where, pago: true }, _sum: { valor: true } })
    ]);
    res.json({
      totalAberto: Number(aberto._sum.valor || 0),
      totalRecebido: Number(recebido._sum.valor || 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-receber', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const { status, origem, lojaId: queryLojaId } = req.query;

    const where: any = { ...tw, deletedAt: null };
    // ADMIN_GERAL pode filtrar por loja específica
    if (queryLojaId && !tw.lojaId && !tw.loja) where.lojaId = Number(queryLojaId);
    if (status === 'pendentes') where.pago = false;
    if (status === 'recebidas') where.pago = true;

    const contas = await prisma.contaReceber.findMany({
      where,
      include: {
        loja: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true, natureza: true } },
        departamento: { select: { id: true, nome: true } },
        parcelas: { orderBy: { numero: 'asc' } }
      },
      orderBy: { vencimento: 'asc' }
    });

    const contasComCliente = await Promise.all(contas.map(async (conta) => {
      let cliente = null;
      if (conta.clienteId) {
        cliente = await prisma.cliente.findUnique({
          where: { id: conta.clienteId },
          select: { id: true, nome: true, cpfCnpj: true }
        });
      }
      return { ...conta, cliente };
    }));

    res.json(contasComCliente);
  } catch (error) {
    console.error('Erro ao listar contas a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-receber/:id', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const conta = await prisma.contaReceber.findFirst({
      where: { id: Number(req.params.id), ...tw, deletedAt: null },
      include: {
        loja: { select: { id: true, nomeFantasia: true } },
        categoria: true,
        departamento: true,
        parcelas: { orderBy: { numero: 'asc' } },
        recebimentos: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

    let cliente = null;
    if (conta.clienteId) {
      cliente = await prisma.cliente.findUnique({ where: { id: conta.clienteId } });
    }
    res.json({ ...conta, cliente });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-receber/retroativas', requireRole('ADMIN_GERAL', 'ADMIN_REDE'), async (req: AuthRequest, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: { tipo: 'VENDA', confirmadaFinanceiro: true, deletedAt: null }
    });

    let contasCriadas = 0;
    for (const venda of vendas) {
      const contasExistentes = await prisma.contaReceber.count({ where: { vendaId: venda.id } });
      if (contasExistentes > 0) continue;

      const fp = venda.formaPagamento;
      if (fp === 'FINANCIAMENTO' || (venda.parcelas && venda.parcelas > 1)) {
        const numParcelas = venda.parcelas || 1;
        const valorParcela = Number(venda.valorTotal) / numParcelas;
        for (let i = 0; i < numParcelas; i++) {
          const vencimento = new Date(venda.createdAt);
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          await prisma.contaReceber.create({
            data: {
              lojaId: venda.lojaId, clienteId: venda.clienteId, vendaId: venda.id,
              descricao: `Venda #${venda.id} - Parcela ${i + 1}/${numParcelas}`,
              valor: valorParcela, vencimento, createdBy: req.user!.id
            }
          });
          contasCriadas++;
        }
      } else {
        const vencimento = new Date(venda.createdAt);
        if (fp === 'CARTAO_CREDITO') vencimento.setDate(vencimento.getDate() + 30);
        const isPago = fp === 'PIX' || fp === 'DINHEIRO' || fp === 'CARTAO_DEBITO';
        await prisma.contaReceber.create({
          data: {
            lojaId: venda.lojaId, clienteId: venda.clienteId, vendaId: venda.id,
            descricao: `Venda #${venda.id} - ${fp}`,
            valor: Number(venda.valorTotal), vencimento, createdBy: req.user!.id,
            pago: isPago, dataPago: isPago ? venda.createdAt : null
          }
        });
        contasCriadas++;
      }
    }

    res.json({
      success: true,
      contasCriadas,
      vendasProcessadas: vendas.length,
      mensagem: `${contasCriadas} contas a receber criadas retroativamente`
    });
  } catch (error) {
    console.error('Erro ao criar contas retroativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-receber', async (req: AuthRequest, res) => {
  try {
    const {
      lojaId, clienteId, descricao, valor, vencimento,
      recorrente, recorrencia, observacoes,
      categoriaId, departamentoId, numeroParcelas
    } = req.body;

    if (!lojaId || !valor || !vencimento || !descricao) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const filter = applyTenantFilter(req);
    if (filter.lojaId && filter.lojaId !== Number(lojaId)) {
      return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }
    if (filter.grupoId) {
      const loja = await prisma.loja.findFirst({ where: { id: Number(lojaId), grupoId: filter.grupoId } });
      if (!loja) return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }

    const nParcelas = Number(numeroParcelas) || 1;

    const conta = await prisma.contaReceber.create({
      data: {
        lojaId: Number(lojaId),
        clienteId: clienteId ? Number(clienteId) : null,
        descricao,
        valor: Number(valor),
        vencimento: new Date(vencimento),
        recorrente: recorrente || false,
        recorrencia: recorrente ? recorrencia : null,
        observacoes: observacoes || null,
        categoriaId: categoriaId ? Number(categoriaId) : null,
        departamentoId: departamentoId ? Number(departamentoId) : null,
        numeroParcelas: nParcelas,
        createdBy: req.user!.id
      }
    });

    // Gerar parcelas
    if (nParcelas > 1) {
      const valorParcela = Number(valor) / nParcelas;
      for (let i = 0; i < nParcelas; i++) {
        const dtVenc = new Date(vencimento);
        dtVenc.setMonth(dtVenc.getMonth() + i);
        await prisma.parcelaContaReceber.create({
          data: {
            contaReceberId: conta.id,
            numero: i + 1,
            valor: valorParcela,
            vencimento: dtVenc
          }
        });
      }
    }

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
            observacoes: observacoes || null,
            categoriaId: categoriaId ? Number(categoriaId) : null,
            departamentoId: departamentoId ? Number(departamentoId) : null,
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
    const { descricao, valor, vencimento, observacoes, categoriaId, departamentoId } = req.body;
    const tw = tenantWhere(req);
    const contaExistente = await prisma.contaReceber.findFirst({
      where: { id: Number(req.params.id), ...tw, deletedAt: null }
    });
    if (!contaExistente) return res.status(404).json({ error: 'Conta não encontrada' });

    const updateData: any = {};
    if (descricao !== undefined) updateData.descricao = descricao;
    if (valor !== undefined) updateData.valor = Number(valor);
    if (vencimento !== undefined) updateData.vencimento = new Date(vencimento);
    if (observacoes !== undefined) updateData.observacoes = observacoes || null;
    if (categoriaId !== undefined) updateData.categoriaId = categoriaId ? Number(categoriaId) : null;
    if (departamentoId !== undefined) updateData.departamentoId = departamentoId ? Number(departamentoId) : null;

    const conta = await prisma.contaReceber.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: { categoria: true, departamento: true }
    });
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-receber/:id/receber', async (req: AuthRequest, res) => {
  try {
    const { valor, formaPagamento, observacoes } = req.body;
    const tw = tenantWhere(req);
    const contaExistente = await prisma.contaReceber.findFirst({
      where: { id: Number(req.params.id), ...tw }
    });
    if (!contaExistente) return res.status(404).json({ error: 'Conta não encontrada' });

    const valorRecebido = valor ? Number(valor) : Number(contaExistente.valor);
    const novoValorRecebido = Number(contaExistente.valorRecebido) + valorRecebido;
    const totalDivida = Number(contaExistente.valor);
    const quitado = novoValorRecebido >= totalDivida;

    const conta = await prisma.contaReceber.update({
      where: { id: contaExistente.id },
      data: {
        valorRecebido: novoValorRecebido,
        pago: quitado,
        dataPago: quitado ? new Date() : null,
        status: quitado ? 'LIQUIDADO' : 'PARCIAL'
      }
    });

    // Registrar recebimento
    const recebimento = await prisma.recebimento.create({
      data: {
        lojaId: contaExistente.lojaId,
        contaReceberId: contaExistente.id,
        valor: valorRecebido,
        dataRecebimento: new Date(),
        formaPagamento: (formaPagamento || 'PIX') as any,
        observacoes: observacoes || null,
        createdBy: req.user!.id
      }
    });

    // Registrar no caixa
    await prisma.caixa.create({
      data: {
        lojaId: conta.lojaId,
        tipo: 'entrada',
        descricao: `Recebimento: ${conta.descricao}`,
        valor: valorRecebido,
        referencia: `receber_${conta.id}`
      }
    });

    // Auto-criar lançamento bancário (conciliação)
    const contaBancariaReceber = await prisma.contaBancaria.findFirst({ where: { lojaId: conta.lojaId } });
    if (contaBancariaReceber) {
      await prisma.lancamentoBancario.create({
        data: {
          contaBancariaId: contaBancariaReceber.id,
          data: new Date(),
          descricao: `Recebimento: ${conta.descricao}`,
          valor: valorRecebido,
          tipo: 'CREDITO',
          recebimentoId: recebimento.id,
        }
      });
    }

    res.json(conta);
  } catch (error) {
    console.error('Erro ao receber conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/contas-receber/:id', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const contaExistente = await prisma.contaReceber.findFirst({
      where: { id: Number(req.params.id), ...tw }
    });
    if (!contaExistente) return res.status(404).json({ error: 'Conta não encontrada' });

    await prisma.contaReceber.update({
      where: { id: contaExistente.id },
      data: { deletedAt: new Date(), deletedBy: req.user!.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Contas a Pagar ────────────────────────────────────────────────────────────

router.get('/contas-pagar/resumo', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const { lojaId: queryLojaId } = req.query;
    if (queryLojaId && !tw.lojaId && !tw.loja) (tw as any).lojaId = Number(queryLojaId);
    const where: any = { ...tw, deletedAt: null };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7); em7dias.setHours(23, 59, 59, 999);

    const [totalPagar, totalPago, totalVencido, totalVencendo] = await Promise.all([
      prisma.contaPagar.aggregate({ where: { ...where, pago: false }, _sum: { valor: true }, _count: true }),
      prisma.contaPagar.aggregate({ where: { ...where, pago: true }, _sum: { valor: true } }),
      prisma.contaPagar.aggregate({ where: { ...where, pago: false, vencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
      prisma.contaPagar.aggregate({ where: { ...where, pago: false, vencimento: { gte: hoje, lte: em7dias } }, _sum: { valor: true }, _count: true }),
    ]);

    res.json({
      totalPagar: Number(totalPagar._sum.valor || 0),
      qtdAberto: totalPagar._count,
      totalPago: Number(totalPago._sum.valor || 0),
      totalVencido: Number(totalVencido._sum.valor || 0),
      qtdVencido: totalVencido._count,
      totalVencendo7dias: Number(totalVencendo._sum.valor || 0),
      qtdVencendo7dias: totalVencendo._count,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar/alertas', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const baseWhere: any = { ...tw, pago: false, deletedAt: null };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const em3dias = new Date(); em3dias.setDate(em3dias.getDate() + 3); em3dias.setHours(23, 59, 59, 999);
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7); em7dias.setHours(23, 59, 59, 999);

    const [contasHoje, contasEm3Dias, contasEm7Dias, contasVencidas] = await Promise.all([
      prisma.contaPagar.findMany({ where: { ...baseWhere, vencimento: { gte: hoje, lte: fimHoje } }, include: { loja: true, categoria: true }, orderBy: { vencimento: 'asc' } }),
      prisma.contaPagar.findMany({ where: { ...baseWhere, vencimento: { gt: fimHoje, lte: em3dias } }, include: { loja: true, categoria: true }, orderBy: { vencimento: 'asc' } }),
      prisma.contaPagar.findMany({ where: { ...baseWhere, vencimento: { gt: em3dias, lte: em7dias } }, include: { loja: true, categoria: true }, orderBy: { vencimento: 'asc' } }),
      prisma.contaPagar.findMany({ where: { ...baseWhere, vencimento: { lt: hoje } }, include: { loja: true, categoria: true }, orderBy: { vencimento: 'asc' } }),
    ]);

    res.json({ hoje: contasHoje, em3dias: contasEm3Dias, em7dias: contasEm7Dias, vencidas: contasVencidas });
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const { due, status, origem, categoriaId, departamentoId, lojaId: queryLojaId } = req.query;

    const where: any = { ...tw, deletedAt: null };
    // ADMIN_GERAL pode filtrar por loja específica
    if (queryLojaId && !tw.lojaId && !tw.loja) where.lojaId = Number(queryLojaId);
    if (status === 'pendentes') where.pago = false;
    if (status === 'pagas') where.pago = true;
    if (origem) where.origem = origem;
    if (categoriaId) where.categoriaId = Number(categoriaId);
    if (departamentoId) where.departamentoId = Number(departamentoId);

    if (due) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const limite = new Date(); limite.setDate(limite.getDate() + Number(due)); limite.setHours(23, 59, 59, 999);
      where.vencimento = { gte: hoje, lte: limite };
      where.pago = false;
    }

    const contas = await prisma.contaPagar.findMany({
      where,
      include: {
        loja: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true, natureza: true } },
        departamento: { select: { id: true, nome: true } },
        pedidoCompra: { select: { id: true, numero: true, fornecedor: true } },
        parcelas: { orderBy: { numero: 'asc' } }
      },
      orderBy: { vencimento: 'asc' }
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar/:id', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const conta = await prisma.contaPagar.findFirst({
      where: { id: Number(req.params.id), ...tw, deletedAt: null },
      include: {
        loja: { select: { id: true, nomeFantasia: true } },
        categoria: true,
        departamento: true,
        pedidoCompra: { select: { id: true, numero: true, fornecedor: true } },
        parcelas: { orderBy: { numero: 'asc' } },
        pagamentos: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const {
      lojaId, descricao, valor, vencimento,
      recorrente, recorrencia,
      categoriaId, departamentoId, centroCusto,
      fornecedor, documento, observacoes,
      numeroParcelas, origem
    } = req.body;

    if (!lojaId || !valor || !vencimento) {
      return res.status(400).json({ error: 'lojaId, valor e vencimento são obrigatórios' });
    }

    const filter = applyTenantFilter(req);
    if (filter.lojaId && filter.lojaId !== Number(lojaId)) {
      return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }
    if (filter.grupoId) {
      const loja = await prisma.loja.findFirst({ where: { id: Number(lojaId), grupoId: filter.grupoId } });
      if (!loja) return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }

    const nParcelas = Number(numeroParcelas) || 1;

    const conta = await prisma.contaPagar.create({
      data: {
        lojaId: Number(lojaId),
        origem: (origem || 'AVULSA') as any,
        descricao: descricao || null,
        valor: Number(valor),
        vencimento: new Date(vencimento),
        recorrente: recorrente || false,
        recorrencia: recorrente ? recorrencia : null,
        categoriaId: categoriaId ? Number(categoriaId) : null,
        departamentoId: departamentoId ? Number(departamentoId) : null,
        centroCusto: centroCusto || null,
        fornecedor: fornecedor || null,
        documento: documento || null,
        observacoes: observacoes || null,
        numeroParcelas: nParcelas,
        createdBy: req.user!.id
      },
      include: { categoria: true, departamento: true }
    });

    // Gerar parcelas se > 1
    if (nParcelas > 1) {
      const valorParcela = Number(valor) / nParcelas;
      for (let i = 0; i < nParcelas; i++) {
        const dtVenc = new Date(vencimento);
        dtVenc.setMonth(dtVenc.getMonth() + i);
        await prisma.parcelaContaPagar.create({
          data: {
            contaPagarId: conta.id,
            numero: i + 1,
            valor: valorParcela,
            vencimento: dtVenc
          }
        });
      }
    }

    if (recorrente && recorrencia) {
      const numLancamentos = calcularNumeroLancamentos(recorrencia);
      let dataAtual = new Date(vencimento);
      for (let i = 1; i < numLancamentos; i++) {
        dataAtual = proximaData(dataAtual, recorrencia);
        await prisma.contaPagar.create({
          data: {
            lojaId: Number(lojaId),
            origem: 'AVULSA',
            descricao,
            valor: Number(valor),
            vencimento: dataAtual,
            recorrente: true,
            recorrencia,
            categoriaId: categoriaId ? Number(categoriaId) : null,
            departamentoId: departamentoId ? Number(departamentoId) : null,
            fornecedor: fornecedor || null,
            createdBy: req.user!.id
          }
        });
      }
    }

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-pagar/:id', async (req: AuthRequest, res) => {
  try {
    const {
      descricao, valor, vencimento, categoriaId,
      departamentoId, centroCusto, fornecedor, documento, observacoes
    } = req.body;
    const tw = tenantWhere(req);
    const contaExistente = await prisma.contaPagar.findFirst({
      where: { id: Number(req.params.id), ...tw, deletedAt: null }
    });
    if (!contaExistente) return res.status(404).json({ error: 'Conta não encontrada' });

    const data: any = {};
    if (descricao !== undefined) data.descricao = descricao;
    if (valor !== undefined) data.valor = Number(valor);
    if (vencimento !== undefined) data.vencimento = new Date(vencimento);
    if (categoriaId !== undefined) data.categoriaId = categoriaId ? Number(categoriaId) : null;
    if (departamentoId !== undefined) data.departamentoId = departamentoId ? Number(departamentoId) : null;
    if (centroCusto !== undefined) data.centroCusto = centroCusto || null;
    if (fornecedor !== undefined) data.fornecedor = fornecedor || null;
    if (documento !== undefined) data.documento = documento || null;
    if (observacoes !== undefined) data.observacoes = observacoes || null;

    const conta = await prisma.contaPagar.update({
      where: { id: Number(req.params.id) },
      data,
      include: { categoria: true, departamento: true }
    });
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-pagar/:id/pagar', async (req: AuthRequest, res) => {
  try {
    const { valor, formaPagamento, observacoes } = req.body;
    const tw = tenantWhere(req);
    const contaAtual = await prisma.contaPagar.findFirst({
      where: { id: Number(req.params.id), ...tw }
    });
    if (!contaAtual) return res.status(404).json({ error: 'Conta não encontrada' });

    const valorPago = valor ? Number(valor) : Number(contaAtual.valor);
    const novoValorPago = Number(contaAtual.valorPago) + valorPago;
    const totalDivida = Number(contaAtual.valor);
    const quitado = novoValorPago >= totalDivida;

    const conta = await prisma.contaPagar.update({
      where: { id: contaAtual.id },
      data: {
        valorPago: novoValorPago,
        pago: quitado,
        dataPago: quitado ? new Date() : null,
        status: quitado ? 'LIQUIDADO' : 'PARCIAL'
      }
    });

    // Registrar pagamento
    const pagamento = await prisma.pagamento.create({
      data: {
        lojaId: contaAtual.lojaId,
        contaPagarId: contaAtual.id,
        valor: valorPago,
        dataPagamento: new Date(),
        formaPagamento: (formaPagamento || 'PIX') as any,
        observacoes: observacoes || null,
        createdBy: req.user!.id
      }
    });

    // Registrar no caixa
    await prisma.caixa.create({
      data: {
        lojaId: conta.lojaId,
        tipo: 'saida',
        descricao: `${conta.descricao || 'Conta a pagar'} #${conta.id}`,
        valor: valorPago,
        referencia: `conta_${conta.id}`
      }
    });

    // Auto-criar lançamento bancário (conciliação)
    const contaBancariaPagar = await prisma.contaBancaria.findFirst({ where: { lojaId: conta.lojaId } });
    if (contaBancariaPagar) {
      await prisma.lancamentoBancario.create({
        data: {
          contaBancariaId: contaBancariaPagar.id,
          data: new Date(),
          descricao: `${conta.descricao || 'Conta a pagar'} #${conta.id}`,
          valor: valorPago,
          tipo: 'DEBITO',
          pagamentoId: pagamento.id,
        }
      });
    }

    res.json(conta);
  } catch (error) {
    console.error('Erro ao pagar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Pagar parcela específica
router.put('/contas-pagar/parcelas/:parcelaId/pagar', async (req: AuthRequest, res) => {
  try {
    const { formaPagamento, observacoes } = req.body;
    const parcela = await prisma.parcelaContaPagar.findUnique({
      where: { id: Number(req.params.parcelaId) },
      include: { contaPagar: true }
    });
    if (!parcela) return res.status(404).json({ error: 'Parcela não encontrada' });
    if (parcela.status === 'LIQUIDADO') return res.status(400).json({ error: 'Parcela já paga' });

    // Verificar tenant
    const tw = tenantWhere(req);
    const contaOk = await prisma.contaPagar.findFirst({ where: { id: parcela.contaPagarId, ...tw } });
    if (!contaOk) return res.status(403).json({ error: 'Acesso negado' });

    await prisma.parcelaContaPagar.update({
      where: { id: parcela.id },
      data: { status: 'LIQUIDADO', dataPago: new Date(), valorPago: parcela.valor }
    });

    await prisma.pagamento.create({
      data: {
        lojaId: contaOk.lojaId,
        contaPagarId: contaOk.id,
        parcelaId: parcela.id,
        valor: Number(parcela.valor),
        dataPagamento: new Date(),
        formaPagamento: (formaPagamento || 'PIX') as any,
        observacoes: observacoes || null,
        createdBy: req.user!.id
      }
    });

    // Verificar se todas as parcelas foram pagas
    const parcelasRestantes = await prisma.parcelaContaPagar.count({
      where: { contaPagarId: contaOk.id, status: { not: 'LIQUIDADO' } }
    });

    if (parcelasRestantes === 0) {
      await prisma.contaPagar.update({
        where: { id: contaOk.id },
        data: { pago: true, dataPago: new Date(), status: 'LIQUIDADO', valorPago: contaOk.valor }
      });
    } else {
      await prisma.contaPagar.update({
        where: { id: contaOk.id },
        data: { status: 'PARCIAL', valorPago: { increment: Number(parcela.valor) } }
      });
    }

    await prisma.caixa.create({
      data: {
        lojaId: contaOk.lojaId,
        tipo: 'saida',
        descricao: `Parcela ${parcela.numero}/${contaOk.numeroParcelas}: ${contaOk.descricao || '#' + contaOk.id}`,
        valor: parcela.valor,
        referencia: `parcela_${parcela.id}`
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao pagar parcela:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/contas-pagar/:id', async (req: AuthRequest, res) => {
  try {
    const tw = tenantWhere(req);
    const contaExistente = await prisma.contaPagar.findFirst({
      where: { id: Number(req.params.id), ...tw }
    });
    if (!contaExistente) return res.status(404).json({ error: 'Conta não encontrada' });

    await prisma.contaPagar.update({
      where: { id: contaExistente.id },
      data: { deletedAt: new Date(), deletedBy: req.user!.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Comissões ────────────────────────────────────────────────────────────────

router.get('/comissoes', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const where: any = {};

    if (req.user?.role === 'VENDEDOR' || req.user?.role === 'TECNICO') {
      where.usuarioId = req.user.id;
    } else if (filter.grupoId) {
      where.usuario = { grupoId: filter.grupoId };
    } else if (filter.lojaId) {
      where.usuario = { lojaId: filter.lojaId };
    }

    const comissoes = await prisma.comissao.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true, role: true } },
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
    const filter = applyTenantFilter(req);
    const whereCheck: any = { id: Number(req.params.id) };
    if (filter.lojaId) whereCheck.usuario = { lojaId: filter.lojaId };
    if (filter.grupoId) whereCheck.usuario = { grupoId: filter.grupoId };

    const comissaoExistente = await prisma.comissao.findFirst({ where: whereCheck });
    if (!comissaoExistente) return res.status(404).json({ error: 'Comissão não encontrada' });

    const comissao = await prisma.comissao.update({
      where: { id: comissaoExistente.id },
      data: { pago: true, dataPago: new Date() }
    });

    res.json(comissao);
  } catch (error) {
    console.error('Erro ao pagar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
