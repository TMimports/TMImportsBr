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
    
    if (user.primeiro_acesso) {
      req.session.primeiro_acesso_user = {
        id: user.id,
        nome: user.nome,
        email: user.email
      };
      return res.redirect('/primeiro-acesso');
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

router.get('/primeiro-acesso', (req, res) => {
  if (!req.session.primeiro_acesso_user) {
    return res.redirect('/login');
  }
  res.render('auth/primeiro-acesso', { 
    usuario: req.session.primeiro_acesso_user,
    error: null 
  });
});

router.post('/primeiro-acesso', async (req, res) => {
  try {
    const { usuario_id, nova_senha, confirmar_senha } = req.body;
    
    if (!req.session.primeiro_acesso_user || req.session.primeiro_acesso_user.id !== parseInt(usuario_id)) {
      return res.redirect('/login');
    }
    
    if (nova_senha !== confirmar_senha) {
      return res.render('auth/primeiro-acesso', {
        usuario: req.session.primeiro_acesso_user,
        error: 'As senhas nao conferem.'
      });
    }
    
    if (nova_senha.length < 6) {
      return res.render('auth/primeiro-acesso', {
        usuario: req.session.primeiro_acesso_user,
        error: 'A senha deve ter no minimo 6 caracteres.'
      });
    }
    
    const senha_hash = await Usuario.hashPassword(nova_senha);
    
    await Usuario.update({
      senha_hash,
      primeiro_acesso: false
    }, { where: { id: usuario_id } });
    
    const user = await Usuario.findByPk(usuario_id);
    
    delete req.session.primeiro_acesso_user;
    
    req.session.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    };
    
    redirectByRole(user.perfil, res);
  } catch (error) {
    console.error('Primeiro acesso error:', error);
    res.render('auth/primeiro-acesso', {
      usuario: req.session.primeiro_acesso_user,
      error: 'Erro ao definir senha. Tente novamente.'
    });
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
