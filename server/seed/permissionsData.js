const PERMISSIONS_CATALOG = [
  { key: 'dashboard.view_global', module: 'DASHBOARD', label: 'Ver Dashboard Global', description: 'Visualizar métricas de todas as franquias', sort_order: 1 },
  { key: 'dashboard.view_operational', module: 'DASHBOARD', label: 'Ver Dashboard Operacional', description: 'Visualizar métricas operacionais', sort_order: 2 },
  { key: 'dashboard.view_financial', module: 'DASHBOARD', label: 'Ver Dashboard Financeiro', description: 'Visualizar métricas financeiras', sort_order: 3 },
  { key: 'dashboard.view_personal', module: 'DASHBOARD', label: 'Ver Dashboard Pessoal', description: 'Visualizar métricas pessoais/vendedor', sort_order: 4 },

  { key: 'customers.view', module: 'CLIENTES', label: 'Visualizar Clientes', description: 'Ver lista e detalhes de clientes', sort_order: 10 },
  { key: 'customers.manage', module: 'CLIENTES', label: 'Gerenciar Clientes', description: 'Criar e editar clientes', sort_order: 11 },
  { key: 'customers.delete', module: 'CLIENTES', label: 'Excluir Clientes', description: 'Remover clientes do sistema', sort_order: 12 },

  { key: 'catalog.view', module: 'CATALOGO', label: 'Visualizar Catálogo', description: 'Ver produtos, peças e motos', sort_order: 20 },
  { key: 'catalog.manage', module: 'CATALOGO', label: 'Gerenciar Catálogo', description: 'Criar e editar produtos', sort_order: 21 },
  { key: 'catalog.import_spreadsheet', module: 'CATALOGO', label: 'Importar Planilha', description: 'Importar produtos via planilha', sort_order: 22 },
  { key: 'catalog.manage_taxes', module: 'CATALOGO', label: 'Gerenciar Impostos', description: 'Configurar impostos dos produtos', sort_order: 23 },

  { key: 'services.view', module: 'SERVICOS', label: 'Visualizar Serviços', description: 'Ver lista de serviços', sort_order: 30 },
  { key: 'services.manage', module: 'SERVICOS', label: 'Gerenciar Serviços', description: 'Criar e editar serviços', sort_order: 31 },

  { key: 'sales.view', module: 'VENDAS', label: 'Visualizar Vendas', description: 'Ver lista e detalhes de vendas', sort_order: 40 },
  { key: 'sales.manage', module: 'VENDAS', label: 'Gerenciar Vendas', description: 'Criar e editar vendas', sort_order: 41 },
  { key: 'sales.apply_discount', module: 'VENDAS', label: 'Aplicar Desconto', description: 'Aplicar descontos em vendas', sort_order: 42 },
  { key: 'sales.override_discount_limit', module: 'VENDAS', label: 'Ultrapassar Limite Desconto', description: 'Aplicar descontos além do limite padrão', sort_order: 43 },
  { key: 'sales.refund_or_cancel', module: 'VENDAS', label: 'Reembolsar/Cancelar', description: 'Cancelar ou reembolsar vendas', sort_order: 44 },

  { key: 'os.view', module: 'ORDEM_SERVICO', label: 'Visualizar OS', description: 'Ver ordens de serviço', sort_order: 50 },
  { key: 'os.manage', module: 'ORDEM_SERVICO', label: 'Gerenciar OS', description: 'Criar e editar ordens de serviço', sort_order: 51 },
  { key: 'os.close', module: 'ORDEM_SERVICO', label: 'Fechar OS', description: 'Encerrar ordens de serviço', sort_order: 52 },

  { key: 'stock_central.view', module: 'ESTOQUE_CENTRAL', label: 'Ver Estoque Central', description: 'Visualizar estoque da TM Imports', sort_order: 60 },
  { key: 'stock_central.manage', module: 'ESTOQUE_CENTRAL', label: 'Gerenciar Estoque Central', description: 'Ajustar estoque central', sort_order: 61 },
  { key: 'stock_central.transfer_to_store', module: 'ESTOQUE_CENTRAL', label: 'Transferir para Loja', description: 'Transferir produtos para lojas', sort_order: 62 },

  { key: 'stock_store.view', module: 'ESTOQUE_LOJA', label: 'Ver Estoque Loja', description: 'Visualizar estoque da loja', sort_order: 70 },
  { key: 'stock_store.manage', module: 'ESTOQUE_LOJA', label: 'Gerenciar Estoque Loja', description: 'Ajustar estoque da loja', sort_order: 71 },

  { key: 'franchise_orders.view', module: 'PEDIDOS', label: 'Visualizar Pedidos', description: 'Ver pedidos de franquias', sort_order: 80 },
  { key: 'franchise_orders.create', module: 'PEDIDOS', label: 'Criar Pedidos', description: 'Criar solicitações de compra', sort_order: 81 },
  { key: 'franchise_orders.approve', module: 'PEDIDOS', label: 'Aprovar Pedidos', description: 'Aprovar pedidos de franquias', sort_order: 82 },
  { key: 'franchise_orders.invoice', module: 'PEDIDOS', label: 'Faturar Pedidos', description: 'Emitir nota fiscal de pedidos', sort_order: 83 },
  { key: 'franchise_orders.ship', module: 'PEDIDOS', label: 'Expedir Pedidos', description: 'Marcar pedidos como enviados', sort_order: 84 },
  { key: 'franchise_orders.confirm_receipt', module: 'PEDIDOS', label: 'Confirmar Recebimento', description: 'Confirmar recebimento de pedidos', sort_order: 85 },
  { key: 'franchise_orders.cancel', module: 'PEDIDOS', label: 'Cancelar Pedidos', description: 'Cancelar pedidos pendentes', sort_order: 86 },

  { key: 'finance.view', module: 'FINANCEIRO', label: 'Visualizar Financeiro', description: 'Ver módulo financeiro', sort_order: 90 },
  { key: 'finance.manage_payable', module: 'FINANCEIRO', label: 'Gerenciar Contas a Pagar', description: 'Criar e editar contas a pagar', sort_order: 91 },
  { key: 'finance.manage_receivable', module: 'FINANCEIRO', label: 'Gerenciar Contas a Receber', description: 'Criar e editar contas a receber', sort_order: 92 },
  { key: 'finance.manage_cashflow', module: 'FINANCEIRO', label: 'Gerenciar Fluxo de Caixa', description: 'Administrar fluxo de caixa', sort_order: 93 },
  { key: 'finance.manage_recurring', module: 'FINANCEIRO', label: 'Gerenciar Recorrências', description: 'Gerenciar pagamentos recorrentes', sort_order: 94 },

  { key: 'users.view', module: 'USUARIOS', label: 'Visualizar Usuários', description: 'Ver lista de usuários', sort_order: 100 },
  { key: 'users.manage', module: 'USUARIOS', label: 'Gerenciar Usuários', description: 'Criar e editar usuários', sort_order: 101 },
  { key: 'users.permissions_manage', module: 'USUARIOS', label: 'Gerenciar Permissões', description: 'Alterar permissões de usuários', sort_order: 102 },

  { key: 'franchises.view', module: 'FRANQUIAS', label: 'Visualizar Franquias', description: 'Ver lista de franquias/lojas', sort_order: 110 },
  { key: 'franchises.manage', module: 'FRANQUIAS', label: 'Gerenciar Franquias', description: 'Criar e editar franquias', sort_order: 111 },

  { key: 'analytics.rankings.view', module: 'ANALYTICS', label: 'Ver Rankings', description: 'Visualizar rankings de produtos', sort_order: 120 },
  { key: 'analytics.low_movers.view', module: 'ANALYTICS', label: 'Ver Low Movers', description: 'Visualizar produtos parados', sort_order: 121 },

  { key: 'reports.view', module: 'RELATORIOS', label: 'Visualizar Relatórios', description: 'Ver relatórios do sistema', sort_order: 130 },
  { key: 'reports.export', module: 'RELATORIOS', label: 'Exportar Relatórios', description: 'Exportar relatórios em PDF/Excel', sort_order: 131 },

  { key: 'settings.view', module: 'CONFIGURACOES', label: 'Visualizar Configurações', description: 'Ver configurações do sistema', sort_order: 140 },
  { key: 'settings.manage', module: 'CONFIGURACOES', label: 'Gerenciar Configurações', description: 'Alterar configurações do sistema', sort_order: 141 },

  { key: 'audit.view', module: 'AUDITORIA', label: 'Visualizar Auditoria', description: 'Ver logs de auditoria', sort_order: 150 },

  { key: 'admin.seed_reset', module: 'ADMIN', label: 'Reset de Dados', description: 'Limpar/resetar dados do sistema', sort_order: 200 }
];

const MODULES_ORDER = [
  { code: 'DASHBOARD', label: 'Dashboard', icon: 'chart-line' },
  { code: 'CLIENTES', label: 'Clientes', icon: 'users' },
  { code: 'CATALOGO', label: 'Catálogo', icon: 'box' },
  { code: 'SERVICOS', label: 'Serviços', icon: 'tools' },
  { code: 'VENDAS', label: 'Vendas', icon: 'shopping-cart' },
  { code: 'ORDEM_SERVICO', label: 'Ordem de Serviço', icon: 'clipboard-list' },
  { code: 'ESTOQUE_CENTRAL', label: 'Estoque Central', icon: 'warehouse' },
  { code: 'ESTOQUE_LOJA', label: 'Estoque Loja', icon: 'store' },
  { code: 'PEDIDOS', label: 'Pedidos', icon: 'truck' },
  { code: 'FINANCEIRO', label: 'Financeiro', icon: 'dollar-sign' },
  { code: 'USUARIOS', label: 'Usuários', icon: 'user-cog' },
  { code: 'FRANQUIAS', label: 'Franquias', icon: 'building' },
  { code: 'ANALYTICS', label: 'Analytics', icon: 'chart-bar' },
  { code: 'RELATORIOS', label: 'Relatórios', icon: 'file-alt' },
  { code: 'CONFIGURACOES', label: 'Configurações', icon: 'cog' },
  { code: 'AUDITORIA', label: 'Auditoria', icon: 'history' },
  { code: 'ADMIN', label: 'Administração', icon: 'shield-alt' }
];

const LEGACY_PROFILE_MAPPING = {
  'GESTOR_FRANQUIA': [
    'dashboard.view_operational', 'dashboard.view_financial', 'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view', 'catalog.manage',
    'services.view', 'services.manage',
    'sales.view', 'sales.manage', 'sales.apply_discount',
    'os.view', 'os.manage', 'os.close',
    'stock_store.view', 'stock_store.manage',
    'franchise_orders.view', 'franchise_orders.create', 'franchise_orders.confirm_receipt',
    'finance.view', 'finance.manage_payable', 'finance.manage_receivable', 'finance.manage_cashflow',
    'users.view', 'users.manage',
    'analytics.rankings.view', 'analytics.low_movers.view',
    'reports.view', 'reports.export',
    'settings.view'
  ],
  'OPERACIONAL': [
    'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view',
    'services.view',
    'sales.view', 'sales.manage',
    'os.view', 'os.manage',
    'stock_store.view'
  ],
  'GESTOR_DASHBOARD': [
    'dashboard.view_global', 'dashboard.view_operational', 'dashboard.view_financial', 'dashboard.view_personal',
    'customers.view', 'catalog.view', 'services.view', 'sales.view', 'os.view',
    'stock_central.view', 'stock_store.view', 'franchise_orders.view',
    'finance.view', 'users.view', 'franchises.view',
    'analytics.rankings.view', 'analytics.low_movers.view',
    'reports.view', 'audit.view'
  ],
  'GERENTE_OP': [
    'dashboard.view_operational',
    'customers.view', 'customers.manage',
    'catalog.view', 'catalog.manage',
    'services.view', 'services.manage',
    'sales.view', 'sales.manage', 'sales.apply_discount',
    'os.view', 'os.manage', 'os.close',
    'stock_central.view', 'stock_central.manage', 'stock_central.transfer_to_store',
    'stock_store.view', 'stock_store.manage',
    'franchise_orders.view', 'franchise_orders.approve', 'franchise_orders.ship',
    'franchises.view',
    'analytics.rankings.view', 'analytics.low_movers.view'
  ],
  'FINANCEIRO': [
    'dashboard.view_financial',
    'finance.view', 'finance.manage_payable', 'finance.manage_receivable', 'finance.manage_cashflow', 'finance.manage_recurring',
    'reports.view', 'reports.export'
  ],
  'ADM1_LOGISTICA': [
    'dashboard.view_operational', 'dashboard.view_financial',
    'stock_central.view', 'stock_central.manage', 'stock_central.transfer_to_store',
    'franchise_orders.view', 'franchise_orders.approve', 'franchise_orders.invoice', 'franchise_orders.ship',
    'finance.view', 'finance.manage_payable', 'finance.manage_receivable'
  ],
  'ADM2_CADASTRO': [
    'catalog.view', 'catalog.manage', 'catalog.import_spreadsheet',
    'services.view', 'services.manage',
    'customers.view', 'customers.manage',
    'users.view', 'users.manage',
    'franchises.view', 'franchises.manage'
  ],
  'ADM3_OS_GARANTIA': [
    'dashboard.view_operational',
    'os.view', 'os.manage', 'os.close',
    'customers.view',
    'catalog.view',
    'stock_store.view'
  ],
  'VENDEDOR_TMI': [
    'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view',
    'stock_central.view',
    'sales.view', 'sales.manage'
  ],
  'FRANQUEADO_GESTOR': [
    'dashboard.view_operational', 'dashboard.view_financial', 'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view', 'catalog.manage',
    'services.view', 'services.manage',
    'sales.view', 'sales.manage', 'sales.apply_discount',
    'os.view', 'os.manage', 'os.close',
    'stock_store.view', 'stock_store.manage',
    'franchise_orders.view', 'franchise_orders.create', 'franchise_orders.confirm_receipt',
    'finance.view', 'finance.manage_payable', 'finance.manage_receivable', 'finance.manage_cashflow',
    'users.view', 'users.manage', 'users.permissions_manage',
    'analytics.rankings.view', 'analytics.low_movers.view',
    'reports.view', 'reports.export',
    'settings.view'
  ],
  'GERENTE_LOJA': [
    'dashboard.view_operational', 'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view',
    'services.view',
    'sales.view', 'sales.manage', 'sales.apply_discount',
    'os.view', 'os.manage', 'os.close',
    'stock_store.view', 'stock_store.manage',
    'users.view',
    'analytics.rankings.view'
  ],
  'VENDEDOR_LOJA': [
    'dashboard.view_personal',
    'customers.view', 'customers.manage',
    'catalog.view',
    'stock_store.view',
    'sales.view', 'sales.manage',
    'os.view', 'os.manage'
  ]
};

module.exports = {
  PERMISSIONS_CATALOG,
  MODULES_ORDER,
  LEGACY_PROFILE_MAPPING
};
