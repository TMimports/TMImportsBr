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
  const permissions = user.permissions || [];
  
  let dashboardHome = '/app/dashboard/pessoal';
  let scope = user.loja_id ? 'STORE' : 'TMIMPORTS';
  
  if (user.isAdmin || user.perfil === 'ADMIN_GLOBAL') {
    dashboardHome = '/app/dashboard/global';
    scope = 'TMIMPORTS';
  } else if (permissions.includes('dashboard.view_global')) {
    dashboardHome = '/app/dashboard/global';
  } else if (permissions.includes('dashboard.view_financial')) {
    dashboardHome = '/app/dashboard/financeiro';
  } else if (permissions.includes('dashboard.view_operational')) {
    dashboardHome = '/app/dashboard/operacional';
  } else if (permissions.includes('dashboard.view_personal')) {
    dashboardHome = '/app/dashboard/pessoal';
  }
  
  const moduleSummary = {};
  const moduleViewPermissions = {
    'DASHBOARD': ['dashboard.view_global', 'dashboard.view_operational', 'dashboard.view_financial', 'dashboard.view_personal'],
    'CLIENTES': ['customers.view'],
    'CATALOGO': ['catalog.view'],
    'SERVICOS': ['services.view'],
    'VENDAS': ['sales.view'],
    'ORDEM_SERVICO': ['os.view'],
    'ESTOQUE_CENTRAL': ['stock_central.view'],
    'ESTOQUE_LOJA': ['stock_store.view'],
    'PEDIDOS': ['franchise_orders.view'],
    'FINANCEIRO': ['finance.view'],
    'USUARIOS': ['users.view'],
    'FRANQUIAS': ['franchises.view'],
    'ANALYTICS': ['analytics.rankings.view', 'analytics.low_movers.view'],
    'RELATORIOS': ['reports.view'],
    'CONFIGURACOES': ['settings.view'],
    'AUDITORIA': ['audit.view']
  };
  
  Object.entries(moduleViewPermissions).forEach(([module, viewPerms]) => {
    moduleSummary[module] = user.isAdmin || viewPerms.some(p => permissions.includes(p));
  });
  
  res.json({
    user: {
      id: user.id,
      name: user.nome,
      email: user.email,
      storeId: user.loja_id,
      storeName: user.loja?.nome || null,
      companyId: user.empresa_id,
      perfil: user.perfil,
      primeiro_acesso: user.primeiro_acesso,
      is_admin_global: user.isAdmin || user.perfil === 'ADMIN_GLOBAL'
    },
    permissions: permissions,
    moduleSummary: moduleSummary,
    scope: scope,
    dashboardHome: dashboardHome,
    loja: user.loja,
    Company: user.Company
  });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;
