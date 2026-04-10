import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { criarDisparo } from '../services/whatsapp.js';

const router = Router();

router.use(verifyToken);

const INCLUDE_FULL = {
  lojaOrigem: { select: { id: true, nomeFantasia: true, endereco: true } },
  lojaDestino: { select: { id: true, nomeFantasia: true, endereco: true } },
  produto: { select: { id: true, nome: true, tipo: true, codigo: true } },
  solicitadoPorUser: { select: { id: true, nome: true, role: true } },
  aprovadoPorUser:   { select: { id: true, nome: true, role: true } },
  unidadeFisica: { select: { id: true, chassi: true, cor: true, ano: true, codigoMotor: true } },
};

// GET /api/transferencias — lista solicitações
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

// POST /api/transferencias — solicitação (qualquer usuário autenticado)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { produtoId, unidadeFisicaId, lojaOrigemId, lojaDestinoId, quantidade } = req.body;

    if (!produtoId || !lojaOrigemId || !lojaDestinoId || !quantidade) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const transferencia = await prisma.transferencia.create({
      data: {
        produtoId:       Number(produtoId),
        lojaOrigemId:    Number(lojaOrigemId),
        lojaDestinoId:   Number(lojaDestinoId),
        quantidade:      Number(quantidade),
        solicitadoPor:   req.user!.id,
        unidadeFisicaId: unidadeFisicaId ? Number(unidadeFisicaId) : undefined,
      },
      include: INCLUDE_FULL,
    });

    // ── Notificar ADMIN_FINANCEIRO e ADMIN_GERAL via WhatsApp ──
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN_FINANCEIRO', 'ADMIN_GERAL'] }, ativo: true, telefone: { not: null } },
        select: { id: true, nome: true, telefone: true },
      });

      const solicitante = req.user!.nome || 'Usuário';
      const produto     = transferencia.produto?.nome || `Produto #${produtoId}`;
      const origem      = transferencia.lojaOrigem?.nomeFantasia || `Loja #${lojaOrigemId}`;
      const destino     = transferencia.lojaDestino?.nomeFantasia || `Loja #${lojaDestinoId}`;
      const qtd         = transferencia.quantidade;

      const mensagem =
        `🔄 *Nova Solicitação de Transferência #${transferencia.id}*\n\n` +
        `📦 Produto: ${produto}\n` +
        `📍 Origem: ${origem}\n` +
        `🏪 Destino: ${destino}\n` +
        `Qtd: ${qtd}\n\n` +
        `👤 Solicitado por: ${solicitante}\n\n` +
        `Acesse o sistema para aprovar ou rejeitar.`;

      for (const admin of admins) {
        if (admin.telefone) {
          await criarDisparo({
            destinatario:       admin.nome,
            numero:             admin.telefone,
            mensagem,
            contexto:           'TRANSFERENCIA',
            tipo:               'AUTOMATICO',
            destinatarioUserId: admin.id,
          }).catch(() => {}); // silently ignore errors per admin
        }
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar admins via WhatsApp:', notifyErr);
      // não interrompe a resposta
    }

    res.status(201).json(transferencia);
  } catch (error) {
    console.error('Erro ao criar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transferencias/:id/aprovar — ADMIN_FINANCEIRO e ADMIN_GERAL
// Aceita { unidadeFisicaId } no body para atribuir chassi durante aprovação
router.put('/:id/aprovar', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const { unidadeFisicaId } = req.body;

    const updateData: any = { status: 'APROVADA', aprovadoPor: req.user!.id };
    if (unidadeFisicaId) updateData.unidadeFisicaId = Number(unidadeFisicaId);

    const transferencia = await prisma.transferencia.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: INCLUDE_FULL,
    });
    res.json(transferencia);
  } catch (error) {
    console.error('Erro ao aprovar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transferencias/:id/rejeitar — ADMIN_FINANCEIRO e ADMIN_GERAL
router.put('/:id/rejeitar', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
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

// PUT /api/transferencias/:id/concluir — loja destino confirma recebimento
router.put('/:id/concluir', async (req: AuthRequest, res) => {
  try {
    const transferencia = await prisma.transferencia.findUnique({ where: { id: Number(req.params.id) } });
    if (!transferencia || transferencia.status !== 'APROVADA') {
      return res.status(400).json({ error: 'Transferência não está aprovada' });
    }

    const ops: any[] = [
      prisma.estoque.update({
        where: { produtoId_lojaId: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaOrigemId } },
        data: { quantidade: { decrement: transferencia.quantidade } },
      }),
      prisma.estoque.upsert({
        where: { produtoId_lojaId: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaDestinoId } },
        update: { quantidade: { increment: transferencia.quantidade } },
        create: { produtoId: transferencia.produtoId, lojaId: transferencia.lojaDestinoId, quantidade: transferencia.quantidade },
      }),
      prisma.transferencia.update({ where: { id: Number(req.params.id) }, data: { status: 'CONCLUIDA' } }),
    ];

    if (transferencia.unidadeFisicaId) {
      ops.push(
        prisma.unidadeFisica.update({
          where: { id: transferencia.unidadeFisicaId },
          data: { lojaId: transferencia.lojaDestinoId },
        })
      );
    }

    await prisma.$transaction(ops);
    res.json({ message: 'Transferência concluída' });
  } catch (error) {
    console.error('Erro ao concluir transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
