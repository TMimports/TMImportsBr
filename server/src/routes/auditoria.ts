import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/estoque', async (req: AuthRequest, res) => {
  try {
    const { lojaId: qLojaId, produtoId, acao, page = '1', limit = '50' } = req.query;
    const role = req.user!.role;

    const where: any = {};

    if (role === 'ADMIN_GERAL' || role === 'ADMIN_FINANCEIRO') {
      if (qLojaId) where.lojaId = Number(qLojaId);
    } else if (role === 'DONO_LOJA') {
      const lojas = await prisma.loja.findMany({ where: { grupoId: req.user!.grupoId! }, select: { id: true } });
      where.lojaId = { in: lojas.map(l => l.id) };
    } else {
      where.lojaId = req.user!.lojaId;
    }

    if (produtoId) where.produtoId = Number(produtoId);
    if (acao) where.acao = { contains: String(acao), mode: 'insensitive' };

    const skip = (Number(page) - 1) * Number(limit);
    const [total, registros] = await Promise.all([
      prisma.auditoriaEstoque.count({ where }),
      prisma.auditoriaEstoque.findMany({
        where,
        include: {
          loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
          usuario: { select: { id: true, nome: true } },
          produto: { select: { id: true, nome: true, tipo: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    res.json({ data: registros, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e: any) {
    console.error('GET /auditoria/estoque', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
