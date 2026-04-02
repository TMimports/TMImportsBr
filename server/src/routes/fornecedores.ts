import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    else if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    if (req.query.busca) {
      const busca = req.query.busca as string;
      where.OR = [
        { razaoSocial: { contains: busca, mode: 'insensitive' } },
        { nomeFantasia: { contains: busca, mode: 'insensitive' } },
        { cnpj: { contains: busca } },
      ];
    }
    if (req.query.classe) where.classe = req.query.classe;
    if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

    const fornecedores = await prisma.fornecedor.findMany({
      where,
      include: {
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
        _count: { select: { interacoes: true, contasPagar: true } },
      },
      orderBy: { razaoSocial: 'asc' },
    });
    res.json(fornecedores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
        interacoes: {
          include: { usuario: { select: { id: true, nome: true } } },
          orderBy: { createdAt: 'desc' },
        },
        contasPagar: {
          where: { deletedAt: null },
          orderBy: { vencimento: 'desc' },
          take: 10,
        },
      },
    });
    if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(fornecedor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { lojaId, ...body } = req.body;
    const filter = applyTenantFilter(req);
    const resolvedLojaId = lojaId || filter.lojaId;
    if (!resolvedLojaId) return res.status(400).json({ error: 'lojaId obrigatório' });
    if (!body.razaoSocial) return res.status(400).json({ error: 'Razão Social obrigatória' });

    const fornecedor = await prisma.fornecedor.create({
      data: { ...body, lojaId: resolvedLojaId, createdBy: req.user!.id },
    });
    res.status(201).json(fornecedor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { lojaId, createdBy, createdAt, updatedAt, id: _id, ...body } = req.body;
    const fornecedor = await prisma.fornecedor.update({ where: { id }, data: body });
    res.json(fornecedor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.fornecedor.update({ where: { id }, data: { ativo: false } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
