import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminGeral, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

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

// Criação: apenas nome, tipo e descrição obrigatórios.
// Custo e preço são sempre definidos via Pedido de Compra (custo médio ponderado).
router.post('/', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, tipo, descricao } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const tiposValidos = ['MOTO', 'PECA', 'SERVICO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use MOTO, PECA ou SERVICO' });
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        tipo,
        descricao: descricao || null,
        custo: 0,
        percentualLucro: 0,
        preco: 0,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Edição: permite alterar nome, tipo, descrição e ativo.
// Custo/preço só são atualizados internamente via confirmação de PedidoCompra.
router.put('/:id', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, tipo, descricao, ativo, custo, percentualLucro, preco } = req.body;

    const data: any = {};
    if (nome !== undefined)           data.nome = nome;
    if (tipo !== undefined)           data.tipo = tipo;
    if (descricao !== undefined)      data.descricao = descricao;
    if (ativo !== undefined)          data.ativo = ativo;
    // Custo/preço podem ser atualizados pelo sistema (PedidoCompra), nunca pelo formulário manual
    if (custo !== undefined)          data.custo = Number(custo);
    if (percentualLucro !== undefined) data.percentualLucro = Number(percentualLucro);
    if (preco !== undefined)          data.preco = Number(preco);

    const produto = await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data
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
