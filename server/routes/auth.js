const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User, Company, Store } = require('../models');
const { generateToken, verifyToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'nome', 'email', 'senha', 'perfil', 'ativo', 'primeiro_acesso', 'empresa_id', 'loja_id', 'permissoes', 'token_version'],
      include: [
        { model: Store, as: 'loja' },
        { model: Company }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    await user.update({ ultimo_acesso: new Date() });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        primeiro_acesso: user.primeiro_acesso,
        empresa_id: user.empresa_id,
        loja_id: user.loja_id,
        loja: user.loja,
        Company: user.Company,
        permissoes: user.permissoes
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/definir-senha', verifyToken, async (req, res) => {
  try {
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await req.user.update({ senha: senhaHash, primeiro_acesso: false });

    res.json({ message: 'Senha definida com sucesso' });
  } catch (error) {
    console.error('Erro ao definir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  const user = req.user;
  const roleCodes = user.roleCodes || [];
  const aggregatedPermissions = user.aggregatedPermissions || {};
  
  // Flatten permissions to array format: ["resource:action", ...]
  const permissions = [];
  Object.entries(aggregatedPermissions).forEach(([resource, actions]) => {
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        permissions.push(`${resource}:${action}`);
      });
    }
  });
  
  // Determine dashboardHome based on roles
  let dashboardHome = '/app/dashboard/operacional';
  let scope = user.loja_id ? 'STORE' : 'TMIMPORTS';
  
  if (user.isAdmin || roleCodes.includes('ADMIN_GLOBAL')) {
    dashboardHome = '/app/dashboard/global';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('GESTOR_DASHBOARD')) {
    dashboardHome = '/app/dashboard/global';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('FINANCEIRO')) {
    dashboardHome = '/app/dashboard/financeiro';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('GERENTE_OP')) {
    dashboardHome = '/app/dashboard/operacional';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('ADM1_LOGISTICA') || roleCodes.includes('ADM2_CADASTRO') || roleCodes.includes('ADM3_OS_GARANTIA')) {
    dashboardHome = '/app/dashboard/operacional';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('VENDEDOR_TMI')) {
    dashboardHome = '/app/dashboard/pessoal';
    scope = 'TMIMPORTS';
  } else if (roleCodes.includes('FRANQUEADO_GESTOR')) {
    dashboardHome = '/app/dashboard/operacional';
    scope = 'STORE';
  } else if (roleCodes.includes('GERENTE_LOJA')) {
    dashboardHome = '/app/dashboard/operacional';
    scope = 'STORE';
  } else if (roleCodes.includes('VENDEDOR_LOJA')) {
    dashboardHome = '/app/dashboard/pessoal';
    scope = 'STORE';
  } else if (user.perfil === 'GESTOR_FRANQUIA') {
    dashboardHome = '/app/dashboard/operacional';
    scope = 'STORE';
  } else if (user.perfil === 'OPERACIONAL') {
    dashboardHome = '/app/dashboard/pessoal';
    scope = 'STORE';
  }
  
  res.json({
    user: {
      id: user.id,
      name: user.nome,
      email: user.email,
      storeId: user.loja_id,
      storeName: user.loja?.nome || null,
      companyId: user.empresa_id,
      perfil: user.perfil,
      primeiro_acesso: user.primeiro_acesso
    },
    roles: roleCodes,
    permissions: permissions,
    scope: scope,
    dashboardHome: dashboardHome,
    // Legacy fields for backwards compatibility
    loja: user.loja,
    Company: user.Company,
    permissoes: user.permissoes
  });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;
