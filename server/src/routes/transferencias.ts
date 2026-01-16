import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) {
      where.OR = [
        { lojaOrigemId: filter.lojaId },
        { lojaDestinoId: filter.lojaId }
      ];
    }
    if (filter.grupoId) {
      where.lojaOrigem = { grupoId: filter.grupoId };
    }

    const transferencias = await prisma.transferencia.findMany({
      where,
      include: {
        lojaOrigem: true,
        lojaDestino: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transferencias);
  } catch (error) {
    console.error('Erro ao listar transferências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { produtoId, lojaOrigemId, lojaDestinoId, quantidade } = req.body;

    if (!produtoId || !lojaOrigemId || !lojaDestinoId || !quantidade) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const lojaOrigem = await prisma.loja.findUnique({ where: { id: Number(lojaOrigemId) } });
    const lojaDestino = await prisma.loja.findUnique({ where: { id: Number(lojaDestinoId) } });

    if (lojaOrigem?.grupoId !== lojaDestino?.grupoId) {
      return res.status(400).json({ error: 'Transferências apenas entre lojas do mesmo grupo' });
    }

    const transferencia = await prisma.transferencia.create({
      data: {
        produtoId: Number(produtoId),
        lojaOrigemId: Number(lojaOrigemId),
        lojaDestinoId: Number(lojaDestinoId),
        quantidade: Number(quantidade),
        solicitadoPor: req.user!.id
      }
    });

    res.status(201).json(transferencia);
  } catch (error) {
    console.error('Erro ao criar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/aprovar', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.update({
      where: { id: Number(req.params.id) },
      data: {
        status: 'APROVADA',
        aprovadoPor: req.user!.id
      }
    });

    res.json(transferencia);
  } catch (error) {
    console.error('Erro ao aprovar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/concluir', async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!transferencia || transferencia.status !== 'APROVADA') {
      return res.status(400).json({ error: 'Transferência não pode ser concluída' });
    }

    await prisma.$transaction([
      prisma.estoque.update({
        where: {
          produtoId_lojaId: {
            produtoId: transferencia.produtoId,
            lojaId: transferencia.lojaOrigemId
          }
        },
        data: { quantidade: { decrement: transferencia.quantidade } }
      }),
      prisma.estoque.upsert({
        where: {
          produtoId_lojaId: {
            produtoId: transferencia.produtoId,
            lojaId: transferencia.lojaDestinoId
          }
        },
        update: { quantidade: { increment: transferencia.quantidade } },
        create: {
          produtoId: transferencia.produtoId,
          lojaId: transferencia.lojaDestinoId,
          quantidade: transferencia.quantidade
        }
      }),
      prisma.transferencia.update({
        where: { id: Number(req.params.id) },
        data: { status: 'CONCLUIDA' }
      })
    ]);

    res.json({ message: 'Transferência concluída' });
  } catch (error) {
    console.error('Erro ao concluir transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/rejeitar', async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJEITADA' }
    });

    res.json(transferencia);
  } catch (error) {
    console.error('Erro ao rejeitar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
