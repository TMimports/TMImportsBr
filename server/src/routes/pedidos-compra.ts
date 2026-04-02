import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

const ROLES_COMPRA = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA', 'GERENTE_LOJA'] as const;

// ─── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { lojaId: qLojaId, status } = req.query;
    const role = req.user!.role;

    const where: any = { ...(status ? { status } : {}) };

    if (role === 'ADMIN_GERAL' || role === 'ADMIN_FINANCEIRO') {
      if (qLojaId) where.lojaId = Number(qLojaId);
    } else if (role === 'DONO_LOJA') {
      const lojas = await prisma.loja.findMany({ where: { grupoId: req.user!.grupoId! }, select: { id: true } });
      where.lojaId = { in: lojas.map(l => l.id) };
    } else {
      where.lojaId = req.user!.lojaId;
    }

    const pedidos = await prisma.pedidoCompra.findMany({
      where,
      include: {
        loja: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } },
        itens: {
          include: { produto: { select: { id: true, nome: true, tipo: true, codigo: true } } }
        },
        confirmadoPor: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(pedidos);
  } catch (e: any) {
    console.error('GET /pedidos-compra', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── GET ONE ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const pedido = await prisma.pedidoCompra.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        loja: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } },
        itens: {
          include: { produto: { select: { id: true, nome: true, tipo: true, preco: true, custo: true } } }
        },
        confirmadoPor: { select: { id: true, nome: true } },
      },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(pedido);
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', requireRole(...ROLES_COMPRA), async (req: AuthRequest, res) => {
  try {
    const { lojaId, fornecedor, numero, previsaoEntrega, observacoes, itens } = req.body;

    if (!lojaId || !fornecedor || !itens?.length) {
      return res.status(400).json({ error: 'lojaId, fornecedor e itens são obrigatórios' });
    }

    const loja = await prisma.loja.findUnique({ where: { id: lojaId } });
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    let valorTotal = 0;
    const itensValidados = [];

    for (const item of itens) {
      if (!item.produtoId || !item.quantidade || !item.valorUnitario) {
        return res.status(400).json({ error: 'Cada item precisa de produtoId, quantidade e valorUnitario' });
      }
      const prod = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      if (!prod) return res.status(404).json({ error: `Produto ${item.produtoId} não encontrado` });

      const vt = Number(item.valorUnitario) * Number(item.quantidade);
      valorTotal += vt;
      itensValidados.push({
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valorUnitario),
        valorTotal: vt,
      });
    }

    const pedido = await prisma.pedidoCompra.create({
      data: {
        lojaId,
        fornecedor,
        numero: numero || null,
        previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
        observacoes: observacoes || null,
        valorTotal,
        createdBy: req.user!.id,
        itens: { create: itensValidados },
      },
      include: {
        itens: { include: { produto: { select: { id: true, nome: true, tipo: true } } } },
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
      },
    });

    await prisma.auditoriaEstoque.create({
      data: {
        lojaId,
        usuarioId: req.user!.id,
        acao: 'CRIACAO_PEDIDO_COMPRA',
        observacao: `Pedido #${pedido.id} criado – Fornecedor: ${fornecedor}`,
        referencia: `pedido:${pedido.id}`,
      }
    });

    res.status(201).json(pedido);
  } catch (e: any) {
    console.error('POST /pedidos-compra', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── CONFIRMAR ENTRADA ────────────────────────────────────────────────────────
router.post('/:id/confirmar', requireRole(...ROLES_COMPRA), async (req: AuthRequest, res) => {
  try {
    const pedido = await prisma.pedidoCompra.findUnique({
      where: { id: Number(req.params.id) },
      include: { itens: true },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (pedido.status === 'CONFIRMADO') return res.status(400).json({ error: 'Pedido já confirmado' });
    if (pedido.status === 'CANCELADO') return res.status(400).json({ error: 'Pedido cancelado não pode ser confirmado' });

    const lojaId = pedido.lojaId;

    await prisma.$transaction(async (tx) => {
      for (const item of pedido.itens) {
        const estoqueAtual = await tx.estoque.findUnique({
          where: { produtoId_lojaId: { produtoId: item.produtoId, lojaId } },
        });

        const qtdAnterior = estoqueAtual?.quantidade ?? 0;
        const custoMedioAnterior = Number(estoqueAtual?.custoMedio ?? item.valorUnitario);
        const custoNovo = Number(item.valorUnitario);
        const qtdNova = item.quantidade;
        const qtdTotal = qtdAnterior + qtdNova;

        const novoCustoMedio = qtdTotal > 0
          ? ((qtdAnterior * custoMedioAnterior) + (qtdNova * custoNovo)) / qtdTotal
          : custoNovo;

        if (estoqueAtual) {
          await tx.estoque.update({
            where: { id: estoqueAtual.id },
            data: { quantidade: { increment: qtdNova }, custoMedio: novoCustoMedio },
          });
        } else {
          await tx.estoque.create({
            data: {
              produtoId: item.produtoId,
              lojaId,
              quantidade: qtdNova,
              estoqueMinimo: 2,
              estoqueMaximo: 50,
              custoMedio: novoCustoMedio,
            },
          });
        }

        await tx.logEstoque.create({
          data: {
            tipo: 'PEDIDO_COMPRA',
            origem: 'PEDIDO_COMPRA',
            origemId: pedido.id,
            produtoId: item.produtoId,
            lojaId,
            quantidade: qtdNova,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdTotal,
            usuarioId: req.user!.id,
          },
        });

        await tx.auditoriaEstoque.create({
          data: {
            lojaId,
            usuarioId: req.user!.id,
            acao: 'CONFIRMACAO_ENTRADA',
            produtoId: item.produtoId,
            quantidade: qtdNova,
            custoAnterior: custoMedioAnterior,
            custoNovo: novoCustoMedio,
            observacao: `Entrada confirmada via Pedido #${pedido.id}`,
            referencia: `pedido:${pedido.id}`,
          },
        });
      }

      await tx.pedidoCompra.update({
        where: { id: pedido.id },
        data: { status: 'CONFIRMADO', confirmedAt: new Date(), confirmedBy: req.user!.id },
      });
    });

    const pedidoAtualizado = await prisma.pedidoCompra.findUnique({
      where: { id: pedido.id },
      include: {
        itens: { include: { produto: { select: { id: true, nome: true, tipo: true } } } },
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
        confirmadoPor: { select: { id: true, nome: true } },
      },
    });

    res.json(pedidoAtualizado);
  } catch (e: any) {
    console.error('POST /pedidos-compra/:id/confirmar', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── CANCELAR ─────────────────────────────────────────────────────────────────
router.post('/:id/cancelar', requireRole(...ROLES_COMPRA), async (req: AuthRequest, res) => {
  try {
    const pedido = await prisma.pedidoCompra.findUnique({ where: { id: Number(req.params.id) } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (pedido.status === 'CONFIRMADO') return res.status(400).json({ error: 'Pedido já confirmado não pode ser cancelado' });

    const atualizado = await prisma.pedidoCompra.update({
      where: { id: pedido.id },
      data: { status: 'CANCELADO' },
    });

    await prisma.auditoriaEstoque.create({
      data: {
        lojaId: pedido.lojaId,
        usuarioId: req.user!.id,
        acao: 'CANCELAMENTO_PEDIDO',
        observacao: `Pedido #${pedido.id} cancelado`,
        referencia: `pedido:${pedido.id}`,
      }
    });

    res.json(atualizado);
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── APROVAR ──────────────────────────────────────────────────────────────────
router.post('/:id/aprovar', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const pedido = await prisma.pedidoCompra.findUnique({ where: { id: Number(req.params.id) } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (pedido.status !== 'PENDENTE') return res.status(400).json({ error: 'Somente pedidos PENDENTES podem ser aprovados' });

    const atualizado = await prisma.pedidoCompra.update({
      where: { id: pedido.id },
      data: { status: 'APROVADO' },
    });
    res.json(atualizado);
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const pedido = await prisma.pedidoCompra.findUnique({ where: { id: Number(req.params.id) } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (pedido.status === 'CONFIRMADO') return res.status(400).json({ error: 'Pedido confirmado não pode ser excluído' });

    await prisma.pedidoCompra.delete({ where: { id: pedido.id } });
    res.json({ message: 'Pedido excluído' });
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
