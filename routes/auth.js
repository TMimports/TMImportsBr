const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');

router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return redirectByRole(req.session.user.perfil, res);
  }
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await Usuario.findOne({ where: { email, ativo: true } });
    
    if (!user) {
      return res.render('auth/login', { error: 'Email ou senha incorretos.' });
    }
    
    const isValid = await user.validPassword(senha);
    if (!isValid) {
      return res.render('auth/login', { error: 'Email ou senha incorretos.' });
    }
    
    req.session.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    };
    
    redirectByRole(user.perfil, res);
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'Erro ao fazer login.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/login');
  });
});

function redirectByRole(perfil, res) {
  switch (perfil) {
    case 'SUPER_ADMIN':
      res.redirect('/dashboard');
      break;
    case 'ADMIN':
      res.redirect('/produtos');
      break;
    case 'VENDEDOR':
      res.redirect('/vendedor/dashboard');
      break;
    case 'CONTADOR':
      res.redirect('/financeiro/contas-receber');
      break;
    default:
      res.redirect('/login');
  }
}

module.exports = router;
