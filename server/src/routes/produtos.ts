import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminGeral, AuthRequest } from '../middleware/auth.js';
import { TipoProduto } from '@prisma/client';

const router = Router();

router.use(verifyToken);

async function getMargens() {
  const config = await prisma.configuracao.findFirst();
  return {
    lucroMoto: Number(config?.lucroMoto ?? 30),
    lucroPeca: Number(config?.lucroPeca ?? 60)
  };
}

function calcularPrecoComMargem(custo: number, margemPercent: number): number {
  return custo / (1 - margemPercent / 100);
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });

    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: Number(req.params.id) },
      include: { estoques: { include: { loja: true } } }
    });

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, tipo, custo, percentualLucro, preco } = req.body;

    if (!nome || !tipo || !custo) {
      return res.status(400).json({ error: 'Nome, tipo e custo são obrigatórios' });
    }

    const margens = await getMargens();
    const margemTipo = tipo === 'MOTO' ? margens.lucroMoto : margens.lucroPeca;
    const lucro = percentualLucro ?? margemTipo;
    const precoCalculado = preco ?? calcularPrecoComMargem(Number(custo), margemTipo);

    const produto = await prisma.produto.create({
      data: {
        nome,
        tipo,
        custo: Number(custo),
        percentualLucro: lucro,
        preco: precoCalculado,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, tipo, custo, percentualLucro, preco, ativo } = req.body;

    const produto = await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data: {
        nome,
        tipo,
        custo: custo ? Number(custo) : undefined,
        percentualLucro: percentualLucro ? Number(percentualLucro) : undefined,
        preco: preco ? Number(preco) : undefined,
        ativo
      }
    });

    res.json(produto);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireAdminGeral, async (req, res) => {
  try {
    await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data: { ativo: false }
    });

    res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
