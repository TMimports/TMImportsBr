import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';
import { InventoryService } from '../services/InventoryService.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = { deletedAt: null };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };
    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: true,
        vendedor: { select: { id: true, nome: true } },
        loja: true,
        itens: { include: { produto: true, servico: true, unidadeFisica: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/produtos-disponiveis/:lojaId', async (req: AuthRequest, res) => {
  try {
    const lojaId = Number(req.params.lojaId);
    const produtos = await InventoryService.getProdutosDisponiveis(lojaId);
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos disponíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cliente: true,
        vendedor: true,
        loja: true,
        itens: { include: { produto: true, servico: true, unidadeFisica: true } }
      }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const userRole = req.user?.role;
    if (userRole !== 'ADMIN_GERAL' && userRole !== 'ADMIN_REDE') {
      const userGrupoId = req.user?.grupoId;
      if (venda.loja && venda.loja.grupoId !== userGrupoId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { tipo, clienteId, vendedorId, lojaId, formaPagamento, parcelas, itens } = req.body;

    if (!clienteId || !lojaId || !formaPagamento || !itens?.length) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const config = await prisma.configuracao.findFirst();
    const userRole = req.user?.role;

    const tipoVendaCheck = tipo || 'VENDA';

    const itensParaVerificar = itens
      .filter((item: any) => item.produtoId)
      .map((item: any) => ({ produtoId: item.produtoId, quantidade: item.quantidade }));

    if (tipoVendaCheck !== 'ORCAMENTO' && itensParaVerificar.length > 0) {
      const verificacao = await InventoryService.verificarItensVenda(itensParaVerificar, Number(lojaId));
      if (!verificacao.valido) {
        return res.status(400).json({ 
          error: 'Estoque insuficiente',
          detalhes: verificacao.erros
        });
      }
    }

    let valorBruto = 0;
    let valorTotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      let precoUnitario = Number(item.precoUnitario);
      let desconto = Number(item.desconto || 0);

      if (item.produtoId) {
        const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
        if (produto) {
          let maxDesconto = produto.tipo === 'MOTO' ? Number(config?.descontoMaxMoto || 3.5) : Number(config?.descontoMaxPeca || 10);
          
          if (userRole === 'GERENTE_LOJA') {
            maxDesconto = maxDesconto * 2;
          }
          
          if (desconto > maxDesconto) {
            return res.status(400).json({ 
              error: `Desconto de ${desconto}% excede o maximo permitido para seu perfil (${maxDesconto}%)` 
            });
          }
        }
      }

      if (formaPagamento === 'CARTAO_DEBITO' || formaPagamento === 'CARTAO_CREDITO') {
        desconto = 0;
      }

      const subtotalBruto = precoUnitario * item.quantidade;
      const subtotal = subtotalBruto * (1 - desconto / 100);
      valorBruto += subtotalBruto;
      valorTotal += subtotal;

      itensProcessados.push({
        produtoId: item.produtoId || null,
        servicoId: item.servicoId || null,
        unidadeFisicaId: item.unidadeFisicaId || null,
        quantidade: item.quantidade,
        precoUnitario,
        desconto
      });
    }

    const tipoVenda = tipo || 'VENDA';
    const confirmarAutomaticamente = tipoVenda === 'VENDA';

    const venda = await prisma.venda.create({
      data: {
        tipo: tipoVenda,
        clienteId: Number(clienteId),
        vendedorId: Number(vendedorId || req.user!.id),
        lojaId: Number(lojaId),
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : null,
        valorBruto,
        valorTotal,
        confirmadaFinanceiro: confirmarAutomaticamente,
        createdBy: req.user!.id,
        itens: { create: itensProcessados }
      },
      include: { 
        itens: { include: { produto: true, servico: true, unidadeFisica: true } },
        cliente: true,
        vendedor: true,
        loja: true
      }
    });

    if (confirmarAutomaticamente) {
      const resultadoBaixa = await InventoryService.processarBaixaVenda(
        venda.id,
        itensProcessados.filter(i => i.produtoId).map(i => ({
          produtoId: i.produtoId!,
          quantidade: i.quantidade,
          unidadeFisicaId: i.unidadeFisicaId || undefined
        })),
        Number(lojaId),
        req.user!.id
      );

      if (!resultadoBaixa.success) {
        await prisma.venda.delete({ where: { id: venda.id } });
        return res.status(400).json({ error: resultadoBaixa.error });
      }

      if (formaPagamento !== 'FINANCIAMENTO') {
        await prisma.caixa.create({
          data: {
            lojaId: Number(lojaId),
            tipo: 'entrada',
            descricao: `Venda #${venda.id}`,
            valor: valorTotal,
            formaPagamento,
            referencia: `venda_${venda.id}`
          }
        });
      }

      if (formaPagamento === 'FINANCIAMENTO' || (parcelas && parcelas > 1)) {
        const numParcelas = parcelas || 1;
        const valorParcela = valorTotal / numParcelas;
        
        for (let i = 0; i < numParcelas; i++) {
          const vencimento = new Date();
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          
          await prisma.contaReceber.create({
            data: {
              lojaId: Number(lojaId),
              clienteId: Number(clienteId),
              vendaId: venda.id,
              descricao: `Venda #${venda.id} - Parcela ${i + 1}/${numParcelas}`,
              valor: valorParcela,
              vencimento,
              createdBy: req.user!.id
            }
          });
        }
      }

      const comissaoPercent = Number(config?.comissaoVendedorMoto || 1);
      const comissaoValor = valorTotal * (comissaoPercent / 100);

      await prisma.comissao.create({
        data: {
          usuarioId: Number(vendedorId || req.user!.id),
          vendaId: venda.id,
          tipo: 'vendedor',
          valor: comissaoValor,
          periodo: config?.periodoComissao || 'MENSAL'
        }
      });

      for (const item of itensProcessados) {
        if (item.unidadeFisicaId) {
          const garantiasConfig = [
            { tipo: 'geral', meses: 3 },
            { tipo: 'motor', meses: 12 },
            { tipo: 'modulo', meses: 12 },
            { tipo: 'bateria', meses: 12 }
          ];
          
          for (const g of garantiasConfig) {
            const dataInicio = new Date();
            const dataFim = new Date();
            dataFim.setMonth(dataFim.getMonth() + g.meses);
            
            await prisma.garantia.create({
              data: {
                unidadeFisicaId: item.unidadeFisicaId,
                clienteId: Number(clienteId),
                vendaId: venda.id,
                tipoGarantia: g.tipo,
                meses: g.meses,
                dataInicio,
                dataFim
              }
            });
          }
        }
      }
    }

    res.status(201).json(venda);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/confirmar', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const vendaAtual = await prisma.venda.findUnique({
      where: { id: Number(req.params.id) },
      include: { itens: { include: { produto: true, servico: true } } }
    });

    if (!vendaAtual) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (vendaAtual.confirmadaFinanceiro) {
      return res.status(400).json({ error: 'Venda já confirmada' });
    }

    const itensParaVerificar = vendaAtual.itens
      .filter(item => item.produtoId)
      .map(item => ({ produtoId: item.produtoId!, quantidade: item.quantidade }));

    if (itensParaVerificar.length > 0) {
      const verificacao = await InventoryService.verificarItensVenda(itensParaVerificar, vendaAtual.lojaId);
      if (!verificacao.valido) {
        return res.status(400).json({ 
          error: 'Estoque insuficiente',
          detalhes: verificacao.erros
        });
      }
    }

    const venda = await prisma.venda.update({
      where: { id: Number(req.params.id) },
      data: { confirmadaFinanceiro: true },
      include: { 
        itens: { include: { produto: true, servico: true, unidadeFisica: true } },
        cliente: true,
        vendedor: true,
        loja: true
      }
    });

    const resultadoBaixa = await InventoryService.processarBaixaVenda(
      venda.id,
      venda.itens.filter(i => i.produtoId).map(i => ({
        produtoId: i.produtoId!,
        quantidade: i.quantidade,
        unidadeFisicaId: i.unidadeFisicaId || undefined
      })),
      venda.lojaId,
      req.user!.id
    );

    if (!resultadoBaixa.success) {
      await prisma.venda.update({
        where: { id: venda.id },
        data: { confirmadaFinanceiro: false }
      });
      return res.status(400).json({ error: resultadoBaixa.error });
    }

    if (venda.formaPagamento !== 'FINANCIAMENTO') {
      await prisma.caixa.create({
        data: {
          lojaId: venda.lojaId,
          tipo: 'entrada',
          descricao: `Venda #${venda.id}`,
          valor: venda.valorTotal,
          formaPagamento: venda.formaPagamento,
          referencia: `venda_${venda.id}`
        }
      });
    }

    if (venda.formaPagamento === 'FINANCIAMENTO' || (venda.parcelas && venda.parcelas > 1)) {
      const contasExistentes = await prisma.contaReceber.count({ where: { vendaId: venda.id } });
      
      if (contasExistentes === 0) {
        const numParcelas = venda.parcelas || 1;
        const valorParcela = Number(venda.valorTotal) / numParcelas;
        
        for (let i = 0; i < numParcelas; i++) {
          const vencimento = new Date();
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          
          await prisma.contaReceber.create({
            data: {
              lojaId: venda.lojaId,
              clienteId: venda.clienteId,
              vendaId: venda.id,
              descricao: `Venda #${venda.id} - Parcela ${i + 1}/${numParcelas}`,
              valor: valorParcela,
              vencimento,
              createdBy: req.user!.id
            }
          });
        }
      }
    }

    for (const item of venda.itens) {
      if (item.unidadeFisicaId) {
        const garantiasExistentes = await prisma.garantia.count({ 
          where: { vendaId: venda.id, unidadeFisicaId: item.unidadeFisicaId } 
        });
        
        if (garantiasExistentes === 0) {
          const garantiasConfig = [
            { tipo: 'geral', meses: 3 },
            { tipo: 'motor', meses: 12 },
            { tipo: 'modulo', meses: 12 },
            { tipo: 'bateria', meses: 12 }
          ];
          
          for (const g of garantiasConfig) {
            const dataInicio = new Date();
            const dataFim = new Date();
            dataFim.setMonth(dataFim.getMonth() + g.meses);
            
            await prisma.garantia.create({
              data: {
                unidadeFisicaId: item.unidadeFisicaId,
                clienteId: venda.clienteId,
                vendaId: venda.id,
                tipoGarantia: g.tipo,
                meses: g.meses,
                dataInicio,
                dataFim
              }
            });
          }
        }
      }
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao confirmar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/converter-venda', async (req: AuthRequest, res) => {
  try {
    const vendaAtual = await prisma.venda.findUnique({
      where: { id: Number(req.params.id) },
      include: { itens: true }
    });

    if (!vendaAtual) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (vendaAtual.tipo !== 'ORCAMENTO') {
      return res.status(400).json({ error: 'Apenas orçamentos podem ser convertidos em venda' });
    }

    const itensParaVerificar = vendaAtual.itens
      .filter(item => item.produtoId)
      .map(item => ({ produtoId: item.produtoId!, quantidade: item.quantidade }));

    if (itensParaVerificar.length > 0) {
      const verificacao = await InventoryService.verificarItensVenda(itensParaVerificar, vendaAtual.lojaId);
      if (!verificacao.valido) {
        return res.status(400).json({ 
          error: 'Estoque insuficiente',
          detalhes: verificacao.erros
        });
      }
    }

    const venda = await prisma.venda.update({
      where: { id: Number(req.params.id) },
      data: { 
        tipo: 'VENDA',
        confirmadaFinanceiro: true 
      },
      include: { 
        itens: { include: { produto: true, servico: true, unidadeFisica: true } },
        cliente: true,
        vendedor: true,
        loja: true
      }
    });

    const resultadoBaixa = await InventoryService.processarBaixaVenda(
      venda.id,
      venda.itens.filter(i => i.produtoId).map(i => ({
        produtoId: i.produtoId!,
        quantidade: i.quantidade,
        unidadeFisicaId: i.unidadeFisicaId || undefined
      })),
      venda.lojaId,
      req.user!.id
    );

    if (!resultadoBaixa.success) {
      await prisma.venda.update({
        where: { id: venda.id },
        data: { tipo: 'ORCAMENTO', confirmadaFinanceiro: false }
      });
      return res.status(400).json({ error: resultadoBaixa.error });
    }

    if (venda.formaPagamento !== 'FINANCIAMENTO') {
      await prisma.caixa.create({
        data: {
          lojaId: venda.lojaId,
          tipo: 'entrada',
          descricao: `Venda #${venda.id} (convertido de orçamento)`,
          valor: venda.valorTotal,
          formaPagamento: venda.formaPagamento,
          referencia: `venda_${venda.id}`
        }
      });
    }

    if (venda.formaPagamento === 'FINANCIAMENTO' || (venda.parcelas && venda.parcelas > 1)) {
      const numParcelas = venda.parcelas || 1;
      const valorParcela = Number(venda.valorTotal) / numParcelas;
      
      for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date();
        vencimento.setMonth(vencimento.getMonth() + i + 1);
        
        await prisma.contaReceber.create({
          data: {
            lojaId: venda.lojaId,
            clienteId: venda.clienteId,
            vendaId: venda.id,
            descricao: `Venda #${venda.id} - Parcela ${i + 1}/${numParcelas}`,
            valor: valorParcela,
            vencimento,
            createdBy: req.user!.id
          }
        });
      }
    }

    const config = await prisma.configuracao.findFirst();
    const comissaoPercent = Number(config?.comissaoVendedorMoto || 1);
    const comissaoValor = Number(venda.valorTotal) * (comissaoPercent / 100);

    await prisma.comissao.create({
      data: {
        usuarioId: venda.vendedorId,
        vendaId: venda.id,
        tipo: 'vendedor',
        valor: comissaoValor,
        periodo: config?.periodoComissao || 'MENSAL'
      }
    });

    for (const item of venda.itens) {
      if (item.unidadeFisicaId) {
        const garantiasConfig = [
          { tipo: 'geral', meses: 3 },
          { tipo: 'motor', meses: 12 },
          { tipo: 'modulo', meses: 12 },
          { tipo: 'bateria', meses: 12 }
        ];
        
        for (const g of garantiasConfig) {
          const dataInicio = new Date();
          const dataFim = new Date();
          dataFim.setMonth(dataFim.getMonth() + g.meses);
          
          await prisma.garantia.create({
            data: {
              unidadeFisicaId: item.unidadeFisicaId,
              clienteId: venda.clienteId,
              vendaId: venda.id,
              tipoGarantia: g.tipo,
              meses: g.meses,
              dataInicio,
              dataFim
            }
          });
        }
      }
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao converter orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireRole('ADMIN_GERAL', 'GERENTE_LOJA', 'DONO_LOJA'), async (req: AuthRequest, res) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.confirmadaFinanceiro) {
      return res.status(400).json({ error: 'Não é possível excluir vendas confirmadas' });
    }

    await prisma.venda.update({
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
        entidade: 'Venda',
        entidadeId: Number(req.params.id),
        dados: JSON.stringify(venda)
      }
    });

    res.json({ message: 'Orçamento excluído' });
  } catch (error) {
    console.error('Erro ao excluir venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
