import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const { status, produtoId } = req.query;

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };
    if (status) where.status = status;
    if (produtoId) where.produtoId = Number(produtoId);

    const unidades = await prisma.unidadeFisica.findMany({
      where,
      include: { produto: true, loja: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(unidades);
  } catch (error) {
    console.error('Erro ao listar unidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const unidade = await prisma.unidadeFisica.findUnique({
      where: { id: Number(req.params.id) },
      include: { produto: true, loja: true, garantias: true, revisoes: true }
    });

    if (!unidade) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    res.json(unidade);
  } catch (error) {
    console.error('Erro ao buscar unidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { produtoId, cor, chassi, codigoMotor, ano, numeroSerie, lojaId } = req.body;

    if (!produtoId || !lojaId) {
      return res.status(400).json({ error: 'Produto e loja são obrigatórios' });
    }

    const unidade = await prisma.unidadeFisica.create({
      data: {
        produtoId: Number(produtoId),
        cor,
        chassi,
        codigoMotor,
        ano: ano ? Number(ano) : null,
        numeroSerie,
        lojaId: Number(lojaId),
        createdBy: req.user!.id
      },
      include: { produto: true, loja: true }
    });

    res.status(201).json(unidade);
  } catch (error) {
    console.error('Erro ao criar unidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { cor, chassi, codigoMotor, ano, numeroSerie, status } = req.body;

    const unidade = await prisma.unidadeFisica.update({
      where: { id: Number(req.params.id) },
      data: { cor, chassi, codigoMotor, ano, numeroSerie, status },
      include: { produto: true, loja: true }
    });

    res.json(unidade);
  } catch (error) {
    console.error('Erro ao atualizar unidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
