const { UserPermission, AuditLog } = require('../models');

const logAccessDenied = async (userId, resource, action, details) => {
  try {
    await AuditLog.create({
      user_id: userId,
      acao: 'ACESSO_NEGADO',
      recurso: resource,
      detalhes: { action, details, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err);
  }
};

const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      if (req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin) {
        return next();
      }

      if (!req.user.permissions || req.user.permissions.length === 0) {
        const userPerms = await UserPermission.findAll({
          where: { user_id: req.user.id },
          attributes: ['permission_key']
        });
        req.user.permissions = userPerms.map(p => p.permission_key);
      }

      const hasAll = requiredPermissions.every(perm => 
        req.user.permissions.includes(perm)
      );

      if (!hasAll) {
        await logAccessDenied(req.user.id, requiredPermissions.join(','), req.method, req.originalUrl);
        return res.status(403).json({ 
          error: 'Acesso negado. Permissão insuficiente.',
          code: 'PERMISSION_DENIED',
          required: requiredPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de permissão:', error);
      return res.status(500).json({ error: 'Erro interno ao verificar permissões' });
    }
  };
};

const requireAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      if (req.user.perfil === 'ADMIN_GLOBAL' || req.user.isAdmin) {
        return next();
      }

      if (!req.user.permissions || req.user.permissions.length === 0) {
        const userPerms = await UserPermission.findAll({
          where: { user_id: req.user.id },
          attributes: ['permission_key']
        });
        req.user.permissions = userPerms.map(p => p.permission_key);
      }

      const hasAny = requiredPermissions.some(perm => 
        req.user.permissions.includes(perm)
      );

      if (!hasAny) {
        await logAccessDenied(req.user.id, requiredPermissions.join('|'), req.method, req.originalUrl);
        return res.status(403).json({ 
          error: 'Acesso negado. Permissão insuficiente.',
          code: 'PERMISSION_DENIED',
          requiredAny: requiredPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de permissão:', error);
      return res.status(500).json({ error: 'Erro interno ao verificar permissões' });
    }
  };
};

const hasPermission = (user, permissionKey) => {
  if (user.perfil === 'ADMIN_GLOBAL' || user.isAdmin) {
    return true;
  }
  return user.permissions && user.permissions.includes(permissionKey);
};

const hasAnyPermission = (user, permissionKeys) => {
  if (user.perfil === 'ADMIN_GLOBAL' || user.isAdmin) {
    return true;
  }
  return permissionKeys.some(key => user.permissions && user.permissions.includes(key));
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  hasPermission,
  hasAnyPermission,
  logAccessDenied
};
