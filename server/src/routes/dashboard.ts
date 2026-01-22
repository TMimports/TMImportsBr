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

    const whereVendas: any = { createdAt: { gte: inicioMes } };
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

export default router;
