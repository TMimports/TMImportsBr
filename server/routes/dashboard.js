const express = require('express');
const router = express.Router();
const { Sale, ServiceOrder, Product, Customer, PaymentReceivable, PaymentPayable, InventoryStore, InventoryMain, InventoryMovement, Store, Vendor, SaleItem, PurchaseRequest, sequelize } = require('../models');
const { verifyToken, filterByStore, hasDashboardGlobalAccess, hasDashboardOperacionalAccess, hasDashboardFinanceiroAccess, logAccessDenied } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);

function getDateRange(range) {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  let inicio;
  
  switch(range) {
    case 'weekly':
      inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'all':
    default:
      inicio = new Date(2020, 0, 1);
      break;
  }
  
  return { inicio, fim: hoje };
}

function checkDashboardPermission(user, dashboardType) {
  const perfil = user.perfil;
  const roleCodes = user.roleCodes || [];
  
  if (user.isAdmin || perfil === 'ADMIN_GLOBAL' || roleCodes.includes('ADMIN_GLOBAL')) return true;
  
  if (dashboardType === 'global') {
    if (roleCodes.includes('GESTOR_DASHBOARD')) return true;
    if (roleCodes.includes('GERENTE_OP')) return false;
    return false;
  }
  
  if (dashboardType === 'operacional') {
    const opRoles = ['GERENTE_OP', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'VENDEDOR_LOJA', 'VENDEDOR_TMI'];
    return opRoles.some(r => roleCodes.includes(r));
  }
  
  if (dashboardType === 'financeiro') {
    if (roleCodes.includes('GERENTE_OP')) return false;
    const finRoles = ['FINANCEIRO', 'FRANQUEADO_GESTOR'];
    return finRoles.some(r => roleCodes.includes(r));
  }
  
  if (dashboardType === 'loja') {
    return roleCodes.includes('FRANQUEADO_GESTOR') || perfil === 'GESTOR_FRANQUIA';
  }
  
  if (dashboardType === 'vendedor') {
    return ['VENDEDOR_LOJA', 'VENDEDOR_TMI'].some(r => roleCodes.includes(r)) || perfil === 'OPERACIONAL';
  }
  
  return false;
}

// Centralized function to check if user can see financial values
function canUserSeeFinancialValues(user) {
  const perfil = user.perfil;
  const roleCodes = user.roleCodes || [];
  
  // Admins always have access
  if (user.isAdmin || perfil === 'ADMIN_GLOBAL' || roleCodes.includes('ADMIN_GLOBAL')) {
    return true;
  }
  
  // Financial roles have access
  const financialRoles = ['FINANCEIRO', 'FRANQUEADO_GESTOR'];
  if (financialRoles.some(r => roleCodes.includes(r))) {
    return true;
  }
  
  // Legacy GESTOR_FRANQUIA has access
  if (perfil === 'GESTOR_FRANQUIA') {
    return true;
  }
  
  // All other roles are blocked from financial values
  return false;
}

router.get('/summary', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin;
    const canSeeFinance = canUserSeeFinancialValues(req.user);
    
    // Security: non-admins can only access their own store data
    let loja_id;
    if (isAdmin) {
      loja_id = storeId || null; // Admin can query any store or all stores
    } else {
      loja_id = req.user.loja_id; // Non-admins are restricted to their store only
    }
    
    const whereVenda = {
      data_venda: { [Op.between]: [inicio, fim] }
    };
    const whereOS = {
      createdAt: { [Op.between]: [inicio, fim] }
    };
    
    if (!isAdmin && loja_id) {
      whereVenda.loja_id = loja_id;
      whereOS.loja_id = loja_id;
    }
    
    const whereFinanceiro = isAdmin ? {} : { loja_id };
    
    const [vendas, osAbertas, osFechadas, estoqueBaixo, estoqueSemEstoque, pedidos, receberPendente, receberPago, pagarPendente, pagarPago] = await Promise.all([
      Sale.findAll({
        where: { ...whereVenda, status: 'CONCLUIDA' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('total')), 'value']
        ],
        raw: true
      }),
      ServiceOrder.findAll({
        where: { ...whereOS, status: { [Op.in]: ['ABERTA', 'EM_EXECUCAO'] } },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('total')), 'value']
        ],
        raw: true
      }),
      ServiceOrder.findAll({
        where: { ...whereOS, status: 'CONCLUIDA' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('total')), 'value']
        ],
        raw: true
      }),
      isAdmin 
        ? InventoryMain.count({ where: { quantidade: { [Op.lte]: 2, [Op.gt]: 0 } } })
        : InventoryStore.count({ where: { loja_id, quantidade: { [Op.lte]: 2, [Op.gt]: 0 } } }),
      isAdmin
        ? InventoryMain.count({ where: { quantidade: 0 } })
        : InventoryStore.count({ where: { loja_id, quantidade: 0 } }),
      PurchaseRequest.findAll({
        where: isAdmin ? {} : { loja_id },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      PaymentReceivable.findAll({
        where: { ...whereFinanceiro, status: 'PENDENTE' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        raw: true
      }),
      PaymentReceivable.findAll({
        where: { ...whereFinanceiro, status: 'PAGO' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        raw: true
      }),
      PaymentPayable.findAll({
        where: { ...whereFinanceiro, status: 'PENDENTE' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        raw: true
      }),
      PaymentPayable.findAll({
        where: { ...whereFinanceiro, status: 'PAGO' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        raw: true
      })
    ]);
    
    const pedidosMap = {};
    pedidos.forEach(p => { pedidosMap[p.status] = parseInt(p.count) || 0; });
    
    const response = {
      range,
      vendas: {
        total_qty: parseInt(vendas[0]?.qty) || 0,
        total_value: canSeeFinance ? (parseFloat(vendas[0]?.value) || 0) : 0
      },
      os: {
        open_qty: parseInt(osAbertas[0]?.qty) || 0,
        open_value: canSeeFinance ? (parseFloat(osAbertas[0]?.value) || 0) : 0,
        closed_qty: parseInt(osFechadas[0]?.qty) || 0,
        closed_value: canSeeFinance ? (parseFloat(osFechadas[0]?.value) || 0) : 0
      },
      estoque: {
        low_stock_qty: estoqueBaixo,
        out_stock_qty: estoqueSemEstoque
      },
      pedidos: {
        pending: pedidosMap['PENDENTE'] || 0,
        approved: pedidosMap['APROVADA'] || 0,
        invoiced: pedidosMap['FATURADA'] || 0,
        shipped: pedidosMap['ENVIADA'] || 0,
        delivered: pedidosMap['RECEBIDA'] || 0
      }
    };
    
    // Only include financial data for users with financial access
    if (canSeeFinance) {
      response.receber = {
        pending_qty: parseInt(receberPendente[0]?.qty) || 0,
        pending_value: parseFloat(receberPendente[0]?.value) || 0,
        paid_qty: parseInt(receberPago[0]?.qty) || 0,
        paid_value: parseFloat(receberPago[0]?.value) || 0
      };
      response.pagar = {
        pending_qty: parseInt(pagarPendente[0]?.qty) || 0,
        pending_value: parseFloat(pagarPendente[0]?.value) || 0,
        paid_qty: parseInt(pagarPago[0]?.qty) || 0,
        paid_value: parseFloat(pagarPago[0]?.value) || 0
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar summary:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo do dashboard' });
  }
});

router.get('/charts', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin;
    const canSeeFinance = canUserSeeFinancialValues(req.user);
    
    // Security: non-admins can only access their own store data
    let loja_id;
    if (isAdmin) {
      loja_id = storeId || null;
    } else {
      loja_id = req.user.loja_id;
    }
    
    const hoje = new Date();
    const vendasPorDia = [];
    const osPorDia = [];
    
    if (range === 'all') {
      for (let i = 11; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
        fimMes.setHours(23, 59, 59, 999);
        
        const whereVenda = {
          data_venda: { [Op.between]: [mes, fimMes] },
          status: 'CONCLUIDA'
        };
        const whereOS = {
          createdAt: { [Op.between]: [mes, fimMes] }
        };
        
        if (!isAdmin && loja_id) {
          whereVenda.loja_id = loja_id;
          whereOS.loja_id = loja_id;
        }
        
        const [vendaMes, osAberta, osFechada] = await Promise.all([
          Sale.sum('total', { where: whereVenda }),
          ServiceOrder.count({ where: { ...whereOS, status: { [Op.in]: ['ABERTA', 'EM_EXECUCAO'] } } }),
          ServiceOrder.count({ where: { ...whereOS, status: 'CONCLUIDA' } })
        ]);
        
        const label = mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        vendasPorDia.push({ label, value: vendaMes || 0 });
        osPorDia.push({ label, abertas: osAberta, fechadas: osFechada });
      }
    } else {
      const diasAtras = range === 'weekly' ? 7 : 30;
      
      for (let i = diasAtras - 1; i >= 0; i--) {
        const dia = new Date(hoje);
        dia.setDate(dia.getDate() - i);
        dia.setHours(0, 0, 0, 0);
        const fimDia = new Date(dia);
        fimDia.setHours(23, 59, 59, 999);
        
        const whereVenda = {
          data_venda: { [Op.between]: [dia, fimDia] },
          status: 'CONCLUIDA'
        };
        const whereOS = {
          createdAt: { [Op.between]: [dia, fimDia] }
        };
        
        if (!isAdmin && loja_id) {
          whereVenda.loja_id = loja_id;
          whereOS.loja_id = loja_id;
        }
        
        const [vendaDia, osAberta, osFechada] = await Promise.all([
          Sale.sum('total', { where: whereVenda }),
          ServiceOrder.count({ where: { ...whereOS, status: { [Op.in]: ['ABERTA', 'EM_EXECUCAO'] } } }),
          ServiceOrder.count({ where: { ...whereOS, status: 'CONCLUIDA' } })
        ]);
        
        const label = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        vendasPorDia.push({ label, value: vendaDia || 0 });
        osPorDia.push({ label, abertas: osAberta, fechadas: osFechada });
      }
    }
    
    const whereStatus = isAdmin ? {} : { loja_id };
    const pedidosPorStatus = await PurchaseRequest.findAll({
      where: whereStatus,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    const response = {
      osPorDia,
      pedidosPorStatus
    };
    
    // Only include financial data (vendasPorDia values) for users with financial access
    if (canSeeFinance) {
      response.vendasPorDia = vendasPorDia;
    } else {
      // Return only labels without values for blocked users
      response.vendasPorDia = vendasPorDia.map(v => ({ label: v.label, value: 0 }));
    }
    
    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar charts:', error);
    res.status(500).json({ error: 'Erro ao gerar gráficos' });
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin;
    const canSeeFinance = canUserSeeFinancialValues(req.user);
    
    // Security: non-admins can only access their own store data
    let loja_id;
    if (isAdmin) {
      loja_id = storeId || null;
    } else {
      loja_id = req.user.loja_id;
    }
    
    const whereVenda = {
      data_venda: { [Op.between]: [inicio, fim] },
      status: 'CONCLUIDA'
    };
    if (!isAdmin && loja_id) whereVenda.loja_id = loja_id;
    
    const vendasIds = await Sale.findAll({
      where: whereVenda,
      attributes: ['id'],
      raw: true
    });
    const ids = vendasIds.map(v => v.id);
    
    let topProdutos = [];
    if (ids.length > 0) {
      topProdutos = await SaleItem.findAll({
        where: { venda_id: { [Op.in]: ids } },
        attributes: [
          'produto_id',
          [sequelize.fn('SUM', sequelize.col('SaleItem.quantidade')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('SaleItem.total')), 'value']
        ],
        include: [{ model: Product, as: 'produto', attributes: ['nome', 'tipo'] }],
        group: ['SaleItem.produto_id', 'produto.id'],
        order: [[sequelize.fn('SUM', sequelize.col('SaleItem.total')), 'DESC']],
        limit: 10,
        raw: false
      });
    }
    
    let rankingFranquias = [];
    if (isAdmin) {
      rankingFranquias = await Sale.findAll({
        where: whereVenda,
        attributes: [
          'loja_id',
          [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('Sale.total')), 'value']
        ],
        include: [{ model: Store, as: 'loja', attributes: ['nome'] }],
        group: ['Sale.loja_id', 'loja.id'],
        order: [[sequelize.fn('SUM', sequelize.col('Sale.total')), 'DESC']],
        limit: 10
      });
    }
    
    res.json({
      topProdutos: topProdutos.map(p => ({
        nome: p.produto?.nome || 'Produto',
        tipo: p.produto?.tipo || 'PECA',
        qty: parseInt(p.dataValues?.qty || p.qty) || 0,
        value: canSeeFinance ? (parseFloat(p.dataValues?.value || p.value) || 0) : 0
      })),
      rankingFranquias: rankingFranquias.map(f => ({
        nome: f.loja?.nome || 'Loja',
        qty: parseInt(f.dataValues?.qty || f.qty) || 0,
        value: canSeeFinance ? (parseFloat(f.dataValues?.value || f.value) || 0) : 0
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar rankings:', error);
    res.status(500).json({ error: 'Erro ao gerar rankings' });
  }
});

router.get('/low-movers', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin;
    
    // Security: non-admins can only access their own store data
    let loja_id;
    if (isAdmin) {
      loja_id = storeId || null;
    } else {
      loja_id = req.user.loja_id;
    }
    
    const whereVenda = {
      data_venda: { [Op.between]: [inicio, fim] },
      status: 'CONCLUIDA'
    };
    if (!isAdmin && loja_id) whereVenda.loja_id = loja_id;
    
    const vendasIds = await Sale.findAll({
      where: whereVenda,
      attributes: ['id'],
      raw: true
    });
    const ids = vendasIds.map(v => v.id);
    
    const produtosVendidos = ids.length > 0 
      ? await SaleItem.findAll({
          where: { venda_id: { [Op.in]: ids } },
          attributes: ['produto_id'],
          group: ['produto_id'],
          raw: true
        })
      : [];
    
    const produtosVendidosIds = produtosVendidos.map(p => p.produto_id);
    
    const produtosSemVenda = await Product.findAll({
      where: {
        ativo: true,
        id: { [Op.notIn]: produtosVendidosIds.length > 0 ? produtosVendidosIds : [0] }
      },
      attributes: ['id', 'nome', 'tipo', 'preco_venda'],
      limit: 20
    });
    
    let estoque;
    if (isAdmin) {
      estoque = await InventoryMain.findAll({
        where: { produto_id: { [Op.in]: produtosSemVenda.map(p => p.id) } },
        attributes: ['produto_id', 'quantidade'],
        raw: true
      });
    } else {
      estoque = await InventoryStore.findAll({
        where: { 
          loja_id,
          produto_id: { [Op.in]: produtosSemVenda.map(p => p.id) }
        },
        attributes: ['produto_id', 'quantidade'],
        raw: true
      });
    }
    
    const estoqueMap = {};
    estoque.forEach(e => { estoqueMap[e.produto_id] = e.quantidade; });
    
    const ultimasVendas = await SaleItem.findAll({
      where: { produto_id: { [Op.in]: produtosSemVenda.map(p => p.id) } },
      include: [{
        model: Sale,
        where: { status: 'CONCLUIDA' },
        attributes: ['data_venda']
      }],
      attributes: ['produto_id'],
      order: [[Sale, 'data_venda', 'DESC']],
      raw: true
    });
    
    const ultimaVendaMap = {};
    ultimasVendas.forEach(v => {
      if (!ultimaVendaMap[v.produto_id]) {
        ultimaVendaMap[v.produto_id] = v['Sale.data_venda'];
      }
    });
    
    const hoje = new Date();
    const calcularDiasParado = (produtoId) => {
      const ultimaVenda = ultimaVendaMap[produtoId];
      if (!ultimaVenda) return null;
      const diff = Math.floor((hoje - new Date(ultimaVenda)) / (1000 * 60 * 60 * 24));
      return diff;
    };
    
    res.json({
      semVenda: produtosSemVenda.map(p => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        preco: p.preco_venda,
        estoque: estoqueMap[p.id] || 0,
        diasParado: calcularDiasParado(p.id)
      })),
      parados30dias: produtosSemVenda.filter(p => estoqueMap[p.id] > 0).slice(0, 10).map(p => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        estoque: estoqueMap[p.id] || 0,
        diasParado: calcularDiasParado(p.id)
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar low-movers:', error);
    res.status(500).json({ error: 'Erro ao gerar produtos parados' });
  }
});

router.get('/global', hasDashboardGlobalAccess, async (req, res) => {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [
      totalVendasMes,
      totalOSMes,
      totalReceber,
      totalPagar,
      produtosAtivos,
      clientesAtivos,
      lojas
    ] = await Promise.all([
      Sale.sum('total', {
        where: {
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [inicioMes, fimMes] }
        }
      }),
      ServiceOrder.sum('total', {
        where: {
          status: 'CONCLUIDA',
          data_conclusao: { [Op.between]: [inicioMes, fimMes] }
        }
      }),
      PaymentReceivable.sum('valor', {
        where: { status: { [Op.ne]: 'PAGO' } }
      }),
      PaymentPayable.sum('valor', {
        where: { status: { [Op.ne]: 'PAGO' } }
      }),
      Product.count({ where: { ativo: true } }),
      Customer.count({ where: { ativo: true } }),
      Store.findAll({
        include: [{
          model: Sale,
          where: { data_venda: { [Op.between]: [inicioMes, fimMes] } },
          required: false
        }]
      })
    ]);

    const vendasPorLoja = await Sale.findAll({
      where: {
        status: 'CONCLUIDA',
        data_venda: { [Op.between]: [inicioMes, fimMes] }
      },
      attributes: [
        'loja_id',
        [sequelize.fn('SUM', sequelize.col('Sale.total')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'quantidade']
      ],
      group: ['Sale.loja_id', 'loja.id', 'loja.nome'],
      include: [{ model: Store, as: 'loja', attributes: ['nome'] }]
    });

    const vendasUltimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
      
      const total = await Sale.sum('total', {
        where: {
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [mes, fimDoMes] }
        }
      });

      vendasUltimos6Meses.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total: total || 0
      });
    }

    const ultimasVendas = await Sale.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        { model: Store, as: 'loja', attributes: ['nome'] },
        { model: Customer, as: 'cliente', attributes: ['nome'] },
        { model: Vendor, as: 'vendedor', attributes: ['nome'] }
      ]
    });

    const ultimasOS = await ServiceOrder.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        { model: Store, as: 'loja', attributes: ['nome'] },
        { model: Customer, as: 'cliente', attributes: ['nome'] }
      ]
    });

    const ultimosRecebimentos = await PaymentReceivable.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: Customer, as: 'cliente', attributes: ['nome'] }]
    });

    const ultimosPagamentos = await PaymentPayable.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const movimentacoesEstoque = await InventoryMovement.findAll({
      order: [['createdAt', 'DESC']],
      limit: 15,
      include: [{ model: Product, as: 'produto', attributes: ['nome', 'codigo'] }]
    });

    const fluxoCaixaUltimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
      
      const [entradas, saidas] = await Promise.all([
        PaymentReceivable.sum('valor', {
          where: {
            status: 'PAGO',
            data_pagamento: { [Op.between]: [mes, fimDoMes] }
          }
        }),
        PaymentPayable.sum('valor', {
          where: {
            status: 'PAGO',
            data_pagamento: { [Op.between]: [mes, fimDoMes] }
          }
        })
      ]);

      fluxoCaixaUltimos6Meses.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        entradas: entradas || 0,
        saidas: saidas || 0,
        saldo: (entradas || 0) - (saidas || 0)
      });
    }

    const receberVencido = await PaymentReceivable.sum('valor', {
      where: { 
        status: { [Op.ne]: 'PAGO' },
        data_vencimento: { [Op.lt]: hoje }
      }
    });

    const pagarVencido = await PaymentPayable.sum('valor', {
      where: { 
        status: { [Op.ne]: 'PAGO' },
        data_vencimento: { [Op.lt]: hoje }
      }
    });

    const saldoAtual = (totalReceber || 0) - (totalPagar || 0);

    res.json({
      totalVendasMes: totalVendasMes || 0,
      totalOSMes: totalOSMes || 0,
      totalReceber: totalReceber || 0,
      totalPagar: totalPagar || 0,
      receberVencido: receberVencido || 0,
      pagarVencido: pagarVencido || 0,
      saldoAtual,
      produtosAtivos,
      clientesAtivos,
      vendasPorLoja,
      vendasUltimos6Meses,
      fluxoCaixaUltimos6Meses,
      ultimasVendas,
      ultimasOS,
      ultimosRecebimentos,
      ultimosPagamentos,
      movimentacoesEstoque
    });
  } catch (error) {
    console.error('Erro ao gerar dashboard global:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
});

router.get('/loja', filterByStore, async (req, res) => {
  try {
    const loja_id = req.user.loja_id;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const inicioDia = new Date(hoje.setHours(0, 0, 0, 0));
    const fimDia = new Date(hoje.setHours(23, 59, 59, 999));

    const [
      vendasHoje,
      vendasMes,
      osAbertas,
      osEmExecucao,
      totalReceber,
      totalPagar,
      produtosBaixoEstoque
    ] = await Promise.all([
      Sale.sum('total', {
        where: {
          loja_id,
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [inicioDia, fimDia] }
        }
      }),
      Sale.sum('total', {
        where: {
          loja_id,
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [inicioMes, fimMes] }
        }
      }),
      ServiceOrder.count({
        where: { loja_id, status: 'ABERTA' }
      }),
      ServiceOrder.count({
        where: { loja_id, status: 'EM_EXECUCAO' }
      }),
      PaymentReceivable.sum('valor', {
        where: { loja_id, status: { [Op.ne]: 'PAGO' } }
      }),
      PaymentPayable.sum('valor', {
        where: { loja_id, status: { [Op.ne]: 'PAGO' } }
      }),
      InventoryStore.count({
        where: {
          loja_id,
          quantidade: { [Op.lte]: sequelize.col('quantidade') }
        }
      })
    ]);

    const vendasPendentes = await Sale.count({
      where: { loja_id, status: 'PENDENTE' }
    });

    const orcamentosPendentes = await Sale.count({
      where: { loja_id, status: 'ORCAMENTO' }
    });

    res.json({
      vendasHoje: vendasHoje || 0,
      vendasMes: vendasMes || 0,
      osAbertas,
      osEmExecucao,
      totalReceber: totalReceber || 0,
      totalPagar: totalPagar || 0,
      produtosBaixoEstoque,
      vendasPendentes,
      orcamentosPendentes
    });
  } catch (error) {
    console.error('Erro ao gerar dashboard da loja:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
});

router.get('/franchise-ranking', async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;
    const { inicio, fim } = getDateRange(range);
    
    const allowedRoles = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'];
    const userRoles = req.user.roleCodes || [req.user.perfil];
    const hasAccess = userRoles.some(r => allowedRoles.includes(r)) || req.user.perfil === 'ADMIN_GLOBAL';
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const stores = await Store.findAll({
      where: { codigo: { [Op.ne]: 'TMI-001' } },
      attributes: ['id', 'nome', 'cidade']
    });
    
    const rankings = await Promise.all(stores.map(async (store) => {
      const [vendasCount, vendasValue, osCount, osValue, estoqueBaixo, estoqueSem] = await Promise.all([
        Sale.count({
          where: {
            loja_id: store.id,
            data_venda: { [Op.between]: [inicio, fim] },
            status: 'CONCLUIDA'
          }
        }),
        Sale.sum('total', {
          where: {
            loja_id: store.id,
            data_venda: { [Op.between]: [inicio, fim] },
            status: 'CONCLUIDA'
          }
        }),
        ServiceOrder.count({
          where: {
            loja_id: store.id,
            createdAt: { [Op.between]: [inicio, fim] }
          }
        }),
        ServiceOrder.sum('total', {
          where: {
            loja_id: store.id,
            createdAt: { [Op.between]: [inicio, fim] }
          }
        }),
        InventoryStore.count({
          where: {
            loja_id: store.id,
            quantidade: { [Op.between]: [1, 2] }
          }
        }),
        InventoryStore.count({
          where: {
            loja_id: store.id,
            quantidade: 0
          }
        })
      ]);
      
      const score = (vendasValue || 0) + (osValue || 0);
      const attentionScore = (estoqueBaixo * 10) + (estoqueSem * 20) - (vendasCount * 5);
      
      return {
        id: store.id,
        nome: store.nome,
        cidade: store.cidade || '',
        vendas_count: vendasCount || 0,
        vendas_value: vendasValue || 0,
        os_count: osCount || 0,
        os_value: osValue || 0,
        estoque_baixo: estoqueBaixo || 0,
        estoque_sem: estoqueSem || 0,
        score,
        attention_score: attentionScore
      };
    }));
    
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => r.ranking = i + 1);
    
    const rankingsWithAttention = [...rankings].sort((a, b) => b.attention_score - a.attention_score);
    rankingsWithAttention.forEach((r, i) => r.attention_priority = i + 1);
    
    res.json(rankings.map(r => ({
      ...r,
      attention_priority: rankingsWithAttention.find(ra => ra.id === r.id).attention_priority
    })));
  } catch (error) {
    console.error('Erro ao gerar ranking de franquias:', error);
    res.status(500).json({ error: 'Erro ao gerar ranking' });
  }
});

router.get('/central-inventory-stats', async (req, res) => {
  try {
    const allowedRoles = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'];
    const userRoles = req.user.roleCodes || [req.user.perfil];
    const hasAccess = userRoles.some(r => allowedRoles.includes(r)) || req.user.perfil === 'ADMIN_GLOBAL';
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { range = 'monthly' } = req.query;
    const { inicio, fim } = getDateRange(range);
    
    const estoqueComProdutos = await InventoryMain.findAll({
      include: [{
        model: Product,
        as: 'produto',
        attributes: ['id', 'nome', 'tipo', 'preco_venda', 'preco_custo']
      }],
      where: { quantidade: { [Op.gt]: 0 } }
    });
    
    let valorTotalEstoque = 0;
    let valorTotalCusto = 0;
    let qtdTotalItens = 0;
    
    estoqueComProdutos.forEach(e => {
      const precoVenda = parseFloat(e.produto?.preco_venda || 0);
      const precoCusto = parseFloat(e.produto?.preco_custo || 0);
      valorTotalEstoque += e.quantidade * precoVenda;
      valorTotalCusto += e.quantidade * precoCusto;
      qtdTotalItens += e.quantidade;
    });
    
    const vendasPeriodo = await Sale.findAll({
      where: {
        status: 'CONCLUIDA',
        data_venda: { [Op.between]: [inicio, fim] }
      },
      attributes: ['id', 'total', 'data_venda']
    });
    
    const totalVendasValor = vendasPeriodo.reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
    const totalVendasQty = vendasPeriodo.length;
    
    const diasNoPeriodo = Math.max(1, Math.ceil((new Date(fim) - new Date(inicio)) / (1000 * 60 * 60 * 24)));
    const mediaDiariaVendas = totalVendasValor / diasNoPeriodo;
    const mediaDiariaQty = totalVendasQty / diasNoPeriodo;
    
    const diasEstoqueParado = valorTotalEstoque > 0 && mediaDiariaVendas > 0 
      ? Math.round(valorTotalEstoque / mediaDiariaVendas) 
      : 0;
    
    res.json({
      valorTotalEstoque,
      valorTotalCusto,
      qtdTotalItens,
      qtdProdutosDiferentes: estoqueComProdutos.length,
      totalVendasPeriodo: totalVendasValor,
      qtdVendasPeriodo: totalVendasQty,
      mediaDiariaVendas,
      mediaDiariaQty,
      diasEstoqueParado,
      margemPotencial: valorTotalEstoque - valorTotalCusto
    });
  } catch (error) {
    console.error('Erro ao calcular estatísticas do estoque central:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

router.get('/tipo-dashboard', async (req, res) => {
  const user = req.user;
  const roleCodes = user.roleCodes || [];
  
  let tipo = 'operacional';
  let redirecionar = '/app/dashboard/operacional';
  
  if (user.isAdmin || roleCodes.includes('ADMIN_GLOBAL')) {
    tipo = 'global';
    redirecionar = '/app/dashboard';
  } else if (roleCodes.includes('GESTOR_DASHBOARD')) {
    tipo = 'global';
    redirecionar = '/app/dashboard';
  } else if (roleCodes.includes('FINANCEIRO')) {
    tipo = 'financeiro';
    redirecionar = '/app/dashboard/financeiro';
  } else if (roleCodes.includes('FRANQUEADO_GESTOR')) {
    tipo = 'loja';
    redirecionar = '/app/dashboard';
  } else if (roleCodes.includes('GERENTE_OP')) {
    tipo = 'operacional';
    redirecionar = '/app/dashboard/operacional';
  } else if (['GERENTE_LOJA', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA'].some(r => roleCodes.includes(r))) {
    tipo = 'operacional';
    redirecionar = '/app/dashboard/operacional';
  } else if (['VENDEDOR_TMI', 'VENDEDOR_LOJA'].some(r => roleCodes.includes(r))) {
    tipo = 'vendedor';
    redirecionar = '/app/meu-dashboard';
  }
  
  res.json({ tipo, redirecionar, roleCodes });
});

router.get('/global-data', hasDashboardGlobalAccess, async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;
    const { inicio, fim } = getDateRange(range);
    
    const [vendas, os, receber, pagar, estoqueBaixo, lojas] = await Promise.all([
      Sale.findAll({
        where: { data_venda: { [Op.between]: [inicio, fim] }, status: 'CONCLUIDA' },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('total')), 'value']
        ],
        raw: true
      }),
      ServiceOrder.findAll({
        where: { createdAt: { [Op.between]: [inicio, fim] } },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('total')), 'value']
        ],
        group: ['status'],
        raw: true
      }),
      PaymentReceivable.findAll({
        attributes: [
          'status',
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        group: ['status'],
        raw: true
      }),
      PaymentPayable.findAll({
        attributes: [
          'status',
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        group: ['status'],
        raw: true
      }),
      InventoryMain.count({ where: { quantidade: { [Op.lte]: 2, [Op.gt]: 0 } } }),
      Store.count({ where: { ativo: true } })
    ]);
    
    res.json({
      vendas: vendas[0] || { qty: 0, value: 0 },
      os,
      receber,
      pagar,
      estoqueBaixo,
      totalLojas: lojas
    });
  } catch (error) {
    console.error('Erro no dashboard global:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard global' });
  }
});

router.get('/operacional-data', hasDashboardOperacionalAccess, async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.isAdmin;
    const loja_id = isAdmin ? null : req.user.loja_id;
    
    const whereBase = loja_id ? { loja_id } : {};
    
    const [os, pedidos, estoque] = await Promise.all([
      ServiceOrder.findAll({
        where: { ...whereBase, createdAt: { [Op.between]: [inicio, fim] } },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty']
        ],
        group: ['status'],
        raw: true
      }),
      PurchaseRequest.findAll({
        where: { ...whereBase },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty']
        ],
        group: ['status'],
        raw: true
      }),
      isAdmin 
        ? InventoryMain.count({ where: { quantidade: { [Op.lte]: 2, [Op.gt]: 0 } } })
        : InventoryStore.count({ where: { ...whereBase, quantidade: { [Op.lte]: 2, [Op.gt]: 0 } } })
    ]);
    
    res.json({ os, pedidos, estoqueBaixo: estoque });
  } catch (error) {
    console.error('Erro no dashboard operacional:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard operacional' });
  }
});

router.get('/financeiro-data', hasDashboardFinanceiroAccess, async (req, res) => {
  try {
    const { range = 'monthly' } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.isAdmin;
    const loja_id = isAdmin ? null : req.user.loja_id;
    
    const whereBase = loja_id ? { loja_id } : {};
    const whereData = { data_vencimento: { [Op.between]: [inicio, fim] } };
    
    const [receber, pagar, vendas] = await Promise.all([
      PaymentReceivable.findAll({
        where: { ...whereBase },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        group: ['status'],
        raw: true
      }),
      PaymentPayable.findAll({
        where: { ...whereBase },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'qty'],
          [sequelize.fn('SUM', sequelize.col('valor')), 'value']
        ],
        group: ['status'],
        raw: true
      }),
      Sale.findAll({
        where: { ...whereBase, data_venda: { [Op.between]: [inicio, fim] }, status: 'CONCLUIDA' },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')), 'faturamento']
        ],
        raw: true
      })
    ]);
    
    res.json({
      receber,
      pagar,
      faturamento: vendas[0]?.faturamento || 0
    });
  } catch (error) {
    console.error('Erro no dashboard financeiro:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard financeiro' });
  }
});

module.exports = router;
