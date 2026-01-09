const express = require('express');
const router = express.Router();
const { Notification, InventoryStore, InventoryMain, Product, Setting, User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const where = { user_id: req.user.id };
    
    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

router.get('/nao-lidas', async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, lida: false }
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao contar notificações' });
  }
});

router.put('/:id/ler', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (notification && notification.user_id === req.user.id) {
      await notification.update({ lida: true });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar como lida' });
  }
});

router.post('/marcar-todas-lidas', async (req, res) => {
  try {
    await Notification.update(
      { lida: true },
      { where: { user_id: req.user.id, lida: false } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

router.get('/verificar-estoque', async (req, res) => {
  try {
    const settingMin = await Setting.findOne({ where: { chave: 'estoque_minimo_alerta', empresa_id: null } });
    const estoqueMinimo = settingMin ? parseInt(settingMin.valor) : 2;
    
    let alertas = [];
    
    if (req.user.perfil === 'ADMIN_GLOBAL') {
      const estoquesBaixos = await InventoryMain.findAll({
        where: { quantidade: { [Op.lte]: estoqueMinimo } },
        include: [{ model: Product, as: 'produto' }]
      });
      
      alertas = estoquesBaixos.map(e => ({
        tipo: 'estoque_baixo',
        titulo: 'Estoque Baixo - Central',
        mensagem: `${e.produto?.nome || 'Produto'}: apenas ${e.quantidade} unidades`,
        produto_id: e.produto_id,
        quantidade: e.quantidade
      }));
    } else if (req.user.loja_id) {
      const estoquesBaixos = await InventoryStore.findAll({
        where: { 
          loja_id: req.user.loja_id,
          quantidade: { [Op.lte]: estoqueMinimo } 
        },
        include: [{ model: Product, as: 'produto' }]
      });
      
      alertas = estoquesBaixos.map(e => ({
        tipo: 'estoque_baixo',
        titulo: 'Estoque Baixo',
        mensagem: `${e.produto?.nome || 'Produto'}: apenas ${e.quantidade} unidades`,
        produto_id: e.produto_id,
        quantidade: e.quantidade
      }));
    }
    
    res.json(alertas);
  } catch (error) {
    console.error('Erro ao verificar estoque:', error);
    res.status(500).json({ error: 'Erro ao verificar estoque' });
  }
});

async function criarNotificacaoEstoque(produtoId, quantidade, userId, lojaId = null) {
  try {
    const product = await Product.findByPk(produtoId);
    if (!product) return;
    
    const titulo = lojaId ? 'Estoque Baixo na Loja' : 'Estoque Baixo - Central';
    const mensagem = `${product.nome}: apenas ${quantidade} unidades restantes`;
    
    const existente = await Notification.findOne({
      where: {
        user_id: userId,
        tipo: 'estoque_baixo',
        link: `/app/estoque?produto=${produtoId}`,
        lida: false
      }
    });
    
    if (!existente) {
      await Notification.create({
        user_id: userId,
        titulo,
        mensagem,
        tipo: 'estoque_baixo',
        link: `/app/estoque?produto=${produtoId}`
      });
    }
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}

module.exports = router;
module.exports.criarNotificacaoEstoque = criarNotificacaoEstoque;
