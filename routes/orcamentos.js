const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const { Orcamento, ItemOrcamento, Venda, OrdemServico, Produto, Usuario } = require('../models');
const { Op } = require('sequelize');

const canAccessOrcamento = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'];
  if (!allowedRoles.includes(req.session.user.perfil)) {
    return res.status(403).render('error', { message: 'Acesso negado', user: req.session.user });
  }
  next();
};

router.get('/', canAccessOrcamento, async (req, res) => {
  try {
    const { search, status, origem_tipo, data_inicio, data_fim } = req.query;
    
    let where = {};
    
    if (req.session.user.perfil === 'VENDEDOR') {
      where.vendedor_id = req.session.user.id;
    }
    
    if (search) {
      where[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { cliente_nome: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (origem_tipo) {
      where.origem_tipo = origem_tipo;
    }
    
    if (data_inicio && data_fim) {
      where.data_emissao = {
        [Op.between]: [new Date(data_inicio), new Date(data_fim + 'T23:59:59')]
      };
    }
    
    const now = new Date();
    await Orcamento.update(
      { status: 'EXPIRADO' },
      { where: { status: { [Op.in]: ['RASCUNHO', 'ENVIADO'] }, data_validade: { [Op.lt]: now } } }
    );
    
    const orcamentos = await Orcamento.findAll({
      where,
      include: [{ model: Usuario, as: 'vendedor', attributes: ['nome'] }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('orcamentos/index', { 
      orcamentos, 
      user: req.session.user,
      filters: { search, status, origem_tipo, data_inicio, data_fim }
    });
  } catch (error) {
    console.error('Orcamentos list error:', error);
    res.render('error', { message: 'Erro ao listar orçamentos', user: req.session.user });
  }
});

router.get('/:id', canAccessOrcamento, async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: ItemOrcamento, as: 'itens', include: [{ model: Produto }] }
      ]
    });
    
    if (!orcamento) {
      return res.render('error', { message: 'Orçamento não encontrado', user: req.session.user });
    }
    
    if (req.session.user.perfil === 'VENDEDOR' && orcamento.vendedor_id !== req.session.user.id) {
      return res.status(403).render('error', { message: 'Acesso negado', user: req.session.user });
    }
    
    const now = new Date();
    if ((orcamento.status === 'RASCUNHO' || orcamento.status === 'ENVIADO') && orcamento.data_validade < now) {
      await orcamento.update({ status: 'EXPIRADO' });
      orcamento.status = 'EXPIRADO';
    }
    
    res.render('orcamentos/show', { 
      orcamento, 
      user: req.session.user,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('Orcamento detail error:', error);
    res.render('error', { message: 'Erro ao carregar orçamento', user: req.session.user });
  }
});

router.get('/:id/imprimir', canAccessOrcamento, async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome', 'email'] },
        { model: ItemOrcamento, as: 'itens', include: [{ model: Produto }] }
      ]
    });
    
    if (!orcamento) {
      return res.render('error', { message: 'Orçamento não encontrado', user: req.session.user });
    }
    
    res.render('orcamentos/imprimir', { 
      orcamento, 
      user: req.session.user
    });
  } catch (error) {
    console.error('Print quotation error:', error);
    res.render('error', { message: 'Erro ao imprimir orçamento', user: req.session.user });
  }
});

router.post('/:id/enviar', canAccessOrcamento, async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    
    if (!orcamento) {
      return res.redirect('/orcamentos?error=1');
    }
    
    if (orcamento.status !== 'RASCUNHO') {
      return res.redirect('/orcamentos/' + orcamento.id);
    }
    
    await orcamento.update({ status: 'ENVIADO' });
    
    res.redirect('/orcamentos/' + orcamento.id);
  } catch (error) {
    console.error('Send quotation error:', error);
    res.redirect('/orcamentos/' + req.params.id + '?error=1');
  }
});

router.post('/:id/aprovar', isSuperAdmin, async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    
    if (!orcamento) {
      return res.redirect('/orcamentos?error=1');
    }
    
    const now = new Date();
    if (orcamento.data_validade < now) {
      await orcamento.update({ status: 'EXPIRADO' });
      return res.redirect('/orcamentos/' + orcamento.id + '?error=expirado');
    }
    
    await orcamento.update({ 
      status: 'APROVADO',
      aprovado_em: now,
      aprovado_por: req.session.user.nome
    });
    
    if (orcamento.origem_tipo === 'ORDEM_SERVICO') {
      await OrdemServico.update(
        { status: 'APROVADA' },
        { where: { id: orcamento.origem_id } }
      );
    } else if (orcamento.origem_tipo === 'VENDA') {
      await Venda.update(
        { status: 'APROVADA' },
        { where: { id: orcamento.origem_id } }
      );
    }
    
    res.redirect('/orcamentos/' + orcamento.id);
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.redirect('/orcamentos/' + req.params.id + '?error=1');
  }
});

router.post('/:id/cancelar', canAccessOrcamento, async (req, res) => {
  try {
    const orcamento = await Orcamento.findByPk(req.params.id);
    
    if (!orcamento) {
      return res.redirect('/orcamentos?error=1');
    }
    
    await orcamento.update({ status: 'CANCELADO' });
    
    res.redirect('/orcamentos/' + orcamento.id);
  } catch (error) {
    console.error('Cancel quotation error:', error);
    res.redirect('/orcamentos/' + req.params.id + '?error=1');
  }
});

module.exports = router;
