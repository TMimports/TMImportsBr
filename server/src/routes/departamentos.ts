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

    const departamentos = await prisma.departamento.findMany({
      where,
      orderBy: { nome: 'asc' }
    });
    res.json(departamentos);
  } catch (error) {
    console.error('Erro ao listar departamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const dep = await prisma.departamento.findUnique({ where: { id: Number(req.params.id) } });
    if (!dep) return res.status(404).json({ error: 'Departamento não encontrado' });
    res.json(dep);
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
    const dep = await prisma.departamento.create({
      data: { nome, natureza, descricao: descricao || null }
    });
    res.status(201).json(dep);
  } catch (error) {
    console.error('Erro ao criar departamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const { nome, natureza, descricao, ativo } = req.body;
    const existe = await prisma.departamento.findUnique({ where: { id: Number(req.params.id) } });
    if (!existe) return res.status(404).json({ error: 'Departamento não encontrado' });

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

    const dep = await prisma.departamento.update({ where: { id: Number(req.params.id) }, data });
    res.json(dep);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [cp, cr] = await Promise.all([
      prisma.contaPagar.count({ where: { departamentoId: id } }),
      prisma.contaReceber.count({ where: { departamentoId: id } })
    ]);
    if (cp + cr > 0) {
      return res.status(400).json({ error: `Departamento em uso (${cp + cr} lançamentos). Desative em vez de excluir.` });
    }
    await prisma.departamento.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
