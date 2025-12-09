const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const { OrdemServico, ItemOrdemServico, Orcamento, ItemOrcamento, Produto, Usuario, Estoque, ItemEstoque } = require('../models');
const { Op } = require('sequelize');

const canAccessOS = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'];
  if (!allowedRoles.includes(req.session.user.perfil)) {
    return res.status(403).render('error', { message: 'Acesso negado', user: req.session.user });
  }
  next();
};

router.get('/', canAccessOS, async (req, res) => {
  try {
    const { search, status, data_inicio, data_fim } = req.query;
    
    let where = {};
    
    if (req.session.user.perfil === 'VENDEDOR') {
      where.vendedor_id = req.session.user.id;
    }
    
    if (search) {
      where[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { cliente_nome: { [Op.like]: `%${search}%` } },
        { veiculo_placa: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (data_inicio && data_fim) {
      where.data_entrada = {
        [Op.between]: [new Date(data_inicio), new Date(data_fim + 'T23:59:59')]
      };
    }
    
    const ordensServico = await OrdemServico.findAll({
      where,
      include: [{ model: Usuario, as: 'vendedor', attributes: ['nome'] }],
      order: [['createdAt', 'DESC']]
    });
    
    res.render('os/index', { 
      ordensServico, 
      user: req.session.user,
      filters: { search, status, data_inicio, data_fim }
    });
  } catch (error) {
    console.error('OS list error:', error);
    res.render('error', { message: 'Erro ao listar ordens de serviço', user: req.session.user });
  }
});

router.get('/nova', canAccessOS, async (req, res) => {
  try {
    const produtos = await Produto.findAll({ 
      where: { ativo: true },
      order: [['nome_modelo', 'ASC'], ['nome_produto', 'ASC']]
    });
    const tecnicos = await Usuario.findAll({
      where: { perfil: { [Op.in]: ['SUPER_ADMIN', 'ADMIN'] }, ativo: true }
    });
    
    res.render('os/form', { 
      ordemServico: null,
      produtos,
      tecnicos,
      user: req.session.user,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('OS form error:', error);
    res.render('error', { message: 'Erro ao carregar formulário', user: req.session.user });
  }
});

router.post('/', canAccessOS, async (req, res) => {
  try {
    const { 
      cliente_nome, cliente_telefone, cliente_email, cliente_cpf_cnpj, cliente_endereco,
      veiculo_modelo, veiculo_placa, veiculo_chassi, veiculo_cor, veiculo_km,
      descricao_problema, data_prevista_entrega, responsavel_tecnico_id, observacoes,
      itens
    } = req.body;
    
    const ordemServico = await OrdemServico.create({
      cliente_nome,
      cliente_telefone,
      cliente_email,
      cliente_cpf_cnpj,
      cliente_endereco,
      veiculo_modelo,
      veiculo_placa,
      veiculo_chassi,
      veiculo_cor,
      veiculo_km: veiculo_km ? parseInt(veiculo_km) : null,
      descricao_problema,
      data_prevista_entrega: data_prevista_entrega ? new Date(data_prevista_entrega) : null,
      responsavel_tecnico_id: responsavel_tecnico_id || null,
      observacoes,
      vendedor_id: req.session.user.id,
      status: 'ABERTA'
    });
    
    if (itens && Array.isArray(JSON.parse(itens))) {
      const parsedItens = JSON.parse(itens);
      let subtotal = 0;
      let descontoTotal = 0;
      
      for (const item of parsedItens) {
        const totalItem = (parseFloat(item.preco_unitario) * parseInt(item.quantidade)) - parseFloat(item.desconto || 0);
        await ItemOrdemServico.create({
          ordem_servico_id: ordemServico.id,
          produto_id: item.produto_id || null,
          tipo_item: item.tipo_item,
          descricao: item.descricao,
          quantidade: parseInt(item.quantidade),
          preco_unitario: parseFloat(item.preco_unitario),
          desconto: parseFloat(item.desconto || 0),
          total: totalItem
        });
        subtotal += parseFloat(item.preco_unitario) * parseInt(item.quantidade);
        descontoTotal += parseFloat(item.desconto || 0);
      }
      
      await ordemServico.update({
        subtotal,
        desconto_total: descontoTotal,
        total: subtotal - descontoTotal
      });
    }
    
    res.redirect('/ordens-servico/' + ordemServico.id);
  } catch (error) {
    console.error('OS create error:', error);
    res.redirect('/ordens-servico?error=1');
  }
});

router.get('/:id', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: Usuario, as: 'responsavelTecnico', attributes: ['nome'] },
        { model: ItemOrdemServico, as: 'itens', include: [{ model: Produto }] }
      ]
    });
    
    if (!ordemServico) {
      return res.render('error', { message: 'OS não encontrada', user: req.session.user });
    }
    
    if (req.session.user.perfil === 'VENDEDOR' && ordemServico.vendedor_id !== req.session.user.id) {
      return res.status(403).render('error', { message: 'Acesso negado', user: req.session.user });
    }
    
    const orcamento = await Orcamento.findOne({
      where: { origem_tipo: 'ORDEM_SERVICO', origem_id: ordemServico.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.render('os/show', { 
      ordemServico, 
      orcamento,
      user: req.session.user,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('OS detail error:', error);
    res.render('error', { message: 'Erro ao carregar OS', user: req.session.user });
  }
});

router.get('/:id/editar', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id, {
      include: [{ model: ItemOrdemServico, as: 'itens', include: [{ model: Produto }] }]
    });
    
    if (!ordemServico) {
      return res.render('error', { message: 'OS não encontrada', user: req.session.user });
    }
    
    if (ordemServico.status === 'CONCLUIDA' || ordemServico.status === 'CANCELADA') {
      return res.redirect('/ordens-servico/' + ordemServico.id);
    }
    
    const produtos = await Produto.findAll({ 
      where: { ativo: true },
      order: [['nome_modelo', 'ASC'], ['nome_produto', 'ASC']]
    });
    const tecnicos = await Usuario.findAll({
      where: { perfil: { [Op.in]: ['SUPER_ADMIN', 'ADMIN'] }, ativo: true }
    });
    
    res.render('os/form', { 
      ordemServico,
      produtos,
      tecnicos,
      user: req.session.user,
      csrfToken: req.session.csrfToken
    });
  } catch (error) {
    console.error('OS edit form error:', error);
    res.render('error', { message: 'Erro ao carregar formulário', user: req.session.user });
  }
});

router.post('/:id', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id);
    
    if (!ordemServico) {
      return res.redirect('/ordens-servico?error=1');
    }
    
    const { 
      cliente_nome, cliente_telefone, cliente_email, cliente_cpf_cnpj, cliente_endereco,
      veiculo_modelo, veiculo_placa, veiculo_chassi, veiculo_cor, veiculo_km,
      descricao_problema, diagnostico, data_prevista_entrega, responsavel_tecnico_id, 
      observacoes, status, itens
    } = req.body;
    
    await ordemServico.update({
      cliente_nome,
      cliente_telefone,
      cliente_email,
      cliente_cpf_cnpj,
      cliente_endereco,
      veiculo_modelo,
      veiculo_placa,
      veiculo_chassi,
      veiculo_cor,
      veiculo_km: veiculo_km ? parseInt(veiculo_km) : null,
      descricao_problema,
      diagnostico,
      data_prevista_entrega: data_prevista_entrega ? new Date(data_prevista_entrega) : null,
      responsavel_tecnico_id: responsavel_tecnico_id || null,
      observacoes,
      status: status || ordemServico.status
    });
    
    if (itens) {
      await ItemOrdemServico.destroy({ where: { ordem_servico_id: ordemServico.id } });
      
      const parsedItens = JSON.parse(itens);
      let subtotal = 0;
      let descontoTotal = 0;
      
      for (const item of parsedItens) {
        const totalItem = (parseFloat(item.preco_unitario) * parseInt(item.quantidade)) - parseFloat(item.desconto || 0);
        await ItemOrdemServico.create({
          ordem_servico_id: ordemServico.id,
          produto_id: item.produto_id || null,
          tipo_item: item.tipo_item,
          descricao: item.descricao,
          quantidade: parseInt(item.quantidade),
          preco_unitario: parseFloat(item.preco_unitario),
          desconto: parseFloat(item.desconto || 0),
          total: totalItem
        });
        subtotal += parseFloat(item.preco_unitario) * parseInt(item.quantidade);
        descontoTotal += parseFloat(item.desconto || 0);
      }
      
      await ordemServico.update({
        subtotal,
        desconto_total: descontoTotal,
        total: subtotal - descontoTotal
      });
    }
    
    res.redirect('/ordens-servico/' + ordemServico.id);
  } catch (error) {
    console.error('OS update error:', error);
    res.redirect('/ordens-servico/' + req.params.id + '?error=1');
  }
});

router.post('/:id/gerar-orcamento', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id, {
      include: [{ model: ItemOrdemServico, as: 'itens' }]
    });
    
    if (!ordemServico) {
      return res.redirect('/ordens-servico?error=1');
    }
    
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 7);
    
    const orcamento = await Orcamento.create({
      origem_tipo: 'ORDEM_SERVICO',
      origem_id: ordemServico.id,
      cliente_nome: ordemServico.cliente_nome,
      cliente_telefone: ordemServico.cliente_telefone,
      cliente_email: ordemServico.cliente_email,
      cliente_cpf_cnpj: ordemServico.cliente_cpf_cnpj,
      cliente_endereco: ordemServico.cliente_endereco,
      data_validade: dataValidade,
      subtotal: ordemServico.subtotal,
      desconto_total: ordemServico.desconto_total,
      total: ordemServico.total,
      status: 'RASCUNHO',
      vendedor_id: req.session.user.id,
      observacoes: ordemServico.observacoes
    });
    
    for (const item of ordemServico.itens) {
      await ItemOrcamento.create({
        orcamento_id: orcamento.id,
        produto_id: item.produto_id,
        tipo_item: item.tipo_item,
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto: item.desconto,
        total: item.total
      });
    }
    
    await ordemServico.update({ status: 'AGUARDANDO_APROVACAO' });
    
    res.redirect('/orcamentos/' + orcamento.id);
  } catch (error) {
    console.error('Generate quotation error:', error);
    res.redirect('/ordens-servico/' + req.params.id + '?error=1');
  }
});

router.post('/:id/status', isSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const ordemServico = await OrdemServico.findByPk(req.params.id);
    
    if (!ordemServico) {
      return res.redirect('/ordens-servico?error=1');
    }
    
    const updateData = { status };
    
    if (status === 'CONCLUIDA') {
      updateData.data_conclusao = new Date();
      
      const itens = await ItemOrdemServico.findAll({
        where: { ordem_servico_id: ordemServico.id, tipo_item: 'PRODUTO' }
      });
      
      for (const item of itens) {
        if (item.produto_id) {
          const itemEstoque = await ItemEstoque.findOne({
            where: { produto_id: item.produto_id }
          });
          if (itemEstoque && itemEstoque.quantidade >= item.quantidade) {
            await itemEstoque.update({
              quantidade: itemEstoque.quantidade - item.quantidade
            });
          }
        }
      }
    }
    
    await ordemServico.update(updateData);
    
    res.redirect('/ordens-servico/' + ordemServico.id);
  } catch (error) {
    console.error('OS status update error:', error);
    res.redirect('/ordens-servico/' + req.params.id + '?error=1');
  }
});

router.get('/:id/imprimir', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: Usuario, as: 'responsavelTecnico', attributes: ['nome'] },
        { model: ItemOrdemServico, as: 'itens', include: [{ model: Produto }] }
      ]
    });
    
    if (!ordemServico) {
      return res.render('error', { message: 'OS não encontrada', user: req.session.user });
    }
    
    res.render('os/imprimir', { ordemServico, user: req.session.user });
  } catch (error) {
    console.error('Print OS error:', error);
    res.render('error', { message: 'Erro ao imprimir OS', user: req.session.user });
  }
});

router.get('/:id/recibo', canAccessOS, async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: ItemOrdemServico, as: 'itens' }
      ]
    });
    
    if (!ordemServico) {
      return res.render('error', { message: 'OS não encontrada', user: req.session.user });
    }
    
    res.render('os/recibo', { ordemServico, user: req.session.user });
  } catch (error) {
    console.error('Receipt OS error:', error);
    res.render('error', { message: 'Erro ao gerar recibo', user: req.session.user });
  }
});

module.exports = router;
