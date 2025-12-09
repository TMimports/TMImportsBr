const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isAuthenticated } = require('../middleware/auth');
const { Venda, ItemVenda, Produto, Usuario, Estoque, Subestoque, ItemEstoque, OrdemServico, Orcamento } = require('../models');

function isVendedor(req, res, next) {
  if (req.session && req.session.user && req.session.user.perfil === 'VENDEDOR') {
    return next();
  }
  res.redirect('/login');
}

router.get('/dashboard', isVendedor, async (req, res) => {
  try {
    const vendedorId = req.session.user.id;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const vendasMes = await Venda.findAll({
      where: {
        vendedor_id: vendedorId,
        data_venda: { [Op.between]: [inicioMes, fimMes] }
      }
    });

    const totalVendasMes = vendasMes.filter(v => v.status === 'CONCLUIDA').length;
    const valorTotalMes = vendasMes.filter(v => v.status === 'CONCLUIDA').reduce((sum, v) => sum + parseFloat(v.valor_total || 0), 0);
    const vendasPendentes = vendasMes.filter(v => v.status === 'PENDENTE').length;
    const vendasAprovadas = vendasMes.filter(v => v.status === 'APROVADA').length;

    const vendasPorDia = [];
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const inicioDia = new Date(dia.setHours(0, 0, 0, 0));
      const fimDia = new Date(dia.setHours(23, 59, 59, 999));
      
      const vendasDia = await Venda.count({
        where: {
          vendedor_id: vendedorId,
          status: 'CONCLUIDA',
          data_venda: { [Op.between]: [inicioDia, fimDia] }
        }
      });
      vendasPorDia.push({
        dia: inicioDia.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        total: vendasDia
      });
    }

    const ultimasVendas = await Venda.findAll({
      where: { vendedor_id: vendedorId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: ItemVenda, include: [{ model: Produto }] }]
    });

    const ordensServico = await OrdemServico.count({
      where: { vendedor_id: vendedorId }
    });
    
    const osAbertas = await OrdemServico.count({
      where: { vendedor_id: vendedorId, status: { [Op.in]: ['ABERTA', 'EM_EXECUCAO'] } }
    });
    
    const orcamentosAtivos = await Orcamento.count({
      where: { vendedor_id: vendedorId, status: { [Op.in]: ['RASCUNHO', 'ENVIADO'] } }
    });

    res.render('vendedor/dashboard', {
      user: req.session.user,
      totalVendasMes,
      valorTotalMes,
      vendasPendentes,
      vendasAprovadas,
      ultimasVendas,
      vendasPorDia: JSON.stringify(vendasPorDia),
      ordensServico,
      osAbertas,
      orcamentosAtivos
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.render('error', { message: 'Erro ao carregar dashboard.', user: req.session.user });
  }
});

router.get('/estoque', isVendedor, async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereItem = { ativo: true };
    if (search) {
      const produtos = await Produto.findAll({
        where: {
          [Op.or]: [
            { nome_modelo: { [Op.like]: `%${search}%` } },
            { nome_produto: { [Op.like]: `%${search}%` } },
            { cor: { [Op.like]: `%${search}%` } }
          ]
        }
      });
      whereItem.produto_id = { [Op.in]: produtos.map(p => p.id) };
    }

    const itensEstoque = await ItemEstoque.findAll({
      where: whereItem,
      include: [
        { model: Produto },
        { model: Estoque },
        { model: Subestoque }
      ],
      order: [['quantidade', 'DESC']]
    });

    res.render('vendedor/estoque', {
      user: req.session.user,
      itensEstoque,
      search
    });
  } catch (error) {
    console.error('Vendor stock error:', error);
    res.render('error', { message: 'Erro ao carregar estoque.', user: req.session.user });
  }
});

module.exports = router;
