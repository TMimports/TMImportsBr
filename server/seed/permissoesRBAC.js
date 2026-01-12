const permissoesPorRole = {
  ADMIN_GLOBAL: {
    dashboard_global: ['read'],
    dashboard_operational: ['read'],
    dashboard_financial: ['read'],
    financeiro: ['read', 'create', 'update', 'delete'],
    fiscal: ['read', 'create', 'update', 'delete'],
    franquias: ['read', 'create', 'update', 'delete'],
    pedidos: ['read', 'create', 'update', 'delete', 'approve', 'invoice', 'ship', 'confirm'],
    estoque_central: ['read', 'create', 'update', 'delete'],
    estoque_loja: ['read', 'create', 'update', 'delete'],
    catalogo: ['read', 'create', 'update', 'delete', 'import'],
    os: ['read', 'create', 'update', 'delete'],
    garantia: ['read', 'create', 'update', 'delete'],
    clientes: ['read', 'create', 'update', 'delete'],
    rankings: ['read'],
    low_movers: ['read'],
    usuarios: ['read', 'create', 'update', 'delete'],
    usuarios_loja: ['read', 'create', 'update', 'delete'],
    configuracoes: ['read', 'update'],
    seed_reset: ['execute']
  },
  GESTOR_DASHBOARD: {
    dashboard_global: ['read'],
    franquias: ['read'],
    rankings: ['read'],
    low_movers: ['read'],
    catalogo: ['read'],
    estoque_central: ['read'],
    pedidos: ['read'],
    os: ['read'],
    clientes: ['read']
  },
  GERENTE_OP: {
    dashboard_operational: ['read'],
    franquias: ['read', 'update'],
    pedidos: ['read', 'create', 'update', 'approve', 'ship'],
    estoque_central: ['read', 'create', 'update'],
    catalogo: ['read', 'create', 'update', 'import'],
    os: ['read', 'create', 'update'],
    garantia: ['read', 'create', 'update'],
    clientes: ['read', 'create', 'update']
  },
  FINANCEIRO: {
    dashboard_financial: ['read'],
    financeiro: ['read', 'create', 'update', 'delete'],
    fiscal: ['read', 'create', 'update', 'delete'],
    pedidos: ['read'],
    catalogo: ['read'],
    clientes: ['read'],
    franquias: ['read']
  },
  ADM1_LOGISTICA: {
    pedidos: ['read', 'update', 'ship', 'confirm'],
    estoque_central: ['read', 'create', 'update'],
    franquias: ['read']
  },
  ADM2_CADASTRO: {
    usuarios: ['read', 'create', 'update'],
    franquias: ['read', 'create', 'update'],
    catalogo: ['read', 'create', 'update', 'import'],
    configuracoes: ['read', 'update']
  },
  ADM3_OS_GARANTIA: {
    os: ['read', 'create', 'update'],
    garantia: ['read', 'create', 'update'],
    clientes: ['read'],
    franquias: ['read']
  },
  VENDEDOR_TMI: {
    estoque_central: ['read'],
    catalogo: ['read'],
    pedidos: ['read', 'create', 'update'],
    clientes: ['read']
  },
  FRANQUEADO_GESTOR: {
    dashboard_operational: ['read'],
    estoque_loja: ['read', 'create', 'update'],
    pedidos: ['read', 'create', 'update', 'confirm'],
    catalogo: ['read'],
    os: ['read', 'create', 'update'],
    clientes: ['read', 'create', 'update'],
    financeiro: ['read', 'create', 'update'],
    rankings: ['read'],
    low_movers: ['read'],
    usuarios_loja: ['read', 'create', 'update', 'delete']
  },
  GERENTE_LOJA: {
    dashboard_operational: ['read'],
    estoque_loja: ['read', 'create', 'update'],
    pedidos: ['read', 'create', 'update'],
    os: ['read', 'create', 'update'],
    clientes: ['read', 'create', 'update'],
    financeiro: ['read', 'create', 'update'],
    rankings: ['read'],
    low_movers: ['read']
  },
  VENDEDOR_LOJA: {
    dashboard_operational: ['read'],
    estoque_loja: ['read'],
    os: ['read', 'create', 'update'],
    clientes: ['read', 'create', 'update'],
    pedidos: ['read', 'create', 'update']
  }
};

async function atualizarPermissoes(models) {
  const { Role } = models;
  
  try {
    console.log('Atualizando permissões RBAC...');
    
    for (const [codigo, permissoes] of Object.entries(permissoesPorRole)) {
      const role = await Role.findOne({ where: { codigo } });
      if (role) {
        await role.update({ permissoes });
        console.log(`  - ${codigo}: permissões atualizadas`);
      } else {
        console.log(`  - ${codigo}: role não encontrada`);
      }
    }
    
    console.log('Permissões RBAC atualizadas com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    throw error;
  }
}

module.exports = { permissoesPorRole, atualizarPermissoes };
