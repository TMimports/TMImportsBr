import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest, requireRole, requireAdminGeral } from '../middleware/auth.js';
import { InventoryService } from '../services/InventoryService.js';
import { gerarNumeroSerieUnidade } from './importacao.js';

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

router.put('/:id', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const { quantidade, estoqueMinimo, estoqueMaximo, custoMedio, precoVenda } = req.body;

    const estoque = await prisma.estoque.update({
      where: { id: Number(req.params.id) },
      data: {
        quantidade: quantidade !== undefined ? Number(quantidade) : undefined,
        estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo) : undefined,
        estoqueMaximo: estoqueMaximo !== undefined ? Number(estoqueMaximo) : undefined,
        custoMedio: custoMedio !== undefined ? Number(custoMedio) : undefined,
        precoVenda: precoVenda !== undefined ? (precoVenda === null ? null : Number(precoVenda)) : undefined,
      },
      include: { produto: true, loja: true }
    });

    res.json(estoque);
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── EXCLUSÃO DEFINITIVA (somente ADMIN_GERAL) ───────────────────────────────
router.delete('/produto/:produtoId/loja/:lojaId/definitivo', requireAdminGeral, async (req: AuthRequest, res) => {
  const produtoId = Number(req.params.produtoId);
  const lojaId    = Number(req.params.lojaId);
  if (isNaN(produtoId) || isNaN(lojaId))
    return res.status(400).json({ error: 'IDs inválidos' });

  try {
    const [produto, estoqueRec, unidades] = await Promise.all([
      prisma.produto.findUnique({ where: { id: produtoId } }),
      prisma.estoque.findUnique({ where: { produtoId_lojaId: { produtoId, lojaId } } }),
      prisma.unidadeFisica.findMany({
        where: { produtoId, lojaId },
        include: {
          itensVenda:     { select: { id: true } },
          transferencias: { select: { id: true, status: true } },
        },
      }),
    ]);

    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });

    // Bloquear se qualquer unidade está vendida
    const vendidas = unidades.filter(u => u.status === 'VENDIDA' || u.itensVenda.length > 0);
    if (vendidas.length > 0)
      return res.status(400).json({
        error: `${vendidas.length} unidade(s) já vendida(s) — não é possível excluir`,
      });

    // Bloquear se há venda direta de peça no produto
    const vendaPeca = await prisma.itemVenda.count({ where: { produtoId } });
    if (vendaPeca > 0)
      return res.status(400).json({
        error: `"${produto.nome}" tem ${vendaPeca} venda(s) de peça — não é possível excluir`,
      });

    // Bloquear se há transferência ativa
    const temTransfAtiva = unidades.some(u =>
      u.transferencias.some(t => ['SOLICITADA', 'APROVADA'].includes(t.status))
    );
    if (temTransfAtiva)
      return res.status(400).json({ error: 'Há transferência ativa para este produto — cancele antes' });

    let deletedUnits = 0;
    let deletedStock = false;
    let deletedProduct = false;

    await prisma.$transaction(async (tx) => {
      // 1. Excluir UnidadeFisica da loja
      for (const u of unidades) {
        await tx.unidadeFisica.delete({ where: { id: u.id } });
        deletedUnits++;
      }

      // 2. Excluir registro de Estoque da loja
      if (estoqueRec) {
        await tx.estoque.delete({ where: { id: estoqueRec.id } });
        deletedStock = true;
      }

      // 3. Log de auditoria
      await tx.logAuditoria.create({
        data: {
          usuarioId: req.user!.id,
          acao: 'EXCLUSAO_DEFINITIVA',
          entidade: 'Produto',
          entidadeId: produtoId,
          dados: JSON.stringify({ produtoNome: produto.nome, lojaId, deletedUnits, deletedStock }),
        },
      });

      // 4. Verificar se produto ainda existe em outras lojas
      const outrosEstoques  = await tx.estoque.count({ where: { produtoId } });
      const outrasUnidades  = await tx.unidadeFisica.count({ where: { produtoId } });
      const outrasVendas    = await tx.itemVenda.count({ where: { produtoId } });

      if (outrosEstoques === 0 && outrasUnidades === 0 && outrasVendas === 0) {
        await tx.produto.delete({ where: { id: produtoId } });
        deletedProduct = true;
      }
    });

    res.json({
      ok: true,
      message: `"${produto.nome}" removido${deletedProduct ? ' e produto excluído do catálogo' : ' desta loja'}. ${deletedUnits} unidade(s) deletada(s).`,
      deletedUnits,
      deletedStock,
      deletedProduct,
    });
  } catch (error) {
    console.error('Erro na exclusão definitiva:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── REMOVER PRODUTO DO ESTOQUE DE UMA LOJA ──────────────────────────────────
router.delete('/:id(\\d+)', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  try {
    const estoqueRec = await prisma.estoque.findUnique({
      where: { id },
      include: { produto: { select: { id: true, nome: true } } },
    });
    if (!estoqueRec) return res.status(404).json({ error: 'Registro de estoque não encontrado' });

    // Controle de acesso por loja
    const filter = applyTenantFilter(req);
    if (filter.lojaId && filter.lojaId !== estoqueRec.lojaId)
      return res.status(403).json({ error: 'Acesso negado a este registro de estoque' });

    const { produtoId, lojaId } = estoqueRec;

    // Bloquear se há vendas vinculadas ao produto
    const vendasVinculadas = await prisma.itemVenda.count({ where: { produtoId } });
    if (vendasVinculadas > 0)
      return res.status(400).json({ error: `"${estoqueRec.produto.nome}" tem ${vendasVinculadas} venda(s) — não pode ser excluído` });

    // Bloquear se há transferências ativas
    const transferAtiva = await prisma.transferencia.count({
      where: {
        produtoId,
        OR: [{ lojaOrigemId: lojaId }, { lojaDestinoId: lojaId }],
        status: { in: ['SOLICITADA', 'APROVADA'] },
      },
    });
    if (transferAtiva > 0)
      return res.status(400).json({ error: `"${estoqueRec.produto.nome}" tem transferência ativa — cancele antes de excluir` });

    // Verificar unidades físicas da loja
    const unidades = await prisma.unidadeFisica.findMany({
      where: { produtoId, lojaId },
      include: {
        itensVenda:     { select: { id: true } },
        transferencias: { select: { id: true, status: true } },
        ordensServico:  { select: { id: true, status: true } },
      },
    });

    const bloqueadas = unidades.filter(u =>
      u.status === 'VENDIDA' ||
      u.itensVenda.length > 0 ||
      u.transferencias.some(t => ['SOLICITADA', 'APROVADA'].includes(t.status)) ||
      u.ordensServico.some(os => os.status !== 'EXECUTADA')
    );
    if (bloqueadas.length > 0)
      return res.status(400).json({ error: `${bloqueadas.length} unidade(s) vinculada(s) a venda/transferência/OS — não é possível excluir` });

    let deletedUnits = 0;
    let deletedProduct = false;

    await prisma.$transaction(async (tx) => {
      // Excluir unidades físicas e criar log para cada uma
      for (const u of unidades) {
        await tx.unidadeFisica.delete({ where: { id: u.id } });
        await tx.logEstoque.create({
          data: {
            tipo: 'SAIDA',
            origem: 'EXCLUSAO_MANUAL',
            origemId: u.id,
            produtoId,
            lojaId,
            quantidade: 1,
            quantidadeAnterior: estoqueRec.quantidade - deletedUnits,
            quantidadeNova: Math.max(0, estoqueRec.quantidade - deletedUnits - 1),
            usuarioId: req.user!.id,
          },
        });
        deletedUnits++;
      }

      // Excluir o registro de Estoque
      await tx.estoque.delete({ where: { id } });

      await tx.logAuditoria.create({
        data: {
          usuarioId: req.user!.id,
          acao: 'EXCLUSAO_ESTOQUE',
          entidade: 'Estoque',
          entidadeId: id,
          dados: JSON.stringify({ produtoId, lojaId, deletedUnits }),
        },
      });

      // Se produto não tem mais nenhum vínculo, arquivar (soft delete)
      const remainingEstoque  = await tx.estoque.count({ where: { produtoId } });
      const remainingUnidades = await tx.unidadeFisica.count({ where: { produtoId } });
      const remainingVendas   = await tx.itemVenda.count({ where: { produtoId } });

      if (remainingEstoque === 0 && remainingUnidades === 0 && remainingVendas === 0) {
        await tx.produto.update({ where: { id: produtoId }, data: { ativo: false } });
        await tx.logAuditoria.create({
          data: {
            usuarioId: req.user!.id,
            acao: 'ARQUIVAR_PRODUTO',
            entidade: 'Produto',
            entidadeId: produtoId,
            dados: JSON.stringify({ nome: estoqueRec.produto.nome }),
          },
        });
        deletedProduct = true;
      }
    });

    res.json({
      ok: true,
      message: `${estoqueRec.produto.nome} removido${deletedProduct ? ' e arquivado' : ''}. ${deletedUnits} unidade(s) excluída(s).`,
      deletedUnits,
      deletedProduct,
    });
  } catch (error) {
    console.error('Erro ao remover estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── VISÃO GERENCIAL POR EMPRESA / CNPJ ──────────────────────────────────────
router.get('/empresa/:lojaId', async (req: AuthRequest, res) => {
  try {
    const lojaId = Number(req.params.lojaId);
    if (isNaN(lojaId)) return res.status(400).json({ error: 'ID inválido' });

    const role = req.user!.role;

    // Qualquer usuário autenticado pode consultar estoque de qualquer loja (para busca e solicitação de transferência)
    // Restrições de escrita são controladas nas rotas de criação/edição

    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      include: { grupo: { select: { id: true, nome: true } } }
    });
    if (!loja) return res.status(404).json({ error: 'Empresa não encontrada' });

    const [estoques, unidades, pedidosPendentes, logsRecentes] = await Promise.all([
      prisma.estoque.findMany({
        where: { lojaId },
        include: {
          produto: { select: { id: true, nome: true, tipo: true, preco: true, custo: true, codigo: true } }
        },
        orderBy: { produto: { nome: 'asc' } }
      }),
      prisma.unidadeFisica.findMany({
        where: { lojaId },
        include: { produto: { select: { id: true, nome: true, tipo: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pedidoCompra.count({ where: { lojaId, status: { in: ['PENDENTE', 'APROVADO'] } } }),
      prisma.logEstoque.findMany({
        where: { lojaId },
        include: {
          produto: { select: { nome: true, tipo: true } },
          usuario: { select: { nome: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
    ]);

    // Totalizadores gerenciais
    const motosEstoque  = estoques.filter(e => e.produto.tipo === 'MOTO');
    const pecasEstoque  = estoques.filter(e => e.produto.tipo === 'PECA');
    const totalMotos    = motosEstoque.reduce((s, e) => s + e.quantidade, 0);
    const totalPecas    = pecasEstoque.reduce((s, e) => s + e.quantidade, 0);
    const valorTotalCM  = estoques.reduce((s, e) => {
      const cm = (e.custoMedio !== null && Number(e.custoMedio) > 0) ? Number(e.custoMedio) : Number(e.produto.custo);
      return s + cm * e.quantidade;
    }, 0);
    const valorTotalPreco = estoques.reduce((s, e) => {
      const pv = (e.precoVenda !== null && Number(e.precoVenda) > 0) ? Number(e.precoVenda) : Number(e.produto.preco);
      return s + pv * e.quantidade;
    }, 0);
    const alertasBaixo  = estoques.filter(e => e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0).length;
    const semGiro       = estoques.filter(e => e.quantidade === 0).length;

    // Visão gerencial por modelo (produto)
    const gerencial = estoques.map(e => ({
      id: e.id,
      produtoId: e.produtoId,
      nome: e.produto.nome,
      tipo: e.produto.tipo,
      codigo: e.produto.codigo,
      quantidade: e.quantidade,
      estoqueMinimo: e.estoqueMinimo,
      estoqueMaximo: e.estoqueMaximo,
      custoMedio: (e.custoMedio !== null && Number(e.custoMedio) > 0) ? Number(e.custoMedio) : Number(e.produto.custo),
      precoVenda: (e.precoVenda !== null && Number(e.precoVenda) > 0) ? Number(e.precoVenda) : Number(e.produto.preco),
      precoVendaLoja: (e.precoVenda !== null && Number(e.precoVenda) > 0) ? Number(e.precoVenda) : null,
      precoVendaBase: Number(e.produto.preco),
      valorTotalCusto: ((e.custoMedio !== null && Number(e.custoMedio) > 0) ? Number(e.custoMedio) : Number(e.produto.custo)) * e.quantidade,
      valorTotalPreco: ((e.precoVenda !== null && Number(e.precoVenda) > 0) ? Number(e.precoVenda) : Number(e.produto.preco)) * e.quantidade,
      alerta: e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0,
      semEstoque: e.quantidade === 0,
    }));

    // Visão unitária (chassi)
    const unitaria = unidades.map(u => ({
      id: u.id,
      produtoId: u.produtoId,
      modeloNome: u.produto.nome,
      chassi: u.chassi,
      codigoMotor: u.codigoMotor,
      cor: u.cor,
      ano: u.ano,
      status: u.status,
      createdAt: u.createdAt,
    }));

    res.json({
      empresa: {
        id: loja.id,
        cnpj: loja.cnpj,
        razaoSocial: loja.razaoSocial,
        nomeFantasia: loja.nomeFantasia,
        grupoNome: loja.grupo.nome,
      },
      totalizadores: {
        totalMotos,
        totalPecas,
        totalItens: totalMotos + totalPecas,
        valorTotalCusto: valorTotalCM,
        valorTotalVenda: valorTotalPreco,
        alertasBaixoEstoque: alertasBaixo,
        semGiro,
        pedidosPendentes,
        unidadesTotal: unidades.length,
        unidadesEmEstoque: unidades.filter(u => u.status === 'ESTOQUE').length,
        unidadesVendidas: unidades.filter(u => u.status === 'VENDIDA').length,
      },
      gerencial,
      unitaria,
      logsRecentes,
    });
  } catch (error) {
    console.error('Erro ao buscar estoque empresa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── BUSCA CROSS-REDE ─────────────────────────────────────────────────────────
// Qualquer usuário autenticado pode buscar produto em todas as lojas da rede
router.get('/buscar-rede', async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.json([]);

    const estoques = await prisma.estoque.findMany({
      where: {
        quantidade: { gt: 0 },
        loja: { ativo: true },
        produto: {
          OR: [
            { nome: { contains: q, mode: 'insensitive' } },
            { codigo: { contains: q, mode: 'insensitive' } },
          ]
        }
      },
      include: {
        produto: { select: { id: true, nome: true, tipo: true, codigo: true, preco: true } },
        loja: { select: { id: true, nomeFantasia: true, endereco: true } }
      },
      orderBy: { produto: { nome: 'asc' } }
    });

    // Agrupa por produto
    const byProduct = new Map<number, { produto: any; lojas: any[] }>();
    for (const e of estoques) {
      if (!byProduct.has(e.produtoId)) {
        byProduct.set(e.produtoId, { produto: e.produto, lojas: [] });
      }
      byProduct.get(e.produtoId)!.lojas.push({
        lojaId: e.lojaId,
        nomeFantasia: e.loja.nomeFantasia,
        endereco: e.loja.endereco,
        quantidade: e.quantidade,
      });
    }

    res.json(Array.from(byProduct.values()));
  } catch (error) {
    console.error('Erro na busca cross-rede:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── VISÃO CONSOLIDADA (todos os CNPJs) ───────────────────────────────────────
router.get('/consolidado', requireRole('ADMIN_GERAL', 'ADMIN_FINANCEIRO'), async (req: AuthRequest, res) => {
  try {
    const lojas = await prisma.loja.findMany({
      where: { ativo: true },
      include: {
        grupo: { select: { id: true, nome: true } },
        estoques: {
          include: { produto: { select: { tipo: true, preco: true, custo: true } } }
        },
        _count: { select: { unidades: true, pedidosCompra: { where: { status: { in: ['PENDENTE', 'APROVADO'] } } } } }
      },
      orderBy: { razaoSocial: 'asc' }
    });

    const resultado = lojas.map(loja => {
      const totalMotos  = loja.estoques.filter(e => e.produto.tipo === 'MOTO').reduce((s, e) => s + e.quantidade, 0);
      const totalPecas  = loja.estoques.filter(e => e.produto.tipo === 'PECA').reduce((s, e) => s + e.quantidade, 0);
      const valorCusto  = loja.estoques.reduce((s, e) => {
        const cm = (e.custoMedio !== null && Number(e.custoMedio) > 0) ? Number(e.custoMedio) : Number(e.produto.custo);
        return s + cm * e.quantidade;
      }, 0);
      const valorPreco  = loja.estoques.reduce((s, e) => {
        const pv = (e.precoVenda !== null && Number(e.precoVenda) > 0) ? Number(e.precoVenda) : Number(e.produto.preco);
        return s + pv * e.quantidade;
      }, 0);
      const alertas     = loja.estoques.filter(e => e.quantidade <= e.estoqueMinimo && e.estoqueMinimo > 0).length;

      return {
        lojaId: loja.id,
        cnpj: loja.cnpj,
        razaoSocial: loja.razaoSocial,
        nomeFantasia: loja.nomeFantasia,
        grupoId: loja.grupoId,
        grupoNome: loja.grupo.nome,
        totalMotos,
        totalPecas,
        totalItens: totalMotos + totalPecas,
        valorTotalCusto: valorCusto,
        valorTotalVenda: valorPreco,
        alertas,
        unidades: loja._count.unidades,
        pedidosPendentes: loja._count.pedidosCompra,
      };
    });

    const totais = {
      totalEmpresas: resultado.length,
      totalMotos: resultado.reduce((s, l) => s + l.totalMotos, 0),
      totalPecas: resultado.reduce((s, l) => s + l.totalPecas, 0),
      valorTotalCusto: resultado.reduce((s, l) => s + l.valorTotalCusto, 0),
      valorTotalVenda: resultado.reduce((s, l) => s + l.valorTotalVenda, 0),
      totalAlertas: resultado.reduce((s, l) => s + l.alertas, 0),
    };

    res.json({ totais, empresas: resultado });
  } catch (error) {
    console.error('Erro ao buscar estoque consolidado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── EXCLUSÃO EM LOTE DE CHASSI ──────────────────────────────────────────────
router.post('/chassi/excluir-lote', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: 'Lista de IDs obrigatória' });

  let excluidos = 0, bloqueados = 0;
  const detalhes: string[] = [];

  for (const rawId of ids) {
    const id = Number(rawId);
    try {
      const unidade = await prisma.unidadeFisica.findUnique({
        where: { id },
        include: {
          itensVenda:     { select: { id: true } },
          transferencias: { select: { id: true, status: true } },
          ordensServico:  { select: { id: true, status: true } },
        },
      });

      if (!unidade) { detalhes.push(`ID ${id}: não encontrado`); bloqueados++; continue; }

      if (unidade.status === 'VENDIDA' || unidade.itensVenda.length > 0) {
        detalhes.push(`Chassi ${unidade.chassi || id}: vinculado a venda — bloqueado`); bloqueados++; continue;
      }

      const transferAtiva = unidade.transferencias.find(t => ['SOLICITADA', 'APROVADA'].includes(t.status));
      if (transferAtiva) {
        detalhes.push(`Chassi ${unidade.chassi || id}: em transferência ativa — bloqueado`); bloqueados++; continue;
      }

      const osAtiva = unidade.ordensServico.find(os => os.status !== 'EXECUTADA');
      if (osAtiva) {
        detalhes.push(`Chassi ${unidade.chassi || id}: em OS ativa — bloqueado`); bloqueados++; continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.unidadeFisica.delete({ where: { id } });

        const estoque = await tx.estoque.findUnique({
          where: { produtoId_lojaId: { produtoId: unidade.produtoId, lojaId: unidade.lojaId } },
        });
        const qtdAnterior = estoque?.quantidade ?? 0;
        const qtdNova = Math.max(0, qtdAnterior - 1);
        if (estoque) {
          await tx.estoque.update({ where: { id: estoque.id }, data: { quantidade: qtdNova } });
        }
        await tx.logEstoque.create({
          data: {
            tipo: 'SAIDA',
            origem: 'EXCLUSAO_MANUAL',
            origemId: id,
            produtoId: unidade.produtoId,
            lojaId: unidade.lojaId,
            quantidade: 1,
            quantidadeAnterior: qtdAnterior,
            quantidadeNova: qtdNova,
            usuarioId: req.user!.id,
          },
        });
        await tx.logAuditoria.create({
          data: {
            usuarioId: req.user!.id,
            acao: 'EXCLUSAO_CHASSI_LOTE',
            entidade: 'UnidadeFisica',
            entidadeId: id,
            dados: JSON.stringify({ chassi: unidade.chassi }),
          },
        });
      });
      excluidos++;
    } catch {
      detalhes.push(`ID ${id}: erro interno ao excluir`);
      bloqueados++;
    }
  }

  res.json({ excluidos, bloqueados, detalhes });
});

// ─── ENTRADA MANUAL DE MOTO ──────────────────────────────────────────────────
router.post('/entrada-moto', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  try {
    const { produtoId, lojaId, chassi, codigoMotor, cor, ano, custo, precoVenda } = req.body;

    if (!produtoId || !lojaId) {
      return res.status(400).json({ error: 'Produto e loja são obrigatórios' });
    }

    if (!chassi || !String(chassi).trim()) {
      return res.status(400).json({ error: 'Chassi é obrigatório' });
    }

    const chassiLimpo = String(chassi).trim().toUpperCase();

    const chassiExistente = await prisma.unidadeFisica.findFirst({ where: { chassi: chassiLimpo } });
    if (chassiExistente) {
      return res.status(400).json({ error: `Chassi "${chassiLimpo}" já está cadastrado` });
    }

    const numeroSerie = await gerarNumeroSerieUnidade();

    const unidade = await prisma.unidadeFisica.create({
      data: {
        produtoId: Number(produtoId),
        lojaId: Number(lojaId),
        chassi: chassiLimpo,
        codigoMotor: codigoMotor ? String(codigoMotor).trim().toUpperCase() : null,
        cor: cor ? String(cor).trim() : null,
        ano: ano ? Number(ano) : new Date().getFullYear(),
        numeroSerie,
        status: 'ESTOQUE',
        createdBy: req.user!.id,
      }
    });

    const estoque = await prisma.estoque.findUnique({
      where: { produtoId_lojaId: { produtoId: Number(produtoId), lojaId: Number(lojaId) } }
    });

    const qtdAnterior = estoque?.quantidade || 0;
    const qtdNova = qtdAnterior + 1;

    const estoqueData: any = { quantidade: qtdNova };
    if (custo !== undefined && custo !== '') estoqueData.custoMedio = Number(custo);
    if (precoVenda !== undefined && precoVenda !== '') estoqueData.precoVenda = Number(precoVenda);

    if (estoque) {
      await prisma.estoque.update({ where: { id: estoque.id }, data: estoqueData });
    } else {
      await prisma.estoque.create({
        data: { produtoId: Number(produtoId), lojaId: Number(lojaId), ...estoqueData }
      });
    }

    await prisma.logEstoque.create({
      data: {
        tipo: 'ENTRADA',
        origem: 'ENTRADA_MANUAL',
        produtoId: Number(produtoId),
        lojaId: Number(lojaId),
        quantidade: 1,
        quantidadeAnterior: qtdAnterior,
        quantidadeNova: qtdNova,
        usuarioId: req.user!.id,
      }
    });

    res.status(201).json(unidade);
  } catch (error) {
    console.error('Erro ao cadastrar entrada de moto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
