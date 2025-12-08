const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isSuperAdmin } = require('../middleware/auth');
const { Usuario } = require('../models');

router.get('/', isSuperAdmin, async (req, res) => {
  try {
    const { search, perfil } = req.query;
    let where = {};
    
    if (search) {
      where[Op.or] = [
        { nome: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (perfil) where.perfil = perfil;

    const usuarios = await Usuario.findAll({
      where,
      order: [['nome', 'ASC']]
    });

    res.render('users/index', {
      user: req.session.user,
      usuarios,
      filters: { search, perfil }
    });
  } catch (error) {
    console.error('Users error:', error);
    res.render('error', { message: 'Erro ao carregar usuários.', user: req.session.user });
  }
});

router.post('/', isSuperAdmin, async (req, res) => {
  try {
    const { nome, email, senha, perfil, telefone } = req.body;
    
    const existing = await Usuario.findOne({ where: { email } });
    if (existing) {
      return res.redirect('/usuarios?error=email');
    }

    const senha_hash = await Usuario.hashPassword(senha);
    
    await Usuario.create({
      nome,
      email,
      senha_hash,
      perfil,
      telefone,
      ativo: true,
      primeiro_acesso: true
    });

    res.redirect('/usuarios');
  } catch (error) {
    console.error('Create user error:', error);
    res.redirect('/usuarios?error=1');
  }
});

router.post('/:id/update', isSuperAdmin, async (req, res) => {
  try {
    const { nome, email, senha, perfil, telefone } = req.body;
    
    const updateData = { nome, email, perfil, telefone };
    
    if (senha && senha.trim() !== '') {
      updateData.senha_hash = await Usuario.hashPassword(senha);
    }
    
    await Usuario.update(updateData, { where: { id: req.params.id } });
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Update user error:', error);
    res.redirect('/usuarios?error=1');
  }
});

router.post('/:id/toggle', isSuperAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (usuario) {
      await Usuario.update({ ativo: !usuario.ativo }, { where: { id: req.params.id } });
    }
    res.redirect('/usuarios');
  } catch (error) {
    res.redirect('/usuarios?error=1');
  }
});

router.post('/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) {
      return res.redirect('/usuarios?error=self');
    }
    await Usuario.destroy({ where: { id: req.params.id } });
    res.redirect('/usuarios');
  } catch (error) {
    res.redirect('/usuarios?error=1');
  }
});

router.post('/:id/reset-senha', isSuperAdmin, async (req, res) => {
  try {
    const { nova_senha } = req.body;
    
    if (!nova_senha || nova_senha.length < 6) {
      return res.redirect('/usuarios?error=senha');
    }
    
    const senha_hash = await Usuario.hashPassword(nova_senha);
    
    await Usuario.update({
      senha_hash,
      primeiro_acesso: true
    }, { where: { id: req.params.id } });
    
    res.redirect('/usuarios');
  } catch (error) {
    console.error('Reset senha error:', error);
    res.redirect('/usuarios?error=1');
  }
});

module.exports = router;
