import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (req.user?.role === 'VENDEDOR') {
      where.usuarioId = req.user.id;
    }

    const comissoes = await prisma.comissao.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true } },
        venda: true,
        ordemServico: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comissoes);
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/resumo', async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user?.role === 'VENDEDOR') {
      where.usuarioId = req.user.id;
    }

    const comissoes = await prisma.comissao.groupBy({
      by: ['usuarioId', 'pago'],
      where,
      _sum: { valor: true }
    });

    res.json(comissoes);
  } catch (error) {
    console.error('Erro ao listar resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/pagar', async (req: AuthRequest, res) => {
  try {
    const comissao = await prisma.comissao.update({
      where: { id: Number(req.params.id) },
      data: { pago: true, dataPago: new Date() }
    });

    res.json(comissao);
  } catch (error) {
    console.error('Erro ao pagar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
