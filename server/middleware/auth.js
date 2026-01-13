const jwt = require('jsonwebtoken');
const { User, Store, Company, Role, UserRole, AuditLog, UserPermission } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'tm-imports-tecle-motos-secret-2024';

const logAccessDenied = async (userId, resource, action, route) => {
  try {
    await AuditLog.create({
      user_id: userId,
      acao: 'ACESSO_NEGADO',
      entidade: resource || 'rota',
      entidade_id: null,
      dados_anteriores: null,
      dados_novos: { route, action, resource },
      ip: null
    });
  } catch (e) {
    console.error('Erro ao registrar acesso negado:', e.message);
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil, token_version: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Store, as: 'loja' },
        { model: Company },
        { model: Role, as: 'roles', through: { attributes: ['principal'] } }
      ]
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    if (decoded.token_version !== undefined && decoded.token_version !== (user.token_version || 0)) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_VERSION_MISMATCH' });
    }

    const userRoles = user.roles || [];
    const aggregatedPermissions = {};
    let isAdmin = false;
    
    userRoles.forEach(role => {
      if (role.codigo === 'ADMIN_GLOBAL') {
        isAdmin = true;
      }
      if (role.permissoes && typeof role.permissoes === 'object') {
        Object.entries(role.permissoes).forEach(([key, value]) => {
          if (key === 'all') return;
          if (!aggregatedPermissions[key]) {
            aggregatedPermissions[key] = [];
          }
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (!aggregatedPermissions[key].includes(v)) {
                aggregatedPermissions[key].push(v);
              }
            });
          }
        });
      }
    });
    
    user.aggregatedPermissions = aggregatedPermissions;
    user.isAdmin = isAdmin || user.perfil === 'ADMIN_GLOBAL';
    user.roleCodes = userRoles.map(r => r.codigo);

    const userPerms = await UserPermission.findAll({
      where: { user_id: user.id },
      attributes: ['permission_key']
    });
    user.permissions = userPerms.map(p => p.permission_key);

    req.user = user;
    
    const isGestorDashboard = user.roleCodes?.includes('GESTOR_DASHBOARD') || user.perfil === 'GESTOR_DASHBOARD';
    const isAlsoAdmin = user.isAdmin || user.roleCodes?.includes('ADMIN_GLOBAL');
    
    if (isGestorDashboard && !isAlsoAdmin) {
      const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      const allowedEndpoints = [
        '/api/auth/definir-senha',
        '/api/auth/logout',
        '/api/auth/me'
      ];
      const isAllowedEndpoint = allowedEndpoints.some(ep => req.originalUrl.startsWith(ep));
      
      if (writeMethods.includes(req.method) && !isAllowedEndpoint) {
        await logAccessDenied(user.id, 'write_blocked', req.method, req.originalUrl);
        return res.status(403).json({ 
          error: 'GESTOR_DASHBOARD tem acesso somente leitura. Ações de escrita não são permitidas.',
          code: 'READONLY_ROLE'
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const isAdminGlobal = async (req, res, next) => {
  if (!req.user.isAdmin && req.user.perfil !== 'ADMIN_GLOBAL') {
    await logAccessDenied(req.user.id, 'admin', 'access', req.originalUrl);
    return res.status(403).json({ error: 'Acesso negado. Apenas Admin Global.' });
  }
  next();
};

const isGestorOuAdmin = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'GERENTE_OP'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  
  if (!req.user.isAdmin && !hasRole && !['ADMIN_GLOBAL', 'GESTOR_FRANQUIA'].includes(req.user.perfil)) {
    await logAccessDenied(req.user.id, 'gestor', 'access', req.originalUrl);
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

const hasDashboardGlobalAccess = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'];
  const allowedPerfis = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const hasPerfil = allowedPerfis.includes(req.user.perfil);
  const perms = req.user.aggregatedPermissions || {};
  
  if (!req.user.isAdmin && !hasRole && !hasPerfil && !perms.dashboard_global?.includes('read')) {
    await logAccessDenied(req.user.id, 'dashboard_global', 'read', req.originalUrl);
    return res.status(403).json({ error: 'Acesso ao Dashboard Global negado.' });
  }
  next();
};

const hasDashboardOperacionalAccess = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'GERENTE_OP', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'VENDEDOR_LOJA', 'VENDEDOR_TMI'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const perms = req.user.aggregatedPermissions || {};
  
  if (!req.user.isAdmin && !hasRole && !perms.dashboard_operational?.includes('read')) {
    await logAccessDenied(req.user.id, 'dashboard_operacional', 'read', req.originalUrl);
    return res.status(403).json({ error: 'Acesso ao Dashboard Operacional negado.' });
  }
  next();
};

const hasDashboardFinanceiroAccess = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'FINANCEIRO', 'FRANQUEADO_GESTOR'];
  const blockedRoles = ['GERENTE_OP', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'VENDEDOR_TMI', 'VENDEDOR_LOJA', 'GERENTE_LOJA'];
  const isBlocked = req.user.roleCodes?.some(code => blockedRoles.includes(code)) && 
                    !req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const perms = req.user.aggregatedPermissions || {};
  
  if (!req.user.isAdmin && (isBlocked || (!hasRole && !perms.dashboard_financial?.includes('read')))) {
    await logAccessDenied(req.user.id, 'dashboard_financeiro', 'read', req.originalUrl);
    return res.status(403).json({ error: 'Acesso ao Dashboard Financeiro negado.' });
  }
  next();
};

const isGerenteOPBlocked = async (req, res, next) => {
  const blockedRoles = ['GERENTE_OP'];
  const isBlocked = req.user.roleCodes?.includes('GERENTE_OP') && !req.user.isAdmin;
  
  if (isBlocked) {
    await logAccessDenied(req.user.id, 'financeiro', 'access_blocked_gerente_op', req.originalUrl);
    return res.status(403).json({ error: 'GERENTE_OP não tem acesso a este módulo.' });
  }
  next();
};

const hasPermission = (resource, action = 'read') => {
  return async (req, res, next) => {
    if (req.user.isAdmin || req.user.perfil === 'ADMIN_GLOBAL') {
      return next();
    }
    
    const perms = req.user.aggregatedPermissions || {};
    if (perms[resource] && perms[resource].includes(action)) {
      return next();
    }
    
    const legacyPerms = req.user.permissoes || {};
    if (legacyPerms[resource] && (legacyPerms[resource] === true || legacyPerms[resource].includes(action))) {
      return next();
    }
    
    await logAccessDenied(req.user.id, resource, action, req.originalUrl);
    return res.status(403).json({ error: `Permissão negada para ${action} em ${resource}` });
  };
};

const hasFinanceiroAccess = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'FINANCEIRO', 'FRANQUEADO_GESTOR'];
  const allowedPerfis = ['ADMIN_GLOBAL', 'GESTOR_FRANQUIA', 'FINANCEIRO'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const hasPerfil = allowedPerfis.includes(req.user.perfil);
  const perms = req.user.aggregatedPermissions || {};
  
  if (!req.user.isAdmin && !hasRole && !hasPerfil && !perms.financeiro?.includes('read')) {
    await logAccessDenied(req.user.id, 'financeiro', 'access', req.originalUrl);
    return res.status(403).json({ error: 'Acesso ao módulo Financeiro negado.' });
  }
  next();
};

const hasFiscalAccess = async (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'FINANCEIRO', 'FRANQUEADO_GESTOR'];
  const allowedPerfis = ['ADMIN_GLOBAL', 'GESTOR_FRANQUIA', 'FINANCEIRO'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  const hasPerfil = allowedPerfis.includes(req.user.perfil);
  const perms = req.user.aggregatedPermissions || {};
  
  if (!req.user.isAdmin && !hasRole && !hasPerfil && !perms.fiscal?.includes('read')) {
    await logAccessDenied(req.user.id, 'fiscal', 'access', req.originalUrl);
    return res.status(403).json({ error: 'Acesso ao módulo Fiscal negado.' });
  }
  next();
};

const filterByStore = (req, res, next) => {
  if (req.user.isAdmin || req.user.perfil === 'ADMIN_GLOBAL') {
    req.storeFilter = {};
  } else {
    req.storeFilter = { loja_id: req.user.loja_id };
  }
  next();
};

const filterByCompany = (req, res, next) => {
  if (req.user.isAdmin || req.user.perfil === 'ADMIN_GLOBAL') {
    req.companyFilter = {};
  } else {
    req.companyFilter = { empresa_id: req.user.empresa_id };
  }
  next();
};

const checkStoreScope = async (req, res, next) => {
  if (req.user.isAdmin || req.user.perfil === 'ADMIN_GLOBAL') {
    return next();
  }
  
  const requestedStoreId = req.params.storeId || req.body.loja_id || req.query.loja_id;
  
  if (requestedStoreId && parseInt(requestedStoreId) !== req.user.loja_id) {
    await logAccessDenied(req.user.id, 'store_scope', 'access', req.originalUrl);
    return res.status(403).json({ error: 'Acesso negado. Você só pode acessar dados da sua loja.' });
  }
  
  next();
};

const GESTOR_ALLOWED_ENDPOINTS = [
  '/api/auth/definir-senha',
  '/api/auth/logout',
  '/api/auth/me'
];

const blockGestorDashboardWrite = async (req, res, next) => {
  const isGestorDashboard = req.user.roleCodes?.includes('GESTOR_DASHBOARD') || req.user.perfil === 'GESTOR_DASHBOARD';
  const isAlsoAdmin = req.user.isAdmin || req.user.roleCodes?.includes('ADMIN_GLOBAL');
  
  if (isGestorDashboard && !isAlsoAdmin) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const isAllowedEndpoint = GESTOR_ALLOWED_ENDPOINTS.some(ep => req.originalUrl.startsWith(ep));
    
    if (writeMethods.includes(req.method) && !isAllowedEndpoint) {
      await logAccessDenied(req.user.id, 'write_blocked', req.method, req.originalUrl);
      return res.status(403).json({ 
        error: 'GESTOR_DASHBOARD tem acesso somente leitura. Ações de escrita não são permitidas.',
        code: 'READONLY_ROLE'
      });
    }
  }
  next();
};

const isGestorDashboardReadOnly = (req) => {
  const isGestorDashboard = req.user.roleCodes?.includes('GESTOR_DASHBOARD') || req.user.perfil === 'GESTOR_DASHBOARD';
  const isAlsoAdmin = req.user.isAdmin || req.user.roleCodes?.includes('ADMIN_GLOBAL');
  return isGestorDashboard && !isAlsoAdmin;
};

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  isAdminGlobal,
  isGestorOuAdmin,
  hasDashboardGlobalAccess,
  hasDashboardOperacionalAccess,
  hasDashboardFinanceiroAccess,
  isGerenteOPBlocked,
  hasPermission,
  hasFinanceiroAccess,
  hasFiscalAccess,
  filterByStore,
  filterByCompany,
  checkStoreScope,
  blockGestorDashboardWrite,
  isGestorDashboardReadOnly,
  logAccessDenied
};
