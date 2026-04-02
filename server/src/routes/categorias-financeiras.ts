import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { natureza, ativo } = req.query;
    const where: any = {};
    if (natureza) where.natureza = natureza;
    if (ativo !== undefined) where.ativo = ativo === 'true';

    const categorias = await prisma.categoriaFinanceira.findMany({
      where,
      orderBy: [{ natureza: 'asc' }, { nome: 'asc' }]
    });
    res.json(categorias);
  } catch (error) {
    console.error('Erro ao listar categorias financeiras:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const categoria = await prisma.categoriaFinanceira.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const { nome, natureza, descricao } = req.body;
    if (!nome || !natureza) {
      return res.status(400).json({ error: 'Nome e natureza são obrigatórios' });
    }
    if (!['RECEITA', 'DESPESA', 'AMBOS'].includes(natureza)) {
      return res.status(400).json({ error: 'Natureza inválida. Use: RECEITA, DESPESA ou AMBOS' });
    }
    const categoria = await prisma.categoriaFinanceira.create({
      data: { nome, natureza, descricao: descricao || null }
    });
    res.status(201).json(categoria);
  } catch (error) {
    console.error('Erro ao criar categoria financeira:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const { nome, natureza, descricao, ativo } = req.body;
    const existe = await prisma.categoriaFinanceira.findUnique({ where: { id: Number(req.params.id) } });
    if (!existe) return res.status(404).json({ error: 'Categoria não encontrada' });

    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (natureza !== undefined) {
      if (!['RECEITA', 'DESPESA', 'AMBOS'].includes(natureza)) {
        return res.status(400).json({ error: 'Natureza inválida' });
      }
      data.natureza = natureza;
    }
    if (descricao !== undefined) data.descricao = descricao || null;
    if (ativo !== undefined) data.ativo = Boolean(ativo);

    const categoria = await prisma.categoriaFinanceira.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [cp, cr] = await Promise.all([
      prisma.contaPagar.count({ where: { categoriaId: id } }),
      prisma.contaReceber.count({ where: { categoriaId: id } })
    ]);
    if (cp + cr > 0) {
      return res.status(400).json({ error: `Categoria em uso (${cp + cr} lançamentos). Desative em vez de excluir.` });
    }
    await prisma.categoriaFinanceira.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
