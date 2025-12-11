const express = require('express');
const router = express.Router();
const { Sale, ServiceOrder, Product, Customer, PaymentReceivable, PaymentPayable, InventoryStore, InventoryMain, InventoryMovement, Store, Vendor, sequelize } = require('../models');
const { verifyToken, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);

router.get('/global', async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
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
        [sequelize.fn('SUM', sequelize.col('total')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'quantidade']
      ],
      group: ['loja_id'],
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
