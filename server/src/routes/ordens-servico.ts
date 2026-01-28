import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const ordens = await prisma.ordemServico.findMany({
      where,
      include: {
        cliente: true,
        loja: true,
        unidadeFisica: { include: { produto: true } },
        itens: { include: { produto: true, servico: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ordens);
  } catch (error) {
    console.error('Erro ao listar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const os = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: true,
        loja: true,
        unidadeFisica: { include: { produto: true } },
        itens: { include: { produto: true, servico: true } }
      }
    });

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    res.json(os);
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id/cliente', async (req, res) => {
  try {
    const os = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        loja: { select: { nomeFantasia: true, telefone: true, endereco: true } },
        unidadeFisica: { include: { produto: { select: { nome: true } } } },
        itens: { 
          include: { 
            produto: { select: { nome: true } }, 
            servico: { select: { id: true, nome: true, preco: true } }
          } 
        }
      }
    });

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    const osCliente = {
      id: os.id,
      numero: os.numero,
      tipo: os.tipo,
      status: os.status,
      valorTotal: os.valorTotal,
      motoDescricao: os.motoDescricao,
      observacoes: os.observacoes,
      cliente: os.cliente,
      loja: os.loja,
      unidadeFisica: os.unidadeFisica,
      itens: os.itens.map(item => ({
        ...item,
        servico: item.servico ? { id: item.servico.id, nome: item.servico.nome, preco: item.servico.preco } : null
      })),
      createdAt: os.createdAt
    };

    res.json(osCliente);
  } catch (error) {
    console.error('Erro ao buscar OS para cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { clienteId, unidadeFisicaId, motoDescricao, tecnico, observacoes, lojaId, itens, tipo } = req.body;

    if (!clienteId || !lojaId) {
      return res.status(400).json({ error: 'Cliente e loja são obrigatórios' });
    }

    const config = await prisma.configuracao.findFirst();
    const userRole = req.user?.role;

    let valorBruto = 0;
    let valorTotal = 0;
    const itensProcessados = [];

    if (itens?.length) {
      for (const item of itens) {
        const subtotalBruto = Number(item.precoUnitario) * item.quantidade;
        valorBruto += subtotalBruto;
        
        let desconto = Number(item.desconto || 0);
        
        if (item.servicoId) {
          desconto = 0;
        } else if (item.produtoId) {
          const estoque = await prisma.estoque.findFirst({
            where: { produtoId: item.produtoId, lojaId: Number(lojaId) }
          });

          if (!estoque || estoque.quantidade < item.quantidade) {
            const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
            return res.status(400).json({ 
              error: `Estoque insuficiente para ${produto?.nome || 'peça'}. Disponivel: ${estoque?.quantidade || 0}` 
            });
          }

          let maxDesconto = Number(config?.descontoMaxPeca || 10);
          if (userRole === 'GERENTE_LOJA') {
            maxDesconto = Math.min(maxDesconto, 5);
          } else if (userRole === 'VENDEDOR') {
            maxDesconto = 0;
          }
          if (desconto > maxDesconto) {
            return res.status(400).json({ 
              error: `Desconto de ${desconto}% excede o maximo permitido para seu perfil (${maxDesconto}%)` 
            });
          }
        }

        const subtotal = subtotalBruto * (1 - desconto / 100);
        valorTotal += subtotal;

        itensProcessados.push({
          produtoId: item.produtoId || null,
          servicoId: item.servicoId || null,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario) * (1 - desconto / 100)
        });
      }
    }

    const tipoOS = tipo || 'OS';
    const status = tipoOS === 'ORCAMENTO' ? 'ORCAMENTO' : 'EM_EXECUCAO';

    const os = await prisma.ordemServico.create({
      data: {
        clienteId: Number(clienteId),
        unidadeFisicaId: unidadeFisicaId ? Number(unidadeFisicaId) : null,
        motoDescricao,
        tecnico,
        observacoes,
        lojaId: Number(lojaId),
        valorBruto,
        valorTotal,
        tipo: tipoOS,
        status: status as any,
        createdBy: req.user!.id,
        itens: { create: itensProcessados }
      },
      include: { 
        itens: { include: { produto: true, servico: true } }, 
        cliente: true, 
        loja: true 
      }
    });

    if (tipoOS !== 'ORCAMENTO') {
      for (const item of itensProcessados) {
        if (item.produtoId) {
          await prisma.estoque.updateMany({
            where: { produtoId: item.produtoId, lojaId: Number(lojaId) },
            data: { quantidade: { decrement: item.quantidade } }
          });
        }
      }
    }

    res.status(201).json(os);
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });

    res.json(os);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/confirmar', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const osAtual = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!osAtual) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { confirmadaFinanceiro: true, status: 'EXECUTADA' }
    });

    await prisma.caixa.create({
      data: {
        lojaId: os.lojaId,
        tipo: 'entrada',
        descricao: `OS #${os.numero}`,
        valor: os.valorTotal,
        referencia: `os_${os.id}`
      }
    });

    if (osAtual.tecnico) {
      const tecnicoUser = await prisma.user.findFirst({
        where: { nome: osAtual.tecnico, role: 'TECNICO' }
      });

      if (tecnicoUser) {
        const config = await prisma.configuracao.findFirst();
        const comissaoPercent = Number(config?.comissaoTecnico || 25);
        const comissaoValor = Number(os.valorTotal) * (comissaoPercent / 100);

        await prisma.comissao.create({
          data: {
            usuarioId: tecnicoUser.id,
            ordemServicoId: os.id,
            tipo: 'tecnico',
            valor: comissaoValor,
            periodo: config?.periodoComissao || 'MENSAL'
          }
        });
      }
    }

    res.json(os);
  } catch (error) {
    console.error('Erro ao confirmar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/converter-os', async (req: AuthRequest, res) => {
  try {
    const osAtual = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) },
      include: { itens: { include: { produto: true, servico: true } } }
    });

    if (!osAtual) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    if (osAtual.tipo !== 'ORCAMENTO') {
      return res.status(400).json({ error: 'Apenas orçamentos podem ser convertidos' });
    }

    for (const item of osAtual.itens) {
      if (item.produtoId) {
        const estoque = await prisma.estoque.findFirst({
          where: { produtoId: item.produtoId, lojaId: osAtual.lojaId }
        });

        if (!estoque || estoque.quantidade < item.quantidade) {
          const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
          return res.status(400).json({ 
            error: `Estoque insuficiente para ${produto?.nome || 'peça'}` 
          });
        }
      }
    }

    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { 
        tipo: 'OS',
        status: 'EM_EXECUCAO'
      }
    });

    for (const item of osAtual.itens) {
      if (item.produtoId) {
        await prisma.estoque.updateMany({
          where: { produtoId: item.produtoId, lojaId: osAtual.lojaId },
          data: { quantidade: { decrement: item.quantidade } }
        });
      }
    }

    res.json(os);
  } catch (error) {
    console.error('Erro ao converter orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const os = await prisma.ordemServico.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    if (os.confirmadaFinanceiro || os.status === 'EXECUTADA') {
      return res.status(400).json({ error: 'Não é possível excluir OS confirmadas ou finalizadas' });
    }

    await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: { 
        deletedAt: new Date(),
        deletedBy: req.user!.id
      }
    });

    await prisma.logAuditoria.create({
      data: {
        usuarioId: req.user!.id,
        acao: 'DELETE',
        entidade: 'OrdemServico',
        entidadeId: Number(req.params.id),
        dados: JSON.stringify(os)
      }
    });

    res.json({ message: 'OS excluída' });
  } catch (error) {
    console.error('Erro ao excluir OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
