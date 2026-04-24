import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { registrarLog, obterIp } from '../services/logService.js';

const router = Router();
router.use(verifyToken);

router.get('/', requireRole('ADMIN_GERAL'), async (req: AuthRequest, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      usuarioId,
      acao,
      entidade,
      busca,
      dataInicio,
      dataFim,
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * take;

    const where: any = {};

    if (usuarioId) where.usuarioId = parseInt(usuarioId);
    if (acao)      where.acao = acao;
    if (entidade)  where.entidade = entidade;

    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        where.createdAt.lte = fim;
      }
    }

    if (busca) {
      where.OR = [
        { userName:  { contains: busca, mode: 'insensitive' } },
        { detalhes:  { contains: busca, mode: 'insensitive' } },
        { acao:      { contains: busca, mode: 'insensitive' } },
        { entidade:  { contains: busca, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.logAuditoria.count({ where }),
      prisma.logAuditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          usuario: { select: { id: true, nome: true, role: true } },
        },
      }),
    ]);

    res.json({ total, page: parseInt(page), limit: take, logs });
  } catch (e: any) {
    console.error('GET /log-atividades', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/acao', async (req: AuthRequest, res) => {
  try {
    const { acao, entidade, entidadeId, detalhes } = req.body;
    await registrarLog({
      usuarioId:  req.user?.id,
      userName:   req.user?.nome,
      userRole:   req.user?.role,
      acao,
      entidade,
      entidadeId,
      detalhes,
      ip: obterIp(req),
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/usuarios-ativos', requireRole('ADMIN_GERAL'), async (_req, res) => {
  try {
    const usuarios = await prisma.logAuditoria.findMany({
      where: { usuarioId: { not: null } },
      distinct: ['usuarioId'],
      select: { usuarioId: true, userName: true, userRole: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
