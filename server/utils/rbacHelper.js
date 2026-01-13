const { User, Role, UserRole, Store, Company } = require('../models');

const dashboardHomeByRole = {
  ADMIN_GLOBAL: '/app/dashboard/global',
  GESTOR_DASHBOARD: '/app/dashboard/global',
  FINANCEIRO: '/app/dashboard/financeiro',
  GERENTE_OP: '/app/dashboard/operacional',
  ADM1_LOGISTICA: '/app/dashboard/financeiro',
  ADM2_CADASTRO: '/app/dashboard/operacional',
  ADM3_OS_GARANTIA: '/app/dashboard/operacional',
  VENDEDOR_TMI: '/app/dashboard/pessoal',
  GESTOR_FRANQUIA: '/app/dashboard/operacional',
  FRANQUEADO_GESTOR: '/app/dashboard/operacional',
  GERENTE_LOJA: '/app/dashboard/operacional',
  VENDEDOR_LOJA: '/app/dashboard/pessoal'
};

const dashboardAccessRules = {
  global: ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'],
  financeiro: ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD', 'FINANCEIRO', 'ADM1_LOGISTICA', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA'],
  operacional: ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD', 'GERENTE_OP', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'VENDEDOR_LOJA'],
  pessoal: ['VENDEDOR_TMI', 'VENDEDOR_LOJA', 'ADMIN_GLOBAL', 'GESTOR_DASHBOARD', 'GERENTE_OP', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA']
};

async function resolveAuthContext(userId) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Store, as: 'loja' },
      { model: Company },
      { model: Role, as: 'roles', through: { attributes: ['principal'] } }
    ]
  });

  if (!user) {
    return null;
  }

  const userRoles = user.roles || [];
  const roleCodes = userRoles.map(r => r.codigo);
  
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

  const permissions = [];
  Object.entries(aggregatedPermissions).forEach(([resource, actions]) => {
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        permissions.push(`${resource}:${action}`);
      });
    }
  });

  let dashboardHome = '/app/dashboard/operacional';
  let scope = user.loja_id ? 'STORE' : 'TMIMPORTS';

  if (isAdmin || roleCodes.includes('ADMIN_GLOBAL')) {
    dashboardHome = '/app/dashboard/global';
    scope = 'TMIMPORTS';
  } else {
    for (const roleCode of roleCodes) {
      if (dashboardHomeByRole[roleCode]) {
        dashboardHome = dashboardHomeByRole[roleCode];
        break;
      }
    }
  }

  if (roleCodes.some(r => ['FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'VENDEDOR_LOJA'].includes(r))) {
    scope = 'STORE';
  }

  return {
    user: {
      id: user.id,
      name: user.nome,
      email: user.email,
      storeId: user.loja_id,
      storeName: user.loja?.nome || null,
      companyId: user.empresa_id,
      perfil: user.perfil
    },
    roles: roleCodes,
    permissions: permissions,
    aggregatedPermissions: aggregatedPermissions,
    scope: scope,
    storeId: user.loja_id,
    dashboardHome: dashboardHome,
    isAdmin: isAdmin,
    canAccessDashboard: {
      global: isAdmin || roleCodes.some(r => dashboardAccessRules.global.includes(r)),
      financeiro: isAdmin || roleCodes.some(r => dashboardAccessRules.financeiro.includes(r)),
      operacional: isAdmin || roleCodes.some(r => dashboardAccessRules.operacional.includes(r)),
      pessoal: isAdmin || roleCodes.some(r => dashboardAccessRules.pessoal.includes(r))
    }
  };
}

function hasPermission(aggregatedPermissions, resource, action = 'read') {
  if (!aggregatedPermissions) return false;
  if (aggregatedPermissions[resource] && aggregatedPermissions[resource].includes(action)) {
    return true;
  }
  return false;
}

function canAccessResource(authContext, resource, action = 'read') {
  if (authContext.isAdmin) return true;
  return hasPermission(authContext.aggregatedPermissions, resource, action);
}

module.exports = {
  resolveAuthContext,
  hasPermission,
  canAccessResource,
  dashboardHomeByRole,
  dashboardAccessRules
};
