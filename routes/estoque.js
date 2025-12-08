const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isAdmin } = require('../middleware/auth');
const { Estoque, Subestoque, ItemEstoque, Produto, Anexo } = require('../models');
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

router.get('/', isAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    
    const estoques = await Estoque.findAll({
      where: { ativo: true },
      include: [{ model: Subestoque, where: { ativo: true }, required: false }],
      order: [['nome_estoque', 'ASC']]
    });

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
      order: [['quantidade', 'ASC']]
    });

    const produtos = await Produto.findAll({ where: { ativo: true } });

    res.render('stock/index', {
      user: req.session.user,
      estoques,
      itensEstoque,
      produtos,
      search
    });
  } catch (error) {
    console.error('Stock error:', error);
    res.render('error', { message: 'Erro ao carregar estoque.', user: req.session.user });
  }
});

router.post('/estoques', isAdmin, async (req, res) => {
  try {
    const { nome_estoque } = req.body;
    await Estoque.create({ nome_estoque, ativo: true });
    res.redirect('/estoque');
  } catch (error) {
    console.error('Create stock error:', error);
    res.redirect('/estoque?error=1');
  }
});

router.post('/estoques/:id/update', isAdmin, async (req, res) => {
  try {
    const { nome_estoque } = req.body;
    await Estoque.update({ nome_estoque }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/estoques/:id/delete', isAdmin, async (req, res) => {
  try {
    await Estoque.update({ ativo: false }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/subestoques', isAdmin, async (req, res) => {
  try {
    const { nome_subestoque, estoque_id } = req.body;
    await Subestoque.create({ nome_subestoque, estoque_id: parseInt(estoque_id), ativo: true });
    res.redirect('/estoque');
  } catch (error) {
    console.error('Create substock error:', error);
    res.redirect('/estoque?error=1');
  }
});

router.post('/subestoques/:id/update', isAdmin, async (req, res) => {
  try {
    const { nome_subestoque, estoque_id } = req.body;
    await Subestoque.update({ nome_subestoque, estoque_id: parseInt(estoque_id) }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/subestoques/:id/delete', isAdmin, async (req, res) => {
  try {
    await Subestoque.update({ ativo: false }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/itens', isAdmin, async (req, res) => {
  try {
    const { produto_id, estoque_id, subestoque_id, quantidade, quantidade_minima } = req.body;
    
    const existing = await ItemEstoque.findOne({
      where: {
        produto_id: parseInt(produto_id),
        estoque_id: parseInt(estoque_id),
        subestoque_id: subestoque_id ? parseInt(subestoque_id) : null
      }
    });

    if (existing) {
      await ItemEstoque.update({
        quantidade: existing.quantidade + parseInt(quantidade),
        quantidade_minima: parseInt(quantidade_minima) || existing.quantidade_minima
      }, { where: { id: existing.id } });
    } else {
      await ItemEstoque.create({
        produto_id: parseInt(produto_id),
        estoque_id: parseInt(estoque_id),
        subestoque_id: subestoque_id ? parseInt(subestoque_id) : null,
        quantidade: parseInt(quantidade) || 0,
        quantidade_minima: parseInt(quantidade_minima) || 0,
        ativo: true
      });
    }

    res.redirect('/estoque');
  } catch (error) {
    console.error('Add stock item error:', error);
    res.redirect('/estoque?error=1');
  }
});

router.post('/itens/:id/update', isAdmin, async (req, res) => {
  try {
    const { quantidade, quantidade_minima } = req.body;
    await ItemEstoque.update({
      quantidade: parseInt(quantidade),
      quantidade_minima: parseInt(quantidade_minima) || 0
    }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/itens/:id/baixa', isAdmin, async (req, res) => {
  try {
    const { quantidade_baixa } = req.body;
    const item = await ItemEstoque.findByPk(req.params.id);
    if (item) {
      const novaQtd = Math.max(0, item.quantidade - parseInt(quantidade_baixa));
      await ItemEstoque.update({ quantidade: novaQtd }, { where: { id: req.params.id } });
    }
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.post('/itens/:id/delete', isAdmin, async (req, res) => {
  try {
    await ItemEstoque.update({ ativo: false }, { where: { id: req.params.id } });
    res.redirect('/estoque');
  } catch (error) {
    res.redirect('/estoque?error=1');
  }
});

router.get('/api/subestoques/:estoqueId', async (req, res) => {
  try {
    const subestoques = await Subestoque.findAll({
      where: { estoque_id: req.params.estoqueId, ativo: true }
    });
    res.json(subestoques);
  } catch (error) {
    res.json([]);
  }
});

module.exports = router;
