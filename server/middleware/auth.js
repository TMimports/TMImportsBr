const jwt = require('jsonwebtoken');
const { User, Store, Company, Role, UserRole } = require('../models');

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
      if (role.permissoes?.all === true) {
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

const isAdminGlobal = (req, res, next) => {
  if (!req.user.isAdmin && req.user.perfil !== 'ADMIN_GLOBAL') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Admin Global.' });
  }
  next();
};

const isGestorOuAdmin = (req, res, next) => {
  const allowedRoles = ['ADMIN_GLOBAL', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'GERENTE_OP'];
  const hasRole = req.user.roleCodes?.some(code => allowedRoles.includes(code));
  
  if (!req.user.isAdmin && !hasRole && !['ADMIN_GLOBAL', 'GESTOR_FRANQUIA'].includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

const hasPermission = (resource, action = 'read') => {
  return (req, res, next) => {
    if (req.user.isAdmin || req.user.perfil === 'ADMIN_GLOBAL') {
      return next();
    }
    
    const perms = req.user.aggregatedPermissions || {};
    if (perms[resource] && perms[resource].includes(action)) {
      return next();
    }
    
    const legacyPerms = req.user.permissoes || {};
    if (legacyPerms[resource]) {
      return next();
    }
    
    return res.status(403).json({ error: 'Permissão negada' });
  };
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

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  isAdminGlobal,
  isGestorOuAdmin,
  hasPermission,
  filterByStore,
  filterByCompany
};
