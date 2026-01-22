import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const whereVendas: any = { createdAt: { gte: inicioMes } };
    const whereOS: any = { createdAt: { gte: inicioMes } };
    const whereEstoque: any = {};

    if (filter.lojaId) {
      whereVendas.lojaId = filter.lojaId;
      whereOS.lojaId = filter.lojaId;
      whereEstoque.lojaId = filter.lojaId;
    }
    if (filter.grupoId) {
      whereVendas.loja = { grupoId: filter.grupoId };
      whereOS.loja = { grupoId: filter.grupoId };
      whereEstoque.loja = { grupoId: filter.grupoId };
    }
    if (req.user?.role === 'VENDEDOR') {
      whereVendas.vendedorId = req.user.id;
    }

    const whereCaixa: any = { createdAt: { gte: inicioMes } };
    if (filter.lojaId) whereCaixa.lojaId = filter.lojaId;
    if (filter.grupoId) whereCaixa.loja = { grupoId: filter.grupoId };

    const [vendasMes, osMes, alertasEstoque, contasVencer, caixaEntradas, caixaSaidas] = await Promise.all([
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
          pago: false,
          vencimento: {
            lte: new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000)
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
      contasVencer,
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

export default router;
