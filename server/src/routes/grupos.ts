import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminRede, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(requireAdminRede);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const grupos = await prisma.grupo.findMany({
      include: { lojas: true, _count: { select: { usuarios: true } } },
      orderBy: { nome: 'asc' }
    });
    res.json(grupos);
  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const grupo = await prisma.grupo.findUnique({
      where: { id: Number(req.params.id) },
      include: { lojas: true, usuarios: true }
    });

    if (!grupo) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    res.json(grupo);
  } catch (error) {
    console.error('Erro ao buscar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const grupo = await prisma.grupo.create({
      data: { nome }
    });

    res.status(201).json(grupo);
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, ativo } = req.body;

    const grupo = await prisma.grupo.update({
      where: { id: Number(req.params.id) },
      data: { nome, ativo }
    });

    res.json(grupo);
  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.grupo.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: 'Grupo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
