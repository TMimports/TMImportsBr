import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const lojaIdFiltro = req.query.lojaId ? Number(req.query.lojaId) : null;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const whereVendas: any = { createdAt: { gte: inicioMes }, tipo: 'VENDA', deletedAt: null };
    const whereOS: any = { createdAt: { gte: inicioMes } };
    const whereEstoque: any = {};
    const whereContas: any = { pago: false };

    if (lojaIdFiltro) {
      whereVendas.lojaId = lojaIdFiltro;
      whereOS.lojaId = lojaIdFiltro;
      whereEstoque.lojaId = lojaIdFiltro;
      whereContas.lojaId = lojaIdFiltro;
    } else if (filter.lojaId) {
      whereVendas.lojaId = filter.lojaId;
      whereOS.lojaId = filter.lojaId;
      whereEstoque.lojaId = filter.lojaId;
      whereContas.lojaId = filter.lojaId;
    } else if (filter.grupoId) {
      whereVendas.loja = { grupoId: filter.grupoId };
      whereOS.loja = { grupoId: filter.grupoId };
      whereEstoque.loja = { grupoId: filter.grupoId };
      whereContas.loja = { grupoId: filter.grupoId };
    }

    if (req.user?.role === 'VENDEDOR') {
      whereVendas.vendedorId = req.user.id;
    }

    const whereCaixa: any = { createdAt: { gte: inicioMes } };
    if (lojaIdFiltro) {
      whereCaixa.lojaId = lojaIdFiltro;
    } else if (filter.lojaId) {
      whereCaixa.lojaId = filter.lojaId;
    } else if (filter.grupoId) {
      whereCaixa.loja = { grupoId: filter.grupoId };
    }

    const [vendasMes, osMes, alertasEstoque, contasHoje, contas3dias, contas7dias, caixaEntradas, caixaSaidas] = await Promise.all([
      prisma.venda.aggregate({
        where: whereVendas,
        _sum: { valorTotal: true },
        _count: true
      }),
      prisma.ordemServico.aggregate({
        where: whereOS,
        _sum: { valorTotal: true },
        _count: true
      }),
      prisma.estoque.count({
        where: {
          ...whereEstoque,
          quantidade: { lte: prisma.estoque.fields.estoqueMinimo }
        }
      }),
      prisma.contaPagar.count({
        where: {
          ...whereContas,
          vencimento: {
            gte: new Date(hoje.setHours(0,0,0,0)),
            lte: new Date(hoje.setHours(23,59,59,999))
          }
        }
      }),
      prisma.contaPagar.count({
        where: {
          ...whereContas,
          vencimento: {
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.contaPagar.count({
        where: {
          ...whereContas,
          vencimento: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.caixa.aggregate({
        where: { ...whereCaixa, tipo: 'entrada' },
        _sum: { valor: true },
        _count: true
      }),
      prisma.caixa.aggregate({
        where: { ...whereCaixa, tipo: 'saida' },
        _sum: { valor: true },
        _count: true
      })
    ]);

    const entradas = Number(caixaEntradas._sum.valor || 0);
    const saidas = Number(caixaSaidas._sum.valor || 0);

    res.json({
      vendasMes: {
        total: vendasMes._sum.valorTotal || 0,
        quantidade: vendasMes._count
      },
      osMes: {
        total: osMes._sum.valorTotal || 0,
        quantidade: osMes._count
      },
      alertasEstoque,
      contasVencer: {
        hoje: contasHoje,
        em3dias: contas3dias,
        em7dias: contas7dias
      },
      fluxoCaixa: {
        entradas,
        saidas,
        saldo: entradas - saidas
      }
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/comparativo-lojas', async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN_GERAL' && req.user?.role !== 'ADMIN_REDE' && req.user?.role !== 'DONO_LOJA') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const filter = applyTenantFilter(req);
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const whereLojas: any = {};
    if (filter.grupoId) whereLojas.grupoId = filter.grupoId;

    const lojas = await prisma.loja.findMany({
      where: whereLojas,
      include: { grupo: true }
    });

    const comparativo = await Promise.all(lojas.map(async (loja) => {
      const [vendas, os, caixaEntradas, caixaSaidas] = await Promise.all([
        prisma.venda.aggregate({
          where: { lojaId: loja.id, createdAt: { gte: inicioMes } },
          _sum: { valorTotal: true },
          _count: true
        }),
        prisma.ordemServico.aggregate({
          where: { lojaId: loja.id, createdAt: { gte: inicioMes } },
          _sum: { valorTotal: true },
          _count: true
        }),
        prisma.caixa.aggregate({
          where: { lojaId: loja.id, createdAt: { gte: inicioMes }, tipo: 'entrada' },
          _sum: { valor: true }
        }),
        prisma.caixa.aggregate({
          where: { lojaId: loja.id, createdAt: { gte: inicioMes }, tipo: 'saida' },
          _sum: { valor: true }
        })
      ]);

      return {
        lojaId: loja.id,
        lojaNome: loja.nomeFantasia || loja.razaoSocial,
        grupoNome: loja.grupo?.nome,
        vendas: {
          total: Number(vendas._sum.valorTotal || 0),
          quantidade: vendas._count
        },
        os: {
          total: Number(os._sum.valorTotal || 0),
          quantidade: os._count
        },
        faturamento: Number(vendas._sum.valorTotal || 0) + Number(os._sum.valorTotal || 0),
        fluxo: {
          entradas: Number(caixaEntradas._sum.valor || 0),
          saidas: Number(caixaSaidas._sum.valor || 0),
          saldo: Number(caixaEntradas._sum.valor || 0) - Number(caixaSaidas._sum.valor || 0)
        }
      };
    }));

    res.json(comparativo);
  } catch (error) {
    console.error('Erro ao carregar comparativo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helper: resolve date range from periodo param
function resolverPeriodo(periodoStr: string, dataInicioStr?: string, dataFimStr?: string): { dataInicio: Date; dataFim: Date } {
  const agora = new Date();
  const dataFim = dataFimStr ? new Date(dataFimStr + 'T23:59:59') : new Date(agora.setHours(23, 59, 59, 999));
  // reset agora
  const now = new Date();

  switch (periodoStr) {
    case 'hoje': {
      const ini = new Date(now); ini.setHours(0, 0, 0, 0);
      const fim = new Date(now); fim.setHours(23, 59, 59, 999);
      return { dataInicio: ini, dataFim: fim };
    }
    case 'ontem': {
      const ini = new Date(now); ini.setDate(ini.getDate() - 1); ini.setHours(0, 0, 0, 0);
      const fim = new Date(now); fim.setDate(fim.getDate() - 1); fim.setHours(23, 59, 59, 999);
      return { dataInicio: ini, dataFim: fim };
    }
    case '7dias': {
      const ini = new Date(now); ini.setDate(ini.getDate() - 6); ini.setHours(0, 0, 0, 0);
      const fim = new Date(now); fim.setHours(23, 59, 59, 999);
      return { dataInicio: ini, dataFim: fim };
    }
    case '30dias': {
      const ini = new Date(now); ini.setDate(ini.getDate() - 29); ini.setHours(0, 0, 0, 0);
      const fim = new Date(now); fim.setHours(23, 59, 59, 999);
      return { dataInicio: ini, dataFim: fim };
    }
    case 'mes':
    default: {
      const ini = new Date(now.getFullYear(), now.getMonth(), 1);
      const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      if (periodoStr === 'custom' && dataInicioStr && dataFimStr) {
        return { dataInicio: new Date(dataInicioStr + 'T00:00:00'), dataFim: new Date(dataFimStr + 'T23:59:59') };
      }
      return { dataInicio: ini, dataFim: fim };
    }
  }
}

// Faturamento comparativo: hoje / mês / ano (para visão por loja)
router.get('/faturamento-comparativo', async (req: AuthRequest, res) => {
  try {
    if (!['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA', 'ADMIN_FINANCEIRO', 'GERENTE_LOJA'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const lojaIdParam = req.query.lojaId ? Number(req.query.lojaId) : null;
    const filter = applyTenantFilter(req);

    const buildLojaFilter = (lid: number | null) => {
      if (lid) return { lojaId: lid };
      if (filter.lojaId) return { lojaId: filter.lojaId };
      if (filter.grupoId) return { loja: { grupoId: filter.grupoId } };
      return {};
    };

    const lf = buildLojaFilter(lojaIdParam);

    const now = new Date();
    const hojeIni = new Date(now); hojeIni.setHours(0, 0, 0, 0);
    const hojeFim = new Date(now); hojeFim.setHours(23, 59, 59, 999);
    const mesIni = new Date(now.getFullYear(), now.getMonth(), 1);
    const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const anoIni = new Date(now.getFullYear(), 0, 1);
    const anoFim = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const baseWhere = { deletedAt: null, confirmadaFinanceiro: true, ...lf };

    const [vHoje, osHoje, vMes, osMes, vAno, osAno] = await Promise.all([
      prisma.venda.aggregate({ where: { ...baseWhere, tipo: 'VENDA', createdAt: { gte: hojeIni, lte: hojeFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
      prisma.ordemServico.aggregate({ where: { ...baseWhere, createdAt: { gte: hojeIni, lte: hojeFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
      prisma.venda.aggregate({ where: { ...baseWhere, tipo: 'VENDA', createdAt: { gte: mesIni, lte: mesFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
      prisma.ordemServico.aggregate({ where: { ...baseWhere, createdAt: { gte: mesIni, lte: mesFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
      prisma.venda.aggregate({ where: { ...baseWhere, tipo: 'VENDA', createdAt: { gte: anoIni, lte: anoFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
      prisma.ordemServico.aggregate({ where: { ...baseWhere, createdAt: { gte: anoIni, lte: anoFim } }, _sum: { valorTotal: true }, _count: { id: true } }),
    ]);

    const soma = (v: any, os: any) => ({
      vendas: Number(v._sum.valorTotal || 0),
      os: Number(os._sum.valorTotal || 0),
      total: Number(v._sum.valorTotal || 0) + Number(os._sum.valorTotal || 0),
      qtd: (v._count.id || 0) + (os._count.id || 0),
    });

    res.json({
      hoje: soma(vHoje, osHoje),
      mes: soma(vMes, osMes),
      ano: soma(vAno, osAno),
    });
  } catch (error) {
    console.error('Erro em faturamento-comparativo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ranking completo das lojas com metricas de periodo
router.get('/ranking-lojas', async (req: AuthRequest, res) => {
  try {
    if (!['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const { periodo = 'mes', dataInicio: di, dataFim: df } = req.query as Record<string, string>;
    const { dataInicio, dataFim } = resolverPeriodo(periodo, di, df);

    const filter = applyTenantFilter(req);
    const whereLojas: any = { ativo: true };
    if (filter.grupoId) whereLojas.grupoId = filter.grupoId;
    if (filter.lojaId) whereLojas.id = filter.lojaId;

    const lojas = await prisma.loja.findMany({
      where: whereLojas,
      include: { grupo: { select: { nome: true } } },
      orderBy: { nomeFantasia: 'asc' }
    });

    // Buscar vendas agrupadas por loja no periodo
    const vendasPorLoja = await prisma.venda.groupBy({
      by: ['lojaId'],
      where: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim } },
      _sum: { valorTotal: true },
      _count: { id: true }
    });
    const vendasMap = new Map(vendasPorLoja.map(v => [v.lojaId, { total: Number(v._sum.valorTotal || 0), qtd: v._count.id }]));

    // Buscar OS agrupadas por loja no periodo
    const osPorLoja = await prisma.ordemServico.groupBy({
      by: ['lojaId'],
      where: { deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim } },
      _sum: { valorTotal: true },
      _count: { id: true }
    });
    const osMap = new Map(osPorLoja.map(o => [o.lojaId, { total: Number(o._sum.valorTotal || 0), qtd: o._count.id }]));

    // Ultima venda por loja
    const ultimasVendas = await prisma.venda.findMany({
      where: { tipo: 'VENDA', deletedAt: null, createdAt: { gte: dataInicio, lte: dataFim } },
      select: { lojaId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['lojaId']
    });
    const ultimaVendaMap = new Map(ultimasVendas.map(v => [v.lojaId, v.createdAt]));

    // Produto mais vendido por loja (por quantidade de itens)
    const itensPorLoja = await prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: {
        produtoId: { not: null },
        venda: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, lojaId: { in: lojas.map(l => l.id) }, createdAt: { gte: dataInicio, lte: dataFim } }
      },
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 50
    });

    // Para cada loja, identificar produto mais vendido individualmente
    const produtosMaisVendidosPorLoja = new Map<number, string>();
    for (const loja of lojas) {
      const itensLoja = await prisma.itemVenda.groupBy({
        by: ['produtoId'],
        where: {
          produtoId: { not: null },
          venda: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, lojaId: loja.id, createdAt: { gte: dataInicio, lte: dataFim } }
        },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 1
      });
      if (itensLoja[0]?.produtoId) {
        const prod = await prisma.produto.findUnique({ where: { id: itensLoja[0].produtoId }, select: { nome: true } });
        if (prod) produtosMaisVendidosPorLoja.set(loja.id, prod.nome);
      }
    }

    // Montar ranking
    const ranking = lojas.map(loja => {
      const v = vendasMap.get(loja.id) || { total: 0, qtd: 0 };
      const o = osMap.get(loja.id) || { total: 0, qtd: 0 };
      const faturamento = v.total + o.total;
      const qtdTotal = v.qtd + o.qtd;
      return {
        lojaId: loja.id,
        lojaNome: loja.nomeFantasia || loja.razaoSocial,
        grupoNome: loja.grupo?.nome || '',
        totalVendas: v.total,
        quantidadeVendas: v.qtd,
        totalOS: o.total,
        quantidadeOS: o.qtd,
        faturamento,
        ticketMedio: qtdTotal > 0 ? faturamento / qtdTotal : 0,
        produtoMaisVendido: produtosMaisVendidosPorLoja.get(loja.id) || null,
        ultimaVenda: ultimaVendaMap.get(loja.id) || null
      };
    });

    // Ordenar por faturamento desc, desempate por qtd vendas
    ranking.sort((a, b) => {
      if (b.faturamento !== a.faturamento) return b.faturamento - a.faturamento;
      if (b.quantidadeVendas !== a.quantidadeVendas) return b.quantidadeVendas - a.quantidadeVendas;
      if (b.ticketMedio !== a.ticketMedio) return b.ticketMedio - a.ticketMedio;
      return 0;
    });

    const rankedResult = ranking.map((r, i) => ({ ...r, posicao: i + 1 }));

    // KPIs gerais do periodo
    const totalGeral = rankedResult.reduce((s, r) => s + r.faturamento, 0);
    const totalVendasGeral = rankedResult.reduce((s, r) => s + r.totalVendas, 0);
    const totalQtdGeral = rankedResult.reduce((s, r) => s + r.quantidadeVendas + r.quantidadeOS, 0);

    // KPIs do DIA (independente do filtro de periodo)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const vendasHoje = await prisma.venda.aggregate({
      where: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: hoje, lte: fimHoje }, ...(filter.lojaId ? { lojaId: filter.lojaId } : filter.grupoId ? { loja: { grupoId: filter.grupoId } } : {}) },
      _sum: { valorTotal: true },
      _count: { id: true }
    });

    res.json({
      periodo: { inicio: dataInicio, fim: dataFim, tipo: periodo },
      kpis: {
        faturamentoTotal: totalGeral,
        totalVendasValor: totalVendasGeral,
        totalTransacoes: totalQtdGeral,
        ticketMedioGeral: totalQtdGeral > 0 ? totalGeral / totalQtdGeral : 0,
        lojaLider: rankedResult[0]?.lojaNome || null,
        vendasHoje: Number(vendasHoje._sum.valorTotal || 0),
        qtdVendasHoje: vendasHoje._count.id
      },
      ranking: rankedResult
    });
  } catch (error) {
    console.error('Erro no ranking de lojas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Produtos mais vendidos por tipo no periodo
router.get('/produtos-mais-vendidos', async (req: AuthRequest, res) => {
  try {
    if (!['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA', 'ADMIN_FINANCEIRO'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const { periodo = 'mes', dataInicio: di, dataFim: df, limite = '10' } = req.query as Record<string, string>;
    const { dataInicio, dataFim } = resolverPeriodo(periodo, di, df);
    const lim = parseInt(limite) || 10;

    const lojaIdParam = req.query.lojaId ? Number(req.query.lojaId) : null;
    const filter = applyTenantFilter(req);
    const lojaFilter = lojaIdParam ? { lojaId: lojaIdParam } : filter.lojaId ? { lojaId: filter.lojaId } : filter.grupoId ? { loja: { grupoId: filter.grupoId } } : {};

    // Top produtos (MOTO e PECA) de vendas
    const topProdutos = await prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: {
        produtoId: { not: null },
        venda: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim }, ...lojaFilter }
      },
      _sum: { quantidade: true, precoUnitario: true },
      _count: { id: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: lim
    });

    const produtosIds = topProdutos.map(p => p.produtoId).filter(Boolean) as number[];
    const produtos = await prisma.produto.findMany({ where: { id: { in: produtosIds } }, select: { id: true, nome: true, tipo: true } });
    const prodMap = new Map(produtos.map(p => [p.id, p]));

    // Total geral de quantidade vendida (para participação %)
    const totalQtd = topProdutos.reduce((s, p) => s + (p._sum.quantidade || 0), 0);

    // Loja que mais vendeu cada produto
    const produtosRanking = topProdutos.map((item, i) => {
      const prod = prodMap.get(item.produtoId!);
      return {
        posicao: i + 1,
        produtoId: item.produtoId,
        nome: prod?.nome || 'Produto removido',
        tipo: prod?.tipo || '',
        quantidadeVendida: item._sum.quantidade || 0,
        faturamento: (item._sum.quantidade || 0) * Number(item._sum.precoUnitario || 0),
        participacao: totalQtd > 0 ? ((item._sum.quantidade || 0) / totalQtd) * 100 : 0
      };
    });

    // Top serviços de OS
    const topServicos = await prisma.itemOS.groupBy({
      by: ['servicoId'],
      where: {
        servicoId: { not: null },
        ordemServico: { deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim }, ...lojaFilter }
      },
      _sum: { quantidade: true, precoUnitario: true },
      _count: { id: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: lim
    });

    const servicosIds = topServicos.map(s => s.servicoId).filter(Boolean) as number[];
    const servicos = await prisma.servico.findMany({ where: { id: { in: servicosIds } }, select: { id: true, nome: true } });
    const servMap = new Map(servicos.map(s => [s.id, s]));

    const servicosRanking = topServicos.map((item, i) => {
      const serv = servMap.get(item.servicoId!);
      return {
        posicao: i + 1,
        servicoId: item.servicoId,
        nome: serv?.nome || 'Serviço removido',
        tipo: 'SERVICO',
        quantidadeVendida: item._sum.quantidade || 0,
        faturamento: (item._sum.quantidade || 0) * Number(item._sum.precoUnitario || 0),
        participacao: 0
      };
    });

    res.json({
      motos: produtosRanking.filter(p => p.tipo === 'MOTO'),
      pecas: produtosRanking.filter(p => p.tipo === 'PECA'),
      servicos: servicosRanking,
      todos: produtosRanking
    });
  } catch (error) {
    console.error('Erro em produtos-mais-vendidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dados de movimentação para gráficos
router.get('/grafico-vendas', async (req: AuthRequest, res) => {
  try {
    if (!['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA', 'ADMIN_FINANCEIRO'].includes(req.user?.role || '')) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const { periodo = 'mes', dataInicio: di, dataFim: df } = req.query as Record<string, string>;
    const { dataInicio, dataFim } = resolverPeriodo(periodo, di, df);

    const lojaIdParam = req.query.lojaId ? Number(req.query.lojaId) : null;
    const filter = applyTenantFilter(req);
    const lojaFilter = lojaIdParam ? { lojaId: lojaIdParam } : filter.lojaId ? { lojaId: filter.lojaId } : filter.grupoId ? { loja: { grupoId: filter.grupoId } } : {};

    // Buscar todas as vendas no período
    const vendas = await prisma.venda.findMany({
      where: { tipo: 'VENDA', deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim }, ...lojaFilter },
      select: { valorTotal: true, createdAt: true, lojaId: true, loja: { select: { nomeFantasia: true, razaoSocial: true } } }
    });

    const ordens = await prisma.ordemServico.findMany({
      where: { deletedAt: null, confirmadaFinanceiro: true, createdAt: { gte: dataInicio, lte: dataFim }, ...lojaFilter },
      select: { valorTotal: true, createdAt: true, lojaId: true }
    });

    const diffDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const agruparPorHora = diffDias <= 1;

    // Agrupar movimentação por hora ou por dia
    const buckets = new Map<string, { vendas: number; os: number; qtdVendas: number; qtdOS: number }>();

    const getBucket = (d: Date) => {
      if (agruparPorHora) {
        return `${String(d.getHours()).padStart(2, '0')}h`;
      } else {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // Inicializar todos os buckets do período
    if (agruparPorHora) {
      for (let h = 0; h < 24; h++) {
        buckets.set(`${String(h).padStart(2, '0')}h`, { vendas: 0, os: 0, qtdVendas: 0, qtdOS: 0 });
      }
    } else {
      const cur = new Date(dataInicio);
      while (cur <= dataFim) {
        const k = `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`;
        if (!buckets.has(k)) buckets.set(k, { vendas: 0, os: 0, qtdVendas: 0, qtdOS: 0 });
        cur.setDate(cur.getDate() + 1);
      }
    }

    for (const v of vendas) {
      const k = getBucket(new Date(v.createdAt));
      const b = buckets.get(k);
      if (b) { b.vendas += Number(v.valorTotal || 0); b.qtdVendas++; }
    }
    for (const o of ordens) {
      const k = getBucket(new Date(o.createdAt));
      const b = buckets.get(k);
      if (b) { b.os += Number(o.valorTotal || 0); b.qtdOS++; }
    }

    const movimentacao = Array.from(buckets.entries()).map(([label, v]) => ({
      label,
      vendas: v.vendas,
      os: v.os,
      total: v.vendas + v.os,
      qtdVendas: v.qtdVendas,
      qtdOS: v.qtdOS
    }));

    // Faturamento por loja
    const lojaFat = new Map<number, { nome: string; faturamento: number; vendas: number; os: number }>();
    for (const v of vendas) {
      const nome = v.loja?.nomeFantasia || v.loja?.razaoSocial || `Loja ${v.lojaId}`;
      const prev = lojaFat.get(v.lojaId) || { nome, faturamento: 0, vendas: 0, os: 0 };
      prev.faturamento += Number(v.valorTotal || 0);
      prev.vendas += Number(v.valorTotal || 0);
      lojaFat.set(v.lojaId, prev);
    }
    for (const o of ordens) {
      const prev = lojaFat.get(o.lojaId) || { nome: `Loja ${o.lojaId}`, faturamento: 0, vendas: 0, os: 0 };
      prev.faturamento += Number(o.valorTotal || 0);
      prev.os += Number(o.valorTotal || 0);
      lojaFat.set(o.lojaId, prev);
    }

    const faturamentoPorLoja = Array.from(lojaFat.values())
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10);

    res.json({ movimentacao, faturamentoPorLoja, agruparPorHora });
  } catch (error) {
    console.error('Erro em grafico-vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── Dashboard por CNPJ/Empresa ─────────────────────────────────────────────
router.get('/empresa/:lojaId', async (req: AuthRequest, res) => {
  try {
    const lojaId = Number(req.params.lojaId);
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    const [
      loja,
      totalVendasMes,
      totalOSMes,
      estoqueSummary,
      contasPagarAbertas,
      contasReceberAbertas,
      notasFiscaisEntrada,
      notasFiscaisSaida,
      ultimasVendas,
      ultimasOS,
    ] = await Promise.all([
      prisma.loja.findUnique({
        where: { id: lojaId },
        include: { grupo: { select: { id: true, nome: true } } },
      }),
      prisma.venda.aggregate({
        where: { lojaId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicioMes, lte: fimMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.ordemServico.aggregate({
        where: { lojaId, createdAt: { gte: inicioMes, lte: fimMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.estoque.findMany({
        where: { lojaId },
        include: { produto: { select: { id: true, nome: true, tipo: true, preco: true } } },
      }),
      prisma.contaPagar.aggregate({
        where: { lojaId, deletedAt: null, status: { in: ['ABERTO', 'PARCIAL'] } },
        _sum: { valor: true, valorPago: true },
        _count: { id: true },
      }),
      prisma.contaReceber.aggregate({
        where: { lojaId, status: { in: ['ABERTO', 'PARCIAL'] } },
        _sum: { valor: true, valorRecebido: true },
        _count: { id: true },
      }),
      prisma.notaFiscal.aggregate({
        where: { lojaId, tipo: 'ENTRADA', dataEmissao: { gte: inicioMes, lte: fimMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.notaFiscal.aggregate({
        where: { lojaId, tipo: 'SAIDA', dataEmissao: { gte: inicioMes, lte: fimMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.venda.findMany({
        where: { lojaId, tipo: 'VENDA', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { cliente: { select: { id: true, nome: true } } },
      }),
      prisma.ordemServico.findMany({
        where: { lojaId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { cliente: { select: { id: true, nome: true } } },
      }),
    ]);

    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const totalMotos = estoqueSummary
      .filter(e => e.produto.tipo === 'MOTO')
      .reduce((sum, e) => sum + e.quantidade, 0);
    const totalPecas = estoqueSummary
      .filter(e => e.produto.tipo === 'PECA')
      .reduce((sum, e) => sum + e.quantidade, 0);
    const valorEstoque = estoqueSummary.reduce(
      (sum, e) => sum + Number(e.produto.preco) * e.quantidade, 0
    );

    res.json({
      loja,
      periodo: { inicio: inicioMes, fim: fimMes },
      vendas: {
        totalValor: Number(totalVendasMes._sum.valorTotal ?? 0),
        totalCount: totalVendasMes._count.id,
      },
      servicos: {
        totalValor: Number(totalOSMes._sum.valorTotal ?? 0),
        totalCount: totalOSMes._count.id,
      },
      estoque: {
        totalMotos,
        totalPecas,
        valorEstoque,
        itens: estoqueSummary.length,
      },
      financeiro: {
        contasPagar: {
          total: Number(contasPagarAbertas._sum.valor ?? 0),
          pago: Number(contasPagarAbertas._sum.valorPago ?? 0),
          count: contasPagarAbertas._count.id,
        },
        contasReceber: {
          total: Number(contasReceberAbertas._sum.valor ?? 0),
          recebido: Number(contasReceberAbertas._sum.valorRecebido ?? 0),
          count: contasReceberAbertas._count.id,
        },
      },
      fiscal: {
        notasEntrada: {
          total: Number(notasFiscaisEntrada._sum.valorTotal ?? 0),
          count: notasFiscaisEntrada._count.id,
        },
        notasSaida: {
          total: Number(notasFiscaisSaida._sum.valorTotal ?? 0),
          count: notasFiscaisSaida._count.id,
        },
      },
      ultimasVendas,
      ultimasOS,
    });
  } catch (error) {
    console.error('Erro em dashboard/empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── Dashboard VENDEDOR ───────────────────────────────────────────────────────
router.get('/vendedor', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const lojaId = req.user!.lojaId;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Últimos 30 dias para tendência
    const inicio30 = new Date(hoje);
    inicio30.setDate(inicio30.getDate() - 29);
    inicio30.setHours(0, 0, 0, 0);

    const [vendasMes, comissoesTotal, comissoesPagas, ultimasVendas, vendasTrend] = await Promise.all([
      prisma.venda.aggregate({
        where: { vendedorId: userId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicioMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.comissao.aggregate({
        where: { usuarioId: userId, createdAt: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.comissao.aggregate({
        where: { usuarioId: userId, pago: true, createdAt: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.venda.findMany({
        where: { vendedorId: userId, tipo: 'VENDA', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, valorTotal: true, createdAt: true, cliente: { select: { nome: true } } },
      }),
      prisma.venda.findMany({
        where: { vendedorId: userId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicio30 } },
        select: { valorTotal: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Tendência diária (30 dias)
    const trendMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(inicio30);
      d.setDate(d.getDate() + i);
      trendMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const v of vendasTrend) {
      const key = v.createdAt.toISOString().slice(0, 10);
      if (trendMap[key] !== undefined) trendMap[key] += Number(v.valorTotal);
    }
    const tendenciaDiaria = Object.entries(trendMap).map(([date, total]) => ({
      label: date.slice(5), // MM-DD
      total,
    }));

    // Top produtos vendidos pelo vendedor
    const itensVendidos = await prisma.itemVenda.findMany({
      where: { venda: { vendedorId: userId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicioMes } } },
      include: { produto: { select: { nome: true, tipo: true } } },
    });
    const prodMap: Record<string, { nome: string; tipo: string; qtd: number; fat: number }> = {};
    for (const item of itensVendidos) {
      const k = String(item.produtoId);
      if (!prodMap[k]) prodMap[k] = { nome: item.produto.nome, tipo: item.produto.tipo, qtd: 0, fat: 0 };
      prodMap[k].qtd += item.quantidade;
      prodMap[k].fat += Number(item.valorUnitario) * item.quantidade;
    }
    const topProdutos = Object.values(prodMap).sort((a, b) => b.fat - a.fat).slice(0, 5);

    // Metas (configurações da loja)
    let metaMotoPerc = 0, metaComissaoPerc = 0;
    if (lojaId) {
      const conf = await prisma.configuracoes.findFirst({ where: { lojaId } });
      if (conf) {
        metaMotoPerc = Number(conf.comissaoMoto);
        metaComissaoPerc = Number(conf.comissaoServico);
      }
    }

    const totalComissoes = Number(comissoesTotal._sum.valor ?? 0);
    const comissoesPagasVal = Number(comissoesPagas._sum.valor ?? 0);

    res.json({
      vendasMes: {
        total: Number(vendasMes._sum.valorTotal ?? 0),
        quantidade: vendasMes._count.id,
      },
      comissoes: {
        total: totalComissoes,
        pagas: comissoesPagasVal,
        pendentes: totalComissoes - comissoesPagasVal,
      },
      tendenciaDiaria,
      topProdutos,
      ultimasVendas: ultimasVendas.map(v => ({
        id: v.id,
        valor: Number(v.valorTotal),
        cliente: v.cliente?.nome || 'Cliente não informado',
        data: v.createdAt,
      })),
      configuracoes: { comissaoMoto: metaMotoPerc, comissaoServico: metaComissaoPerc },
    });
  } catch (error) {
    console.error('Erro em dashboard/vendedor:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Dashboard TECNICO ────────────────────────────────────────────────────────
router.get('/tecnico', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const lojaId = req.user!.lojaId;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicio30 = new Date(hoje);
    inicio30.setDate(inicio30.getDate() - 29);
    inicio30.setHours(0, 0, 0, 0);

    const [osMes, osPorStatus, comissoesTotal, comissoesPagas, ultimasOS, osTrend] = await Promise.all([
      prisma.ordemServico.aggregate({
        where: { tecnicoId: userId, createdAt: { gte: inicioMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.ordemServico.groupBy({
        by: ['status'],
        where: { tecnicoId: userId, createdAt: { gte: inicioMes } },
        _count: { id: true },
        _sum: { valorTotal: true },
      }),
      prisma.comissao.aggregate({
        where: { usuarioId: userId, createdAt: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.comissao.aggregate({
        where: { usuarioId: userId, pago: true, createdAt: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.ordemServico.findMany({
        where: { tecnicoId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, valorTotal: true, createdAt: true, status: true,
          cliente: { select: { nome: true } },
          veiculo: { select: { modelo: true } },
        },
      }),
      prisma.ordemServico.findMany({
        where: { tecnicoId: userId, createdAt: { gte: inicio30 } },
        select: { valorTotal: true, createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Tendência diária
    const trendMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(inicio30);
      d.setDate(d.getDate() + i);
      trendMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const os of osTrend) {
      const key = os.createdAt.toISOString().slice(0, 10);
      if (trendMap[key] !== undefined) trendMap[key] += Number(os.valorTotal ?? 0);
    }
    const tendenciaDiaria = Object.entries(trendMap).map(([date, total]) => ({
      label: date.slice(5),
      total,
    }));

    const totalComissoes = Number(comissoesTotal._sum.valor ?? 0);
    const comissoesPagasVal = Number(comissoesPagas._sum.valor ?? 0);

    res.json({
      osMes: {
        total: Number(osMes._sum.valorTotal ?? 0),
        quantidade: osMes._count.id,
      },
      osPorStatus: osPorStatus.map(s => ({
        status: s.status,
        count: s._count.id,
        total: Number(s._sum.valorTotal ?? 0),
      })),
      comissoes: {
        total: totalComissoes,
        pagas: comissoesPagasVal,
        pendentes: totalComissoes - comissoesPagasVal,
      },
      tendenciaDiaria,
      ultimasOS: ultimasOS.map(os => ({
        id: os.id,
        valor: Number(os.valorTotal ?? 0),
        status: os.status,
        cliente: os.cliente?.nome || 'Cliente não informado',
        veiculo: os.veiculo?.modelo || '—',
        data: os.createdAt,
      })),
    });
  } catch (error) {
    console.error('Erro em dashboard/tecnico:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Dashboard GERENTE_LOJA ───────────────────────────────────────────────────
router.get('/gerente', async (req: AuthRequest, res) => {
  try {
    const lojaId = req.user!.lojaId;
    if (!lojaId) return res.status(400).json({ error: 'Gerente sem loja vinculada' });

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicio30 = new Date(hoje);
    inicio30.setDate(inicio30.getDate() - 29);
    inicio30.setHours(0, 0, 0, 0);

    const [vendasMes, osMes, estoqueBaixo, comissoesMes, vendedoresPerf, osTrend, vendasTrend] = await Promise.all([
      prisma.venda.aggregate({
        where: { lojaId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicioMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.ordemServico.aggregate({
        where: { lojaId, createdAt: { gte: inicioMes } },
        _sum: { valorTotal: true },
        _count: { id: true },
      }),
      prisma.estoque.count({ where: { lojaId, quantidade: { lte: 2 } } }),
      prisma.comissao.aggregate({
        where: { usuario: { lojaId }, createdAt: { gte: inicioMes } },
        _sum: { valor: true },
      }),
      prisma.user.findMany({
        where: { lojaId, role: 'VENDEDOR', ativo: true },
        select: {
          id: true, nome: true,
          vendas: {
            where: { tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicioMes } },
            select: { valorTotal: true },
          },
        },
      }),
      prisma.ordemServico.findMany({
        where: { lojaId, createdAt: { gte: inicio30 } },
        select: { valorTotal: true, createdAt: true },
      }),
      prisma.venda.findMany({
        where: { lojaId, tipo: 'VENDA', deletedAt: null, createdAt: { gte: inicio30 } },
        select: { valorTotal: true, createdAt: true },
      }),
    ]);

    // Tendência diária
    const trendMap: Record<string, { vendas: number; os: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(inicio30);
      d.setDate(d.getDate() + i);
      trendMap[d.toISOString().slice(0, 10)] = { vendas: 0, os: 0 };
    }
    for (const v of vendasTrend) {
      const key = v.createdAt.toISOString().slice(0, 10);
      if (trendMap[key]) trendMap[key].vendas += Number(v.valorTotal);
    }
    for (const os of osTrend) {
      const key = os.createdAt.toISOString().slice(0, 10);
      if (trendMap[key]) trendMap[key].os += Number(os.valorTotal ?? 0);
    }
    const tendenciaDiaria = Object.entries(trendMap).map(([date, vals]) => ({
      label: date.slice(5),
      vendas: vals.vendas,
      os: vals.os,
      total: vals.vendas + vals.os,
    }));

    // Ranking de vendedores
    const rankingVendedores = vendedoresPerf.map(v => ({
      id: v.id,
      nome: v.nome,
      totalVendas: v.vendas.reduce((s: number, vv: any) => s + Number(vv.valorTotal), 0),
      qtdVendas: v.vendas.length,
    })).sort((a, b) => b.totalVendas - a.totalVendas);

    res.json({
      vendasMes: { total: Number(vendasMes._sum.valorTotal ?? 0), quantidade: vendasMes._count.id },
      osMes: { total: Number(osMes._sum.valorTotal ?? 0), quantidade: osMes._count.id },
      estoqueBaixo,
      comissoesMes: Number(comissoesMes._sum.valor ?? 0),
      faturamentoMes: Number(vendasMes._sum.valorTotal ?? 0) + Number(osMes._sum.valorTotal ?? 0),
      tendenciaDiaria,
      rankingVendedores,
    });
  } catch (error) {
    console.error('Erro em dashboard/gerente:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;

