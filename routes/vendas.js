const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { Venda, ItemVenda, AnexoVenda, Produto, Usuario, Estoque, Subestoque, ItemEstoque, Chassi, ContaReceber } = require('../models');
const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, Date.now() + '-' + sanitizedName);
  }
});
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, status, data_inicio, data_fim } = req.query;
    let where = {};
    
    if (req.session.user.perfil === 'VENDEDOR') {
      where.vendedor_id = req.session.user.id;
    }
    
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { cliente_nome: { [Op.like]: `%${search}%` } },
        { cliente_email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    let periodo = '';
    if (data_inicio && data_fim) {
      where.createdAt = { [Op.between]: [new Date(data_inicio + 'T00:00:00'), new Date(data_fim + 'T23:59:59')] };
      periodo = `${data_inicio},${data_fim}`;
    } else if (data_inicio) {
      where.createdAt = { [Op.gte]: new Date(data_inicio + 'T00:00:00') };
      periodo = `${data_inicio},`;
    } else if (data_fim) {
      where.createdAt = { [Op.lte]: new Date(data_fim + 'T23:59:59') };
      periodo = `,${data_fim}`;
    }

    const vendas = await Venda.findAll({
      where,
      include: [
        { model: Usuario, as: 'vendedor' },
        { model: Estoque },
        { model: Subestoque },
        { model: ItemVenda, include: [{ model: Produto }] },
        { model: AnexoVenda }
      ],
      order: [['createdAt', 'DESC']]
    });

    const produtos = await Produto.findAll({ where: { ativo: true } });
    const estoques = await Estoque.findAll({ where: { ativo: true } });
    const subestoques = await Subestoque.findAll({ where: { ativo: true } });

    res.render('sales/index', {
      user: req.session.user,
      vendas,
      produtos,
      estoques,
      subestoques,
      filters: { search, status, periodo }
    });
  } catch (error) {
    console.error('Sales error:', error);
    res.render('error', { message: 'Erro ao carregar vendas.', user: req.session.user });
  }
});

router.get('/:id/detalhes', isSuperAdmin, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor' },
        { model: Estoque },
        { model: Subestoque },
        { model: ItemVenda, include: [{ model: Produto }] },
        { model: AnexoVenda }
      ]
    });

    if (!venda) {
      return res.redirect('/vendas?error=2');
    }

    const contaReceber = await ContaReceber.findOne({ where: { venda_id: venda.id } });
    
    let chassisVinculados = [];
    if (venda.chassi_selecionado) {
      try {
        const chassisIds = JSON.parse(venda.chassi_selecionado);
        chassisVinculados = await Chassi.findAll({ where: { id: chassisIds } });
      } catch (e) {}
    }

    res.render('sales/show', {
      user: req.session.user,
      venda,
      contaReceber,
      chassisVinculados
    });
  } catch (error) {
    console.error('Sale details error:', error);
    res.render('error', { message: 'Erro ao carregar detalhes da venda.', user: req.session.user });
  }
});

router.post('/', isAuthenticated, upload.array('anexos', 5), validateCsrf, async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, cliente_email, estoque_id, subestoque_id, desconto, forma_pagamento, itens } = req.body;
    
    let parsedItens = [];
    try {
      parsedItens = JSON.parse(itens || '[]');
    } catch (e) {
      parsedItens = [];
    }

    let valorTotal = 0;
    for (const item of parsedItens) {
      valorTotal += parseFloat(item.preco_unitario || 0) * parseInt(item.quantidade || 1);
    }
    valorTotal -= parseFloat(desconto || 0);

    const venda = await Venda.create({
      vendedor_id: req.session.user.id,
      cliente_nome,
      cliente_telefone,
      cliente_email,
      estoque_id_consumido: estoque_id ? parseInt(estoque_id) : null,
      subestoque_id_consumido: subestoque_id ? parseInt(subestoque_id) : null,
      desconto: parseFloat(desconto) || 0,
      valor_total: valorTotal,
      forma_pagamento,
      status: 'PENDENTE'
    });

    for (const item of parsedItens) {
      await ItemVenda.create({
        venda_id: venda.id,
        produto_id: parseInt(item.produto_id),
        quantidade: parseInt(item.quantidade) || 1,
        preco_unitario: parseFloat(item.preco_unitario) || 0,
        cor_escolhida: item.cor_escolhida || null
      });
    }

    if (req.files) {
      for (const file of req.files) {
        await AnexoVenda.create({
          venda_id: venda.id,
          caminho_arquivo: file.path,
          nome_arquivo: file.originalname
        });
      }
    }

    res.redirect('/vendas');
  } catch (error) {
    console.error('Create sale error:', error);
    res.redirect('/vendas?error=1');
  }
});

router.post('/:id/update', isAuthenticated, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id);
    
    if (!venda || venda.status !== 'PENDENTE') {
      return res.redirect('/vendas?error=2');
    }
    
    if (req.session.user.perfil === 'VENDEDOR' && venda.vendedor_id !== req.session.user.id) {
      return res.redirect('/vendas?error=3');
    }

    const { cliente_nome, cliente_telefone, cliente_email, estoque_id, subestoque_id, desconto, forma_pagamento, itens } = req.body;
    
    let parsedItens = [];
    try {
      parsedItens = JSON.parse(itens || '[]');
    } catch (e) {
      parsedItens = [];
    }

    let valorTotal = 0;
    for (const item of parsedItens) {
      valorTotal += parseFloat(item.preco_unitario || 0) * parseInt(item.quantidade || 1);
    }
    valorTotal -= parseFloat(desconto || 0);

    await Venda.update({
      cliente_nome,
      cliente_telefone,
      cliente_email,
      estoque_id_consumido: estoque_id ? parseInt(estoque_id) : null,
      subestoque_id_consumido: subestoque_id ? parseInt(subestoque_id) : null,
      desconto: parseFloat(desconto) || 0,
      valor_total: valorTotal,
      forma_pagamento
    }, { where: { id: req.params.id } });

    await ItemVenda.destroy({ where: { venda_id: req.params.id } });
    for (const item of parsedItens) {
      await ItemVenda.create({
        venda_id: venda.id,
        produto_id: parseInt(item.produto_id),
        quantidade: parseInt(item.quantidade) || 1,
        preco_unitario: parseFloat(item.preco_unitario) || 0,
        cor_escolhida: item.cor_escolhida || null
      });
    }

    res.redirect('/vendas');
  } catch (error) {
    console.error('Update sale error:', error);
    res.redirect('/vendas?error=1');
  }
});

router.post('/:id/cancelar', isAuthenticated, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id);
    
    if (!venda || (venda.status !== 'PENDENTE' && req.session.user.perfil !== 'SUPER_ADMIN')) {
      return res.redirect('/vendas?error=2');
    }
    
    if (req.session.user.perfil === 'VENDEDOR' && venda.vendedor_id !== req.session.user.id) {
      return res.redirect('/vendas?error=3');
    }

    await Venda.update({ status: 'CANCELADA' }, { where: { id: req.params.id } });
    res.redirect('/vendas');
  } catch (error) {
    res.redirect('/vendas?error=1');
  }
});

router.post('/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    console.log('Deleting sale ID:', req.params.id);
    
    // Verificar se existem orçamentos vinculados
    const { Orcamento } = require('../models');
    await Orcamento.destroy({ where: { origem_tipo: 'VENDA', origem_id: req.params.id } });
    
    // Verificar se existem contas a receber vinculadas
    const { ContaReceber } = require('../models');
    await ContaReceber.destroy({ where: { venda_id: req.params.id } });
    
    await ItemVenda.destroy({ where: { venda_id: req.params.id } });
    await AnexoVenda.destroy({ where: { venda_id: req.params.id } });
    await Venda.destroy({ where: { id: req.params.id } });
    
    console.log('Sale deleted successfully');
    res.redirect('/vendas');
  } catch (error) {
    console.error('Delete sale error:', error);
    res.redirect('/vendas?error=1');
  }
});

router.get('/pendentes', isSuperAdmin, async (req, res) => {
  try {
    const vendas = await Venda.findAll({
      where: { status: 'PENDENTE' },
      include: [
        { model: Usuario, as: 'vendedor' },
        { model: Estoque },
        { model: Subestoque },
        { model: ItemVenda, include: [{ model: Produto }] },
        { model: AnexoVenda }
      ],
      order: [['createdAt', 'DESC']]
    });

    const produtos = await Produto.findAll({ where: { ativo: true } });
    const estoques = await Estoque.findAll({ where: { ativo: true } });
    const subestoques = await Subestoque.findAll({ where: { ativo: true } });

    res.render('sales/pending', {
      user: req.session.user,
      vendas,
      produtos,
      estoques,
      subestoques
    });
  } catch (error) {
    console.error('Pending sales error:', error);
    res.render('error', { message: 'Erro ao carregar vendas pendentes.', user: req.session.user });
  }
});

router.post('/:id/aprovar', isSuperAdmin, async (req, res) => {
  try {
    const { chassis_selecionados } = req.body;
    
    await Venda.update({
      status: 'APROVADA',
      chassi_selecionado: chassis_selecionados
    }, { where: { id: req.params.id } });

    res.redirect('/vendas/pendentes');
  } catch (error) {
    res.redirect('/vendas/pendentes?error=1');
  }
});

router.post('/:id/concluir', isSuperAdmin, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [{ model: ItemVenda, include: [{ model: Produto }] }]
    });

    if (!venda) {
      return res.redirect('/vendas/pendentes?error=2');
    }

    const { chassis_selecionados } = req.body;

    for (const item of venda.ItemVendas) {
      const itemEstoque = await ItemEstoque.findOne({
        where: {
          produto_id: item.produto_id,
          estoque_id: venda.estoque_id_consumido,
          subestoque_id: venda.subestoque_id_consumido
        }
      });

      if (itemEstoque) {
        await ItemEstoque.update({
          quantidade: Math.max(0, itemEstoque.quantidade - item.quantidade)
        }, { where: { id: itemEstoque.id } });
      }
    }

    if (chassis_selecionados) {
      try {
        const chassisIds = JSON.parse(chassis_selecionados);
        for (const chassiId of chassisIds) {
          await Chassi.update({ status: 'VENDIDO' }, { where: { id: chassiId } });
        }
      } catch (e) {
        console.error('Parse chassis error:', e);
      }
    }

    await Venda.update({
      status: 'CONCLUIDA',
      chassi_selecionado: chassis_selecionados
    }, { where: { id: req.params.id } });

    let origemArr = [];
    for (const item of venda.ItemVendas) {
      if (item.Produto) {
        origemArr.push(item.Produto.tipo);
      }
    }
    const origem = [...new Set(origemArr)].join(', ');

    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30);

    await ContaReceber.create({
      venda_id: venda.id,
      cliente_nome: venda.cliente_nome,
      valor: venda.valor_total,
      data_vencimento: dataVencimento,
      forma_pagamento: venda.forma_pagamento,
      origem: origem || 'VENDA',
      status: 'EM_ABERTO'
    });

    res.redirect('/vendas/pendentes');
  } catch (error) {
    console.error('Conclude sale error:', error);
    res.redirect('/vendas/pendentes?error=1');
  }
});

router.get('/:id/anexos', async (req, res) => {
  try {
    const anexos = await AnexoVenda.findAll({ where: { venda_id: req.params.id } });
    res.json(anexos);
  } catch (error) {
    res.json([]);
  }
});

router.post('/:id/anexos', isAuthenticated, upload.single('arquivo'), validateCsrf, async (req, res) => {
  try {
    if (req.file) {
      await AnexoVenda.create({
        venda_id: req.params.id,
        caminho_arquivo: req.file.path,
        nome_arquivo: req.file.originalname
      });
    }
    res.redirect('/vendas');
  } catch (error) {
    res.redirect('/vendas?error=1');
  }
});

router.post('/:id/gerar-orcamento', isAuthenticated, async (req, res) => {
  try {
    const { Orcamento, ItemOrcamento } = require('../models');
    
    const venda = await Venda.findByPk(req.params.id, {
      include: [{ model: ItemVenda, include: [{ model: Produto }] }]
    });
    
    if (!venda) {
      return res.redirect('/vendas?error=1');
    }
    
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 7);
    
    let subtotal = 0;
    let descontoTotal = parseFloat(venda.desconto || 0);
    
    for (const item of venda.ItemVendas) {
      subtotal += parseFloat(item.preco_unitario) * parseInt(item.quantidade);
    }
    
    const orcamento = await Orcamento.create({
      origem_tipo: 'VENDA',
      origem_id: venda.id,
      cliente_nome: venda.cliente_nome,
      cliente_telefone: venda.cliente_telefone,
      cliente_email: venda.cliente_email,
      data_validade: dataValidade,
      subtotal: subtotal,
      desconto_total: descontoTotal,
      total: subtotal - descontoTotal,
      status: 'RASCUNHO',
      vendedor_id: req.session.user.id
    });
    
    for (const item of venda.ItemVendas) {
      const itemTotal = parseFloat(item.preco_unitario) * parseInt(item.quantidade);
      let descricao = 'Item';
      if (item.Produto) {
        descricao = item.Produto.nome_modelo || item.Produto.nome_produto || item.Produto.item || 'Produto';
      }
      await ItemOrcamento.create({
        orcamento_id: orcamento.id,
        produto_id: item.produto_id,
        tipo_item: item.Produto ? (item.Produto.tipo === 'SERVICO' ? 'SERVICO' : 'PRODUTO') : 'PRODUTO',
        descricao: descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto: 0,
        total: itemTotal
      });
    }
    
    await Venda.update({ status: 'AGUARDANDO_APROVACAO' }, { where: { id: venda.id } });
    
    res.redirect('/orcamentos/' + orcamento.id);
  } catch (error) {
    console.error('Generate quotation from sale error:', error);
    res.redirect('/vendas/' + req.params.id + '?error=1');
  }
});

router.get('/:id/imprimir', isAuthenticated, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: ItemVenda, include: [{ model: Produto }] },
        { model: Chassi }
      ]
    });
    
    if (!venda) {
      return res.render('error', { message: 'Venda não encontrada', user: req.session.user });
    }
    
    res.render('sales/imprimir', { venda, user: req.session.user });
  } catch (error) {
    console.error('Print sale error:', error);
    res.render('error', { message: 'Erro ao imprimir venda', user: req.session.user });
  }
});

router.get('/:id/recibo', isAuthenticated, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['nome'] },
        { model: ItemVenda, include: [{ model: Produto }] }
      ]
    });
    
    if (!venda) {
      return res.render('error', { message: 'Venda não encontrada', user: req.session.user });
    }
    
    res.render('sales/recibo', { venda, user: req.session.user });
  } catch (error) {
    console.error('Receipt sale error:', error);
    res.render('error', { message: 'Erro ao gerar recibo', user: req.session.user });
  }
});

module.exports = router;
