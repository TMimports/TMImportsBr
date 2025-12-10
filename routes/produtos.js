const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isAdmin, isAuthenticated } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { Produto, ItemEstoque, Estoque, Subestoque, Anexo } = require('../models');
const multer = require('multer');
const path = require('path');

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
    const { search, tipo, categoria } = req.query;
    let where = { ativo: true };
    
    if (search) {
      where[Op.or] = [
        { nome_modelo: { [Op.like]: `%${search}%` } },
        { nome_produto: { [Op.like]: `%${search}%` } },
        { cor: { [Op.like]: `%${search}%` } },
        { categoria: { [Op.like]: `%${search}%` } }
      ];
    }
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;

    const produtos = await Produto.findAll({ where, order: [['createdAt', 'DESC']] });
    const categorias = await Produto.findAll({
      attributes: ['categoria'],
      group: ['categoria'],
      where: { categoria: { [Op.ne]: null } }
    });
    const estoques = await Estoque.findAll({ where: { ativo: true } });
    const subestoques = await Subestoque.findAll({ where: { ativo: true } });

    res.render('products/index', {
      user: req.session.user,
      produtos,
      categorias: categorias.map(c => c.categoria).filter(Boolean),
      estoques,
      subestoques,
      filters: { search, tipo, categoria }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.render('error', { message: 'Erro ao carregar produtos.', user: req.session.user });
  }
});

router.post('/', isAdmin, upload.single('anexo'), validateCsrf, async (req, res) => {
  try {
    const { tipo, item, nome_modelo, cor, nome_produto, descricao, categoria, preco_venda, estoque_id, subestoque_id, quantidade_inicial, chassi, codigo_motor, capacidade_bateria } = req.body;
    
    const produto = await Produto.create({
      tipo,
      item,
      nome_modelo,
      cor,
      nome_produto,
      descricao,
      categoria,
      preco_venda: parseFloat(preco_venda) || 0,
      chassi: chassi || null,
      codigo_motor: codigo_motor || null,
      capacidade_bateria: capacidade_bateria || null,
      ativo: true
    });

    if (estoque_id && quantidade_inicial) {
      await ItemEstoque.create({
        produto_id: produto.id,
        estoque_id: parseInt(estoque_id),
        subestoque_id: subestoque_id ? parseInt(subestoque_id) : null,
        quantidade: parseInt(quantidade_inicial) || 0,
        quantidade_minima: 0,
        ativo: true
      });
    }

    if (req.file) {
      await Anexo.create({
        tipo_entidade: 'produto',
        entidade_id: produto.id,
        caminho_arquivo: req.file.path,
        nome_arquivo: req.file.originalname
      });
    }

    res.redirect('/produtos');
  } catch (error) {
    console.error('Create product error:', error);
    res.redirect('/produtos?error=1');
  }
});

router.post('/:id/update', isAdmin, async (req, res) => {
  try {
    const { tipo, item, nome_modelo, cor, nome_produto, descricao, categoria, preco_venda, chassi, codigo_motor, capacidade_bateria } = req.body;
    
    await Produto.update({
      tipo,
      item,
      nome_modelo,
      cor,
      nome_produto,
      descricao,
      categoria,
      preco_venda: parseFloat(preco_venda) || 0,
      chassi: chassi || null,
      codigo_motor: codigo_motor || null,
      capacidade_bateria: capacidade_bateria || null
    }, { where: { id: req.params.id } });

    res.redirect('/produtos');
  } catch (error) {
    console.error('Update product error:', error);
    res.redirect('/produtos?error=1');
  }
});

router.post('/:id/archive', isAdmin, async (req, res) => {
  try {
    await Produto.update({ ativo: false }, { where: { id: req.params.id } });
    res.redirect('/produtos');
  } catch (error) {
    console.error('Archive product error:', error);
    res.redirect('/produtos?error=1');
  }
});

router.post('/:id/delete', isAdmin, async (req, res) => {
  try {
    await Produto.destroy({ where: { id: req.params.id } });
    res.redirect('/produtos');
  } catch (error) {
    console.error('Delete product error:', error);
    res.redirect('/produtos?error=1');
  }
});

router.get('/:id/anexos', isAdmin, async (req, res) => {
  try {
    const anexos = await Anexo.findAll({
      where: { tipo_entidade: 'produto', entidade_id: req.params.id }
    });
    res.json(anexos);
  } catch (error) {
    res.json([]);
  }
});

router.post('/:id/anexos', isAdmin, upload.single('arquivo'), validateCsrf, async (req, res) => {
  try {
    if (req.file) {
      await Anexo.create({
        tipo_entidade: 'produto',
        entidade_id: req.params.id,
        caminho_arquivo: req.file.path,
        nome_arquivo: req.file.originalname
      });
    }
    res.redirect('/produtos');
  } catch (error) {
    res.redirect('/produtos?error=1');
  }
});

router.post('/limpar-tudo', isAdmin, validateCsrf, async (req, res) => {
  try {
    if (req.session.user.perfil !== 'SUPER_ADMIN') {
      return res.redirect('/produtos?error=Sem permissão');
    }
    
    await ItemEstoque.destroy({ where: {} });
    await Anexo.destroy({ where: { produto_id: { [Op.ne]: null } } });
    await Produto.destroy({ where: {} });
    
    res.redirect('/produtos?success=Todos os produtos foram removidos');
  } catch (error) {
    console.error('Erro ao limpar produtos:', error);
    res.redirect('/produtos?error=Erro ao limpar produtos');
  }
});

router.get('/api/por-tipo/:tipo', isAuthenticated, async (req, res) => {
  try {
    const { tipo } = req.params;
    let where = { ativo: true };
    
    if (tipo === 'MOTO') {
      where.tipo = { [Op.in]: ['MOTO', 'SCOOTER'] };
    } else if (tipo === 'PRODUTO') {
      where.tipo = { [Op.in]: ['PECA', 'PRODUTO'] };
    } else if (tipo === 'SERVICO') {
      where.tipo = 'SERVICO';
    }
    
    const produtos = await Produto.findAll({ 
      where,
      order: [['nome_modelo', 'ASC'], ['nome_produto', 'ASC']]
    });
    
    res.json(produtos);
  } catch (error) {
    console.error('API produtos por tipo error:', error);
    res.json([]);
  }
});

module.exports = router;
