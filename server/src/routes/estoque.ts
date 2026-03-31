import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest, requireRole } from '../middleware/auth.js';
import { InventoryService } from '../services/InventoryService.js';

const router = Router();

router.use(verifyToken);

router.get('/grupo', async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'ADMIN_GERAL') {
      const estoqueGeral = await InventoryService.getEstoqueTodas();
      return res.json(estoqueGeral);
    }

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

// Novo endpoint: resumo hierarquico por grupo
router.get('/grupo-resumo', async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    let gruposWhere: any = {};

    if (role !== 'ADMIN_GERAL') {
      let grupoId = req.user?.grupoId;
      if (!grupoId && req.user?.lojaId) {
        const loja = await prisma.loja.findUnique({ where: { id: req.user.lojaId } });
        grupoId = loja?.grupoId ?? undefined;
      }
      if (!grupoId) return res.status(400).json({ error: 'Usuário não pertence a um grupo' });
      gruposWhere = { id: grupoId };
    }

    const grupos = await prisma.grupo.findMany({
      where: gruposWhere,
      include: {
        lojas: {
          where: { ativo: true },
          include: {
            estoques: {
              include: { produto: { select: { tipo: true, preco: true } } }
            }
          }
        }
      },
      orderBy: { nome: 'asc' }
    });

    // Buscar ultima movimentacao por loja
    const allLojaIds = grupos.flatMap(g => g.lojas.map(l => l.id));
    const ultimosLogs = await prisma.logEstoque.findMany({
      where: { lojaId: { in: allLojaIds } },
      select: { lojaId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      distinct: ['lojaId']
    });
    const ultimaMovMap = new Map(ultimosLogs.map(l => [l.lojaId, l.createdAt]));

    const resultado = grupos.map(grupo => {
      const lojas = grupo.lojas.map(loja => {
        const totalMotos = loja.estoques
          .filter(e => e.produto.tipo === 'MOTO')
          .reduce((s, e) => s + e.quantidade, 0);
        const totalPecas = loja.estoques
          .filter(e => e.produto.tipo === 'PECA')
          .reduce((s, e) => s + e.quantidade, 0);
        const totalAlertas = loja.estoques.filter(e => e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0).length;
        const semEstoque = loja.estoques.filter(e => e.quantidade === 0).length;
        const valorEstimado = loja.estoques.reduce(
          (s, e) => s + (e.quantidade * Number(e.produto.preco)),
          0
        );

        return {
          id: loja.id,
          nomeFantasia: loja.nomeFantasia || loja.razaoSocial,
          razaoSocial: loja.razaoSocial,
          endereco: loja.endereco,
          telefone: loja.telefone,
          email: loja.email,
          ativo: loja.ativo,
          createdAt: loja.createdAt,
          totalMotos,
          totalPecas,
          totalAlertas,
          semEstoque,
          valorEstimado,
          ultimaMovimentacao: ultimaMovMap.get(loja.id) || null
        };
      });

      const totalLojas = lojas.length;
      const totalMotos = lojas.reduce((s, l) => s + l.totalMotos, 0);
      const totalPecas = lojas.reduce((s, l) => s + l.totalPecas, 0);
      const totalAlertas = lojas.reduce((s, l) => s + l.totalAlertas, 0);

      return {
        id: grupo.id,
        nome: grupo.nome,
        totalLojas,
        totalMotos,
        totalPecas,
        totalAlertas,
        lojas
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao buscar resumo de grupos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Novo endpoint: detalhes completos de uma loja
router.get('/loja/:lojaId/detalhes', async (req: AuthRequest, res) => {
  try {
    const lojaId = Number(req.params.lojaId);
    if (isNaN(lojaId)) return res.status(400).json({ error: 'ID inválido' });

    // Validar acesso multi-tenant
    const role = req.user?.role;
    if (role !== 'ADMIN_GERAL') {
      if (req.user?.lojaId && req.user.lojaId !== lojaId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      if (req.user?.grupoId) {
        const loja = await prisma.loja.findFirst({ where: { id: lojaId, grupoId: req.user.grupoId } });
        if (!loja) return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    const [loja, itensEstoque, vendas, os, logs] = await Promise.all([
      prisma.loja.findUnique({
        where: { id: lojaId },
        include: {
          grupo: { select: { id: true, nome: true } },
          usuarios: { where: { role: 'DONO_LOJA' }, select: { nome: true, email: true } }
        }
      }),
      prisma.estoque.findMany({
        where: { lojaId },
        include: { produto: { select: { id: true, nome: true, tipo: true, preco: true, codigo: true } } },
        orderBy: { produto: { nome: 'asc' } }
      }),
      prisma.venda.findMany({
        where: { lojaId, deletedAt: null },
        include: {
          cliente: { select: { nome: true } },
          vendedor: { select: { nome: true } },
          itens: {
            include: { produto: { select: { nome: true, tipo: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.ordemServico.findMany({
        where: { lojaId },
        include: {
          cliente: { select: { nome: true } },
          itens: {
            include: { produto: { select: { nome: true } }, servico: { select: { nome: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.logEstoque.findMany({
        where: { lojaId },
        include: {
          produto: { select: { nome: true, tipo: true } },
          usuario: { select: { nome: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const totalMotos = itensEstoque
      .filter(e => e.produto.tipo === 'MOTO')
      .reduce((s, e) => s + e.quantidade, 0);
    const totalPecas = itensEstoque
      .filter(e => e.produto.tipo === 'PECA')
      .reduce((s, e) => s + e.quantidade, 0);
    const totalAlertas = itensEstoque.filter(e => e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0).length;
    const semEstoque = itensEstoque.filter(e => e.quantidade === 0).length;
    const valorEstimado = itensEstoque.reduce((s, e) => s + (e.quantidade * Number(e.produto.preco)), 0);
    const ultimaMovimentacao = logs[0]?.createdAt || null;

    res.json({
      loja,
      resumo: { totalMotos, totalPecas, totalAlertas, semEstoque, valorEstimado, ultimaMovimentacao },
      itens: itensEstoque,
      vendas,
      os,
      logs,
      alertas: itensEstoque.filter(e => e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0)
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da loja:', error);
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
      include: { produto: true, loja: { include: { grupo: true } } },
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
