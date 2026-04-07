import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

const INCLUDE_FULL = {
  lojaOrigem: { select: { id: true, nomeFantasia: true, endereco: true } },
  lojaDestino: { select: { id: true, nomeFantasia: true, endereco: true } },
  produto: { select: { id: true, nome: true, tipo: true, codigo: true } },
  solicitadoPorUser: { select: { id: true, nome: true, role: true } },
  aprovadoPorUser:   { select: { id: true, nome: true, role: true } },
};

// GET /api/transferencias — lista solicitações
// ADMIN_GERAL / ADMIN_FINANCEIRO: todas | outros: apenas as que envolvem sua loja
router.get('/', async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    const where: any = {};

    if (!['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(role)) {
      const lojaId = req.user!.lojaId;
      if (lojaId) {
        where.OR = [{ lojaOrigemId: lojaId }, { lojaDestinoId: lojaId }];
      } else if (req.user!.grupoId) {
        where.OR = [
          { lojaOrigem: { grupoId: req.user!.grupoId } },
          { lojaDestino: { grupoId: req.user!.grupoId } },
        ];
      }
    }

    // Filtro por status
    if (req.query.status) where.status = req.query.status;

    const transferencias = await prisma.transferencia.findMany({
      where,
      include: INCLUDE_FULL,
      orderBy: { createdAt: 'desc' },
    });

    res.json(transferencias);
  } catch (error) {
    console.error('Erro ao listar transferências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transferencias — solicitação de transferência (qualquer usuário autenticado)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { produtoId, unidadeFisicaId, lojaOrigemId, lojaDestinoId, quantidade, observacao } = req.body;

    if (!produtoId || !lojaOrigemId || !lojaDestinoId || !quantidade) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const transferencia = await prisma.transferencia.create({
      data: {
        produtoId:     Number(produtoId),
        lojaOrigemId:  Number(lojaOrigemId),
        lojaDestinoId: Number(lojaDestinoId),
        quantidade:    Number(quantidade),
        solicitadoPor: req.user!.id,
      },
      include: INCLUDE_FULL,
    });

    res.status(201).json(transferencia);
  } catch (error) {
    console.error('Erro ao criar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transferencias/:id/aprovar — apenas ADMIN_FINANCEIRO e ADMIN_GERAL
router.put('/:id/aprovar', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APROVADA', aprovadoPor: req.user!.id },
      include: INCLUDE_FULL,
    });
    res.json(transferencia);
  } catch (error) {
    console.error('Erro ao aprovar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transferencias/:id/rejeitar — apenas ADMIN_FINANCEIRO e ADMIN_GERAL
router.put('/:id/rejeitar', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const { motivo } = req.body;
    const transferencia = await prisma.transferencia.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJEITADA', aprovadoPor: req.user!.id },
      include: INCLUDE_FULL,
    });
    res.json(transferencia);
  } catch (error) {
    console.error('Erro ao rejeitar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transferencias/:id/concluir — quem recebe pode concluir
router.put('/:id/concluir', async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.findUnique({ where: { id: Number(req.params.id) } });
    if (!transferencia || transferencia.status !== 'APROVADA') {
      return res.status(400).json({ error: 'Transferência não está aprovada' });
    }

    await prisma.$transaction([
      // Decrementa origem
      prisma.estoque.update({
        where: { produtoId_lojaId: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaOrigemId } },
        data: { quantidade: { decrement: transferencia.quantidade } },
      }),
      // Incrementa destino
      prisma.estoque.upsert({
        where: { produtoId_lojaId: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaDestinoId } },
        update: { quantidade: { increment: transferencia.quantidade } },
        create: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaDestinoId, quantidade: transferencia.quantidade },
      }),
      // Conclui
      prisma.transferencia.update({ where: { id: Number(req.params.id) }, data: { status: 'CONCLUIDA' } }),
    ]);

    res.json({ message: 'Transferência concluída' });
  } catch (error) {
    console.error('Erro ao concluir transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
