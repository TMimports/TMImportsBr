const jwt = require('jsonwebtoken');
const { User, Store, Company, Role, UserRole, AuditLog } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'tm-imports-tecle-motos-secret-2024';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil },
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

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

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

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  isAdminGlobal,
  isGestorOuAdmin,
  hasDashboardGlobalAccess,
  hasPermission,
  hasFinanceiroAccess,
  hasFiscalAccess,
  filterByStore,
  filterByCompany,
  checkStoreScope,
  logAccessDenied
};
