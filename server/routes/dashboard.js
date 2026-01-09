const express = require('express');
const router = express.Router();
const { Sale, ServiceOrder, Product, Customer, PaymentReceivable, PaymentPayable, InventoryStore, InventoryMain, InventoryMovement, Store, Vendor, SaleItem, PurchaseRequest, sequelize } = require('../models');
const { verifyToken, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);

function getDateRange(range) {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  let inicio;
  
  switch(range) {
    case 'weekly':
      inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 7);
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
  const roles = user.roles || [];
  const roleNames = roles.map(r => r.nome);
  
  if (perfil === 'ADMIN_GLOBAL' || roleNames.includes('ADMIN_GLOBAL')) return true;
  if (roleNames.includes('GESTOR_DASHBOARD') || roleNames.includes('GERENTE_OP')) return dashboardType === 'global';
  if (roleNames.includes('FRANQUEADO_GESTOR')) return dashboardType === 'loja';
  if (roleNames.includes('GERENTE_LOJA')) return dashboardType === 'loja_restrito';
  if (roleNames.includes('VENDEDOR_LOJA') || roleNames.includes('VENDEDOR_TMI')) return dashboardType === 'vendedor';
  if (['ADM1', 'ADM2', 'ADM3'].some(r => roleNames.includes(r))) return false;
  
  if (perfil === 'GESTOR_FRANQUIA') return dashboardType === 'loja';
  if (perfil === 'OPERACIONAL') return dashboardType === 'vendedor';
  
  return false;
}

router.get('/summary', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL';
    const loja_id = storeId || req.user.loja_id;
    
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
    
    const [vendas, osAbertas, osFechadas, estoqueBaixo, estoqueSemEstoque, pedidos] = await Promise.all([
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
      })
    ]);
    
    const pedidosMap = {};
    pedidos.forEach(p => { pedidosMap[p.status] = parseInt(p.count) || 0; });
    
    res.json({
      range,
      vendas: {
        total_qty: parseInt(vendas[0]?.qty) || 0,
        total_value: parseFloat(vendas[0]?.value) || 0
      },
      os: {
        open_qty: parseInt(osAbertas[0]?.qty) || 0,
        open_value: parseFloat(osAbertas[0]?.value) || 0,
        closed_qty: parseInt(osFechadas[0]?.qty) || 0,
        closed_value: parseFloat(osFechadas[0]?.value) || 0
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
    });
  } catch (error) {
    console.error('Erro ao gerar summary:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo do dashboard' });
  }
});

router.get('/charts', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL';
    const loja_id = storeId || req.user.loja_id;
    
    const hoje = new Date();
    const diasAtras = range === 'weekly' ? 7 : 30;
    
    const vendasPorDia = [];
    const osPorDia = [];
    
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
    
    res.json({
      vendasPorDia,
      osPorDia,
      pedidosPorStatus
    });
  } catch (error) {
    console.error('Erro ao gerar charts:', error);
    res.status(500).json({ error: 'Erro ao gerar gráficos' });
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const { range = 'monthly', storeId } = req.query;
    const { inicio, fim } = getDateRange(range);
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL';
    const loja_id = storeId || req.user.loja_id;
    
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
        value: parseFloat(p.dataValues?.value || p.value) || 0
      })),
      rankingFranquias: rankingFranquias.map(f => ({
        nome: f.loja?.nome || 'Loja',
        qty: parseInt(f.dataValues?.qty || f.qty) || 0,
        value: parseFloat(f.dataValues?.value || f.value) || 0
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
    const isAdmin = req.user.perfil === 'ADMIN_GLOBAL';
    const loja_id = storeId || req.user.loja_id;
    
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
    
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    res.json({
      semVenda: produtosSemVenda.map(p => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        preco: p.preco_venda,
        estoque: estoqueMap[p.id] || 0
      })),
      parados30dias: produtosSemVenda.filter(p => estoqueMap[p.id] > 0).slice(0, 10).map(p => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        estoque: estoqueMap[p.id] || 0
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar low-movers:', error);
    res.status(500).json({ error: 'Erro ao gerar produtos parados' });
  }
});

router.get('/global', async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN_GLOBAL' && !checkDashboardPermission(req.user, 'global')) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

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

module.exports = router;
