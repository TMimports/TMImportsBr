const express = require('express');
const router = express.Router();
const { Category, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;

    const categories = await Category.findAll({
      where,
      order: [['nome', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

router.post('/', isGestorOuAdmin, async (req, res) => {
  try {
    const category = await Category.create(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'categories',
      registro_id: category.id,
      dados_depois: { nome: category.nome, tipo: category.tipo }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await category.update(req.body);
    res.json(category);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await category.destroy();
    res.json({ message: 'Categoria excluída' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;
