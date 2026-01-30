import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest, requireRole } from '../middleware/auth.js';
import { InventoryService } from '../services/InventoryService.js';

const router = Router();

router.use(verifyToken);

router.get('/grupo', async (req: AuthRequest, res) => {
  try {
    let grupoId = req.user?.grupoId;
    
    if (!grupoId && req.user?.lojaId) {
      const loja = await prisma.loja.findUnique({ where: { id: req.user.lojaId } });
      grupoId = loja?.grupoId;
    }
    
    if (!grupoId) {
      return res.status(400).json({ error: 'Usuário não pertence a um grupo' });
    }

    const estoqueGrupo = await InventoryService.getEstoqueGrupo(grupoId);
    res.json(estoqueGrupo);
  } catch (error) {
    console.error('Erro ao buscar estoque do grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/logs', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const logs = await prisma.logEstoque.findMany({
      where,
      include: { 
        produto: { select: { nome: true } },
        loja: { select: { nomeFantasia: true } },
        usuario: { select: { nome: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs de estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const estoques = await prisma.estoque.findMany({
      where,
      include: { produto: true, loja: true },
      orderBy: { produto: { nome: 'asc' } }
    });

    res.json(estoques);
  } catch (error) {
    console.error('Erro ao listar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/alertas', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const estoques = await prisma.estoque.findMany({
      where,
      include: { produto: true, loja: true }
    });

    const alertas = estoques.filter(e => e.quantidade <= e.estoqueMinimo);

    res.json(alertas);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const { produtoId, lojaId, quantidade, estoqueMinimo, estoqueMaximo } = req.body;

    if (!produtoId || !lojaId) {
      return res.status(400).json({ error: 'Produto e loja são obrigatórios' });
    }

    const estoque = await prisma.estoque.upsert({
      where: {
        produtoId_lojaId: {
          produtoId: Number(produtoId),
          lojaId: Number(lojaId)
        }
      },
      update: {
        quantidade: Number(quantidade || 0),
        estoqueMinimo: Number(estoqueMinimo || 0),
        estoqueMaximo: Number(estoqueMaximo || 0)
      },
      create: {
        produtoId: Number(produtoId),
        lojaId: Number(lojaId),
        quantidade: Number(quantidade || 0),
        estoqueMinimo: Number(estoqueMinimo || 0),
        estoqueMaximo: Number(estoqueMaximo || 0)
      },
      include: { produto: true, loja: true }
    });

    res.json(estoque);
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const { quantidade, estoqueMinimo, estoqueMaximo } = req.body;

    const estoque = await prisma.estoque.update({
      where: { id: Number(req.params.id) },
      data: {
        quantidade: quantidade !== undefined ? Number(quantidade) : undefined,
        estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo) : undefined,
        estoqueMaximo: estoqueMaximo !== undefined ? Number(estoqueMaximo) : undefined
      },
      include: { produto: true, loja: true }
    });

    res.json(estoque);
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
