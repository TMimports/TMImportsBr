import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminGeral, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });

    res.json(servicos);
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const servico = await prisma.servico.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json(servico);
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, preco, duracao } = req.body;

    if (!nome || !preco) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        preco: Number(preco),
        duracao: duracao ? Number(duracao) : null,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(servico);
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, preco, duracao, ativo } = req.body;

    const servico = await prisma.servico.update({
      where: { id: Number(req.params.id) },
      data: {
        nome,
        preco: preco ? Number(preco) : undefined,
        duracao: duracao !== undefined ? (duracao ? Number(duracao) : null) : undefined,
        ativo
      }
    });

    res.json(servico);
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireAdminGeral, async (req, res) => {
  try {
    await prisma.servico.update({
      where: { id: Number(req.params.id) },
      data: { ativo: false }
    });

    res.json({ message: 'Serviço desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar serviço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
