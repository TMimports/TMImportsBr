const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isSuperAdmin } = require('../middleware/auth');
const { 
  Venda, ContaReceber, ContaPagar, ItemEstoque, Produto, 
  Usuario, ItemVenda, Estoque 
} = require('../models');

router.get('/', isSuperAdmin, async (req, res) => {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const vendasMes = await Venda.findAll({
      where: {
        status: 'CONCLUIDA',
        data_venda: { [Op.between]: [inicioMes, fimMes] }
      }
    });
    const totalVendasMes = vendasMes.reduce((sum, v) => sum + parseFloat(v.valor_total || 0), 0);

    const contasReceberAberto = await ContaReceber.findAll({
      where: { status: 'EM_ABERTO', arquivado: false }
    });
    const totalReceberAberto = contasReceberAberto.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);

    const contasPagarPendentes = await ContaPagar.findAll({
      where: { status: 'PENDENTE', arquivado: false }
    });
    const totalPagarPendente = contasPagarPendentes.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);

    const saldoEstimado = totalReceberAberto - totalPagarPendente;

    const vendasPendentes = await Venda.count({
      where: { status: 'PENDENTE' }
    });

    const itensEstoqueBaixo = await ItemEstoque.findAll({
      where: {
        ativo: true
      },
      include: [{ model: Produto }]
    });
    const estoqueCritico = itensEstoqueBaixo.filter(i => i.quantidade <= i.quantidade_minima);

    const ultimasVendas = await Venda.findAll({
      where: { status: 'CONCLUIDA' },
      order: [['data_venda', 'DESC']],
      limit: 5,
      include: [{ model: Usuario, as: 'vendedor' }]
    });

    const proximasContasPagar = await ContaPagar.findAll({
      where: { 
        status: 'PENDENTE',
        arquivado: false,
        data_vencimento: { [Op.gte]: hoje }
      },
      order: [['data_vencimento', 'ASC']],
      limit: 5
    });

    const proximasContasReceber = await ContaReceber.findAll({
      where: { 
        status: 'EM_ABERTO',
        arquivado: false,
        data_vencimento: { [Op.gte]: hoje }
      },
      order: [['data_vencimento', 'ASC']],
      limit: 5
    });

    const vendasPorDia = [];
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const inicioDia = new Date(dia.setHours(0, 0, 0, 0));
      const fimDia = new Date(dia.setHours(23, 59, 59, 999));
      
      const vendasDia = await Venda.findAll({
        where: {
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [inicioDia, fimDia] }
        }
      });
      const totalDia = vendasDia.reduce((sum, v) => sum + parseFloat(v.valor_total || 0), 0);
      vendasPorDia.push({
        dia: inicioDia.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        total: totalDia
      });
    }

    const vendasPorTipo = await ItemVenda.findAll({
      include: [{
        model: Produto,
        attributes: ['tipo']
      }, {
        model: Venda,
        where: { status: 'CONCLUIDA' }
      }]
    });

    const composicaoFaturamento = { MOTO: 0, SCOOTER: 0, PECA: 0, SERVICO: 0 };
    vendasPorTipo.forEach(item => {
      if (item.Produto && item.Produto.tipo) {
        composicaoFaturamento[item.Produto.tipo] += parseFloat(item.preco_unitario) * item.quantidade;
      }
    });

    const projecaoCaixa = [];
    let saldoProjetado = saldoEstimado;
    for (let i = 0; i < 6; i++) {
      const mesProjecao = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const fimMesProjecao = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0);
      
      const receberMes = await ContaReceber.findAll({
        where: {
          status: 'EM_ABERTO',
          arquivado: false,
          data_vencimento: { [Op.between]: [mesProjecao, fimMesProjecao] }
        }
      });
      const pagarMes = await ContaPagar.findAll({
        where: {
          status: 'PENDENTE',
          arquivado: false,
          data_vencimento: { [Op.between]: [mesProjecao, fimMesProjecao] }
        }
      });
      
      const entradas = receberMes.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
      const saidas = pagarMes.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
      saldoProjetado += entradas - saidas;
      
      projecaoCaixa.push({
        mes: mesProjecao.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        saldo: saldoProjetado
      });
    }

    res.render('dashboard/index', {
      user: req.session.user,
      saldoEstimado,
      totalVendasMes,
      totalReceberAberto,
      totalPagarPendente,
      vendasPendentes,
      estoqueCritico,
      ultimasVendas,
      proximasContasPagar,
      proximasContasReceber,
      vendasPorDia: JSON.stringify(vendasPorDia),
      composicaoFaturamento: JSON.stringify(composicaoFaturamento),
      projecaoCaixa: JSON.stringify(projecaoCaixa),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { message: 'Erro ao carregar dashboard.', user: req.session.user });
  }
});

module.exports = router;
