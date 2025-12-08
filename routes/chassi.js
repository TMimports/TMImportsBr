const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isSuperAdmin } = require('../middleware/auth');
const { Chassi, Estoque, Subestoque } = require('../models');

router.get('/', isSuperAdmin, async (req, res) => {
  try {
    const { search, status, modelo } = req.query;
    let where = {};
    
    if (search) {
      where[Op.or] = [
        { numero_chassi: { [Op.like]: `%${search}%` } },
        { modelo: { [Op.like]: `%${search}%` } },
        { cor: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;
    if (modelo) where.modelo = modelo;

    const chassis = await Chassi.findAll({
      where,
      include: [
        { model: Estoque },
        { model: Subestoque }
      ],
      order: [['createdAt', 'DESC']]
    });

    const modelos = await Chassi.findAll({
      attributes: ['modelo'],
      group: ['modelo']
    });

    const estoques = await Estoque.findAll({ where: { ativo: true } });
    const subestoques = await Subestoque.findAll({ where: { ativo: true } });

    res.render('chassis/index', {
      user: req.session.user,
      chassis,
      modelos: modelos.map(m => m.modelo),
      estoques,
      subestoques,
      filters: { search, status, modelo }
    });
  } catch (error) {
    console.error('Chassis error:', error);
    res.render('error', { message: 'Erro ao carregar chassis.', user: req.session.user });
  }
});

router.post('/', isSuperAdmin, async (req, res) => {
  try {
    const { modelo, cor, numero_chassi, estoque_id, subestoque_id, status } = req.body;
    
    await Chassi.create({
      modelo,
      cor,
      numero_chassi,
      estoque_id: estoque_id ? parseInt(estoque_id) : null,
      subestoque_id: subestoque_id ? parseInt(subestoque_id) : null,
      status: status || 'CADASTRADO'
    });

    res.redirect('/chassi');
  } catch (error) {
    console.error('Create chassis error:', error);
    res.redirect('/chassi?error=1');
  }
});

router.post('/:id/update', isSuperAdmin, async (req, res) => {
  try {
    const { modelo, cor, numero_chassi, estoque_id, subestoque_id, status } = req.body;
    
    await Chassi.update({
      modelo,
      cor,
      numero_chassi,
      estoque_id: estoque_id ? parseInt(estoque_id) : null,
      subestoque_id: subestoque_id ? parseInt(subestoque_id) : null,
      status
    }, { where: { id: req.params.id } });

    res.redirect('/chassi');
  } catch (error) {
    res.redirect('/chassi?error=1');
  }
});

router.post('/:id/liberar', isSuperAdmin, async (req, res) => {
  try {
    await Chassi.update({ status: 'LIBERADO' }, { where: { id: req.params.id } });
    res.redirect('/chassi');
  } catch (error) {
    res.redirect('/chassi?error=1');
  }
});

router.post('/:id/inativar', isSuperAdmin, async (req, res) => {
  try {
    await Chassi.update({ status: 'INATIVO' }, { where: { id: req.params.id } });
    res.redirect('/chassi');
  } catch (error) {
    res.redirect('/chassi?error=1');
  }
});

router.post('/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    await Chassi.destroy({ where: { id: req.params.id } });
    res.redirect('/chassi');
  } catch (error) {
    res.redirect('/chassi?error=1');
  }
});

router.get('/api/disponiveis', async (req, res) => {
  try {
    const { modelo, cor, estoque_id } = req.query;
    let where = { status: 'LIBERADO' };
    if (modelo) where.modelo = modelo;
    if (cor) where.cor = cor;
    if (estoque_id) where.estoque_id = parseInt(estoque_id);
    
    const chassis = await Chassi.findAll({ where });
    res.json(chassis);
  } catch (error) {
    res.json([]);
  }
});

module.exports = router;
