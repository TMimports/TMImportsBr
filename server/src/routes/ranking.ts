import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/produtos', verifyToken, async (req, res) => {
  try {
    const { periodo = '30', limite = '10', ordem = 'desc' } = req.query;
    
    const periodoMap: Record<string, number> = { dia: 1, semana: 7, mes: 30, trimestre: 90, ano: 365 };
    const dias = periodoMap[periodo as string] || parseInt(periodo as string) || 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const vendas = await prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: {
        produtoId: { not: null },
        venda: {
          confirmadaFinanceiro: true,
          createdAt: { gte: dataInicio }
        }
      },
      _sum: {
        quantidade: true,
        precoUnitario: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          quantidade: ordem === 'asc' ? 'asc' : 'desc'
        }
      },
      take: parseInt(limite as string)
    });

    const produtosIds = vendas.map((v: any) => v.produtoId).filter(Boolean) as number[];
    
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtosIds } }
    });

    const ranking = vendas.map((v: any, index: number) => {
      const produto = produtos.find(p => p.id === v.produtoId);
      return {
        posicao: index + 1,
        produtoId: v.produtoId,
        codigo: produto?.codigo || '',
        nome: produto?.nome || 'Produto removido',
        tipo: produto?.tipo || '',
        quantidadeVendida: v._sum.quantidade || 0,
        totalVendas: v._count.id || 0,
        faturamento: Number(v._sum.precoUnitario || 0) * (v._sum.quantidade || 1)
      };
    });

    res.json(ranking);
  } catch (error: any) {
    console.error('Erro no ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/servicos', verifyToken, async (req, res) => {
  try {
    const { periodo = '30', limite = '10', ordem = 'desc' } = req.query;
    
    const periodoMap: Record<string, number> = { dia: 1, semana: 7, mes: 30, trimestre: 90, ano: 365 };
    const dias = periodoMap[periodo as string] || parseInt(periodo as string) || 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const osServicos = await prisma.itemOS.groupBy({
      by: ['servicoId'],
      where: {
        servicoId: { not: null },
        ordemServico: {
          status: 'EXECUTADA',
          createdAt: { gte: dataInicio }
        }
      },
      _sum: {
        quantidade: true,
        precoUnitario: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          quantidade: ordem === 'asc' ? 'asc' : 'desc'
        }
      },
      take: parseInt(limite as string)
    });

    const servicosIds = osServicos.map((s: any) => s.servicoId).filter(Boolean) as number[];
    
    const servicos = await prisma.servico.findMany({
      where: { id: { in: servicosIds } }
    });

    const ranking = osServicos.map((s: any, index: number) => {
      const servico = servicos.find(sv => sv.id === s.servicoId);
      return {
        posicao: index + 1,
        servicoId: s.servicoId,
        nome: servico?.nome || 'Servico removido',
        duracao: servico?.duracao,
        quantidadeExecutada: s._sum.quantidade || 0,
        totalOS: s._count.id || 0,
        faturamento: Number(s._sum.precoUnitario || 0) * (s._sum.quantidade || 1)
      };
    });

    res.json(ranking);
  } catch (error: any) {
    console.error('Erro no ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/resumo', verifyToken, async (req, res) => {
  try {
    const { periodo = '30' } = req.query;
    
    const periodoMap: Record<string, number> = { dia: 1, semana: 7, mes: 30, trimestre: 90, ano: 365 };
    const dias = periodoMap[periodo as string] || parseInt(periodo as string) || 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const [
      maisVendidoProduto,
      menosVendidoProduto,
      maisVendidoServico,
      menosVendidoServico,
      totalProdutos,
      totalServicos
    ] = await Promise.all([
      prisma.itemVenda.groupBy({
        by: ['produtoId'],
        where: {
          produtoId: { not: null },
          venda: { confirmadaFinanceiro: true, createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 1
      }),
      prisma.itemVenda.groupBy({
        by: ['produtoId'],
        where: {
          produtoId: { not: null },
          venda: { confirmadaFinanceiro: true, createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'asc' } },
        take: 1
      }),
      prisma.itemOS.groupBy({
        by: ['servicoId'],
        where: {
          servicoId: { not: null },
          ordemServico: { status: 'EXECUTADA', createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 1
      }),
      prisma.itemOS.groupBy({
        by: ['servicoId'],
        where: {
          servicoId: { not: null },
          ordemServico: { status: 'EXECUTADA', createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'asc' } },
        take: 1
      }),
      prisma.itemVenda.aggregate({
        where: {
          produtoId: { not: null },
          venda: { confirmadaFinanceiro: true, createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true }
      }),
      prisma.itemOS.aggregate({
        where: {
          servicoId: { not: null },
          ordemServico: { status: 'EXECUTADA', createdAt: { gte: dataInicio } }
        },
        _sum: { quantidade: true }
      })
    ]);

    const maisVendidoProdutoInfo = maisVendidoProduto[0]?.produtoId
      ? await prisma.produto.findUnique({ where: { id: maisVendidoProduto[0].produtoId } })
      : null;

    const menosVendidoProdutoInfo = menosVendidoProduto[0]?.produtoId
      ? await prisma.produto.findUnique({ where: { id: menosVendidoProduto[0].produtoId } })
      : null;

    const maisVendidoServicoInfo = maisVendidoServico[0]?.servicoId
      ? await prisma.servico.findUnique({ where: { id: maisVendidoServico[0].servicoId } })
      : null;

    const menosVendidoServicoInfo = menosVendidoServico[0]?.servicoId
      ? await prisma.servico.findUnique({ where: { id: menosVendidoServico[0].servicoId } })
      : null;

    res.json({
      periodo: parseInt(periodo as string),
      produtos: {
        maisVendido: maisVendidoProdutoInfo ? {
          nome: maisVendidoProdutoInfo.nome,
          codigo: maisVendidoProdutoInfo.codigo,
          quantidade: maisVendidoProduto[0]._sum.quantidade
        } : null,
        menosVendido: menosVendidoProdutoInfo ? {
          nome: menosVendidoProdutoInfo.nome,
          codigo: menosVendidoProdutoInfo.codigo,
          quantidade: menosVendidoProduto[0]._sum.quantidade
        } : null,
        totalVendido: totalProdutos._sum.quantidade || 0
      },
      servicos: {
        maisExecutado: maisVendidoServicoInfo ? {
          nome: maisVendidoServicoInfo.nome,
          quantidade: maisVendidoServico[0]._sum.quantidade
        } : null,
        menosExecutado: menosVendidoServicoInfo ? {
          nome: menosVendidoServicoInfo.nome,
          quantidade: menosVendidoServico[0]._sum.quantidade
        } : null,
        totalExecutado: totalServicos._sum.quantidade || 0
      }
    });
  } catch (error: any) {
    console.error('Erro no resumo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
