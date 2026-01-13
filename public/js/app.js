const API_URL = '';
let currentUser = null;
let currentPage = 'dashboard';

const menuItems = {
  ADMIN_GLOBAL: [
    { section: 'Principal', items: [
      { id: 'dashboard', label: 'Dashboard Global', icon: 'fas fa-chart-line' },
      { id: 'meu-dashboard', label: 'Meu Dashboard Vendedor', icon: 'fas fa-user-tie' },
      { id: 'rankings', label: 'Rankings', icon: 'fas fa-trophy' },
      { id: 'low-movers', label: 'Produtos Parados', icon: 'fas fa-snowflake' }
    ]},
    { section: 'Franquias', items: [
      { id: 'franquias', label: 'Gerenciar Franquias', icon: 'fas fa-store' },
      { id: 'franquias-dashboard', label: 'Dashboard Franquias', icon: 'fas fa-chart-pie' }
    ]},
    { section: 'Produtos', items: [
      { id: 'produtos', label: 'Produtos / Serviços', icon: 'fas fa-box' }
    ]},
    { section: 'Estoque', items: [
      { id: 'estoque-central', label: 'Estoque Central', icon: 'fas fa-warehouse' },
      { id: 'solicitacoes', label: 'Solicitações', icon: 'fas fa-truck' }
    ]},
    { section: 'Vendas', items: [
      { id: 'vendas', label: 'Vendas', icon: 'fas fa-shopping-cart' },
      { id: 'os', label: 'Ordens de Serviço', icon: 'fas fa-wrench' },
      { id: 'notas-fiscais', label: 'Notas Fiscais', icon: 'fas fa-file-invoice' },
      { id: 'clientes', label: 'Clientes', icon: 'fas fa-users' },
      { id: 'vendedores', label: 'Vendedores', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Financeiro', items: [
      { id: 'receber', label: 'Contas a Receber', icon: 'fas fa-hand-holding-usd' },
      { id: 'pagar', label: 'Contas a Pagar', icon: 'fas fa-file-invoice-dollar' },
      { id: 'conciliacao', label: 'Conciliação Bancária', icon: 'fas fa-university' },
      { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'fas fa-chart-bar' }
    ]},
    { section: 'Sistema', items: [
      { id: 'usuarios', label: 'Usuários', icon: 'fas fa-users-cog' },
      { id: 'configuracoes', label: 'Configurações', icon: 'fas fa-cog' },
      { id: 'auditoria', label: 'Logs de Auditoria', icon: 'fas fa-history' },
      { id: 'manual', label: 'Manual do Sistema', icon: 'fas fa-book' }
    ]}
  ],
  GESTOR_FRANQUIA: [
    { section: 'Principal', items: [
      { id: 'meu-dashboard', label: 'Meu Dashboard', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Produtos', items: [
      { id: 'produtos', label: 'Produtos / Serviços', icon: 'fas fa-box' }
    ]},
    { section: 'Estoque', items: [
      { id: 'estoque', label: 'Estoque da Loja', icon: 'fas fa-warehouse' },
      { id: 'solicitar', label: 'Solicitar Produtos', icon: 'fas fa-truck' }
    ]},
    { section: 'Vendas', items: [
      { id: 'vendas', label: 'Vendas', icon: 'fas fa-shopping-cart' },
      { id: 'os', label: 'Ordens de Serviço', icon: 'fas fa-wrench' },
      { id: 'notas-fiscais', label: 'Notas Fiscais', icon: 'fas fa-file-invoice' },
      { id: 'clientes', label: 'Clientes', icon: 'fas fa-users' },
      { id: 'vendedores', label: 'Vendedores', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Financeiro', items: [
      { id: 'receber', label: 'Contas a Receber', icon: 'fas fa-hand-holding-usd' },
      { id: 'pagar', label: 'Contas a Pagar', icon: 'fas fa-file-invoice-dollar' },
      { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'fas fa-chart-bar' }
    ]},
    { section: 'Sistema', items: [
      { id: 'usuarios', label: 'Usuários', icon: 'fas fa-users-cog' },
      { id: 'manual', label: 'Manual do Sistema', icon: 'fas fa-book' }
    ]}
  ],
  OPERACIONAL: [
    { section: 'Principal', items: [
      { id: 'meu-dashboard', label: 'Meu Dashboard', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Vendas', items: [
      { id: 'vendas', label: 'Minhas Vendas', icon: 'fas fa-shopping-cart' },
      { id: 'os', label: 'Ordens de Serviço', icon: 'fas fa-wrench' },
      { id: 'clientes', label: 'Clientes', icon: 'fas fa-users' }
    ]},
    { section: 'Consultas', items: [
      { id: 'produtos', label: 'Produtos', icon: 'fas fa-box' },
      { id: 'estoque', label: 'Estoque', icon: 'fas fa-warehouse' }
    ]}
  ],
  GERENTE_OP: [
    { section: 'Principal', items: [
      { id: 'meu-dashboard', label: 'Meu Dashboard', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Franquias', items: [
      { id: 'franquias', label: 'Gerenciar Franquias', icon: 'fas fa-store' }
    ]},
    { section: 'Produtos', items: [
      { id: 'produtos', label: 'Produtos / Serviços', icon: 'fas fa-box' }
    ]},
    { section: 'Estoque', items: [
      { id: 'estoque-central', label: 'Estoque Central', icon: 'fas fa-warehouse' },
      { id: 'solicitacoes', label: 'Solicitações', icon: 'fas fa-truck' }
    ]},
    { section: 'Vendas', items: [
      { id: 'vendas', label: 'Vendas', icon: 'fas fa-shopping-cart' },
      { id: 'os', label: 'Ordens de Serviço', icon: 'fas fa-wrench' },
      { id: 'clientes', label: 'Clientes', icon: 'fas fa-users' },
      { id: 'vendedores', label: 'Vendedores', icon: 'fas fa-user-tie' }
    ]},
    { section: 'Sistema', items: [
      { id: 'usuarios', label: 'Usuários', icon: 'fas fa-users-cog' },
      { id: 'manual', label: 'Manual do Sistema', icon: 'fas fa-book' }
    ]}
  ]
};

let notificationsVisible = false;

async function init() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    window.location.href = '/login';
    return;
  }
  
  try {
    currentUser = JSON.parse(user);
    
    // Verificar se é primeiro acesso - forçar troca de senha
    if (currentUser.primeiro_acesso) {
      renderDefinirSenha();
      return;
    }
    
    const sidebarLogo = document.getElementById('sidebarLogo');
    if (sidebarLogo) {
      if (currentUser.perfil === 'ADMIN_GLOBAL') {
        sidebarLogo.src = '/images/logo-tmimports.jpg';
        sidebarLogo.alt = 'TM Imports';
      } else {
        sidebarLogo.src = '/images/logo.png';
        sidebarLogo.alt = 'Tecle Motos';
      }
    }
    
    renderMenu();
    renderUserInfo();
    checkNotifications();
    
    const path = window.location.pathname.replace('/app/', '').replace('/app', '');
    if (path && path !== '/') {
      currentPage = path;
    }
    
    await loadPage(currentPage);
  } catch (error) {
    console.error('Erro ao inicializar:', error);
    logout();
  }
}

function renderDefinirSenha() {
  document.body.innerHTML = `
    <div class="login-page">
      <div class="login-container">
        <div class="login-logo">
          <img src="/images/logo-tmimports.jpg" alt="TM Imports" class="logo-img">
        </div>
        
        <div class="login-box">
          <h1><i class="fas fa-key"></i> Definir Nova Senha</h1>
          <p style="color: #aaa; margin-bottom: 20px; text-align: center;">
            Bem-vindo(a), <strong>${currentUser.nome}</strong>!<br>
            Por segurança, defina uma nova senha para continuar.
          </p>
          
          <form id="definirSenhaForm" onsubmit="salvarNovaSenha(event)">
            <div class="form-group">
              <label for="novaSenha">Nova Senha *</label>
              <input type="password" id="novaSenha" name="novaSenha" required minlength="6" placeholder="Mínimo 6 caracteres">
            </div>
            
            <div class="form-group">
              <label for="confirmarSenha">Confirmar Nova Senha *</label>
              <input type="password" id="confirmarSenha" name="confirmarSenha" required minlength="6" placeholder="Digite novamente">
            </div>
            
            <div id="senhaError" class="error-message" style="display: none;"></div>
            
            <button type="submit" class="btn btn-primary btn-block" id="btnSalvarSenha">
              <i class="fas fa-check"></i> Definir Senha e Continuar
            </button>
          </form>
        </div>
        
        <p class="login-footer">TM Imports - Sistema de Gestão</p>
      </div>
    </div>
  `;
}

async function salvarNovaSenha(event) {
  event.preventDefault();
  
  const novaSenha = document.getElementById('novaSenha').value;
  const confirmarSenha = document.getElementById('confirmarSenha').value;
  const errorDiv = document.getElementById('senhaError');
  const btn = document.getElementById('btnSalvarSenha');
  
  errorDiv.style.display = 'none';
  
  if (novaSenha !== confirmarSenha) {
    errorDiv.textContent = 'As senhas não coincidem!';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (novaSenha.length < 6) {
    errorDiv.textContent = 'A senha deve ter pelo menos 6 caracteres!';
    errorDiv.style.display = 'block';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  
  try {
    const response = await fetch('/api/auth/definir-senha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ novaSenha })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Atualizar usuário no localStorage
      currentUser.primeiro_acesso = false;
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      // Redirecionar para o app
      window.location.href = '/app';
    } else {
      errorDiv.textContent = data.error || 'Erro ao salvar senha';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Erro de conexão. Tente novamente.';
    errorDiv.style.display = 'block';
  }
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Definir Senha e Continuar';
}

function renderMenu() {
  const nav = document.getElementById('sidebarNav');
  const userMenu = menuItems[currentUser.perfil] || menuItems.OPERACIONAL;
  
  let html = '';
  for (const section of userMenu) {
    html += `<div class="nav-section">
      <div class="nav-section-title">${section.section}</div>`;
    
    for (const item of section.items) {
      html += `<div class="nav-item ${currentPage === item.id ? 'active' : ''}" 
                   onclick="navigate('${item.id}')">
        <i class="${item.icon}"></i>
        <span>${item.label}</span>
      </div>`;
    }
    html += '</div>';
  }
  
  nav.innerHTML = html;
}

function renderUserInfo() {
  const userInfo = document.getElementById('userInfo');
  const storeName = document.getElementById('storeName');
  
  const perfilLabels = {
    'ADMIN_GLOBAL': 'Admin Global',
    'GESTOR_FRANQUIA': 'Gestor de Franquia',
    'OPERACIONAL': 'Operacional',
    'GESTOR_DASHBOARD': 'Gestor Dashboard',
    'GERENTE_OP': 'Gerente Operacional',
    'FINANCEIRO': 'Financeiro',
    'ADM1_LOGISTICA': 'ADM Logística',
    'ADM2_CADASTRO': 'ADM Cadastro',
    'ADM3_OS_GARANTIA': 'ADM OS/Garantia',
    'VENDEDOR_TMI': 'Vendedor TM Imports',
    'FRANQUEADO_GESTOR': 'Franqueado/Gestor',
    'GERENTE_LOJA': 'Gerente de Loja',
    'VENDEDOR_LOJA': 'Vendedor Loja'
  };
  
  userInfo.innerHTML = `
    <div class="user-name">${currentUser.nome}</div>
    <div class="user-role">${perfilLabels[currentUser.perfil]}</div>
  `;
  
  if (currentUser.loja) {
    storeName.textContent = currentUser.loja.nome;
    storeName.style.display = 'inline-block';
  } else if (currentUser.perfil === 'ADMIN_GLOBAL') {
    storeName.textContent = 'TM Imports';
    storeName.style.display = 'inline-block';
  } else {
    storeName.style.display = 'none';
  }
}

async function navigate(page) {
  currentPage = page;
  window.history.pushState({}, '', `/app/${page}`);
  renderMenu();
  await loadPage(page);
}

async function loadPage(page) {
  const content = document.getElementById('content');
  const pageTitle = document.getElementById('pageTitle');
  
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
  
  const titles = {
    'dashboard': 'Dashboard',
    'dashboard/global': 'Dashboard Global',
    'dashboard/operacional': 'Dashboard Operacional',
    'dashboard/financeiro': 'Dashboard Financeiro',
    'dashboard/pessoal': 'Dashboard Pessoal',
    'produtos': 'Produtos / Serviços',
    'categorias': 'Categorias',
    'importar': 'Importar Planilha',
    'estoque-central': 'Estoque Central',
    'estoque': 'Estoque da Loja',
    'vendas': 'Vendas',
    'os': 'Ordens de Serviço',
    'clientes': 'Clientes',
    'vendedores': 'Vendedores',
    'receber': 'Contas a Receber',
    'pagar': 'Contas a Pagar',
    'conciliacao': 'Conciliação Bancária',
    'fluxo': 'Fluxo de Caixa',
    'usuarios': 'Usuários',
    'auditoria': 'Logs de Auditoria',
    'franquias': 'Franquias',
    'lojas': 'Lojas',
    'solicitacoes': 'Solicitações de Compra',
    'solicitar': 'Solicitar Produtos',
    'manual': 'Manual do Sistema',
    'notas-fiscais': 'Notas Fiscais',
    'configuracoes': 'Configurações Globais',
    'rankings': 'Rankings de Vendas',
    'low-movers': 'Produtos Parados',
    'franquias-dashboard': 'Dashboard por Franquia',
    'meu-dashboard': 'Meu Dashboard'
  };
  
  pageTitle.textContent = titles[page] || 'Dashboard';
  
  try {
    switch (page) {
      case 'dashboard':
        await redirectToUserDashboard();
        break;
      case 'dashboard/global':
        await renderDashboardGlobal();
        break;
      case 'dashboard/operacional':
        await renderDashboardOperacional();
        break;
      case 'dashboard/financeiro':
        await renderDashboardFinanceiro();
        break;
      case 'dashboard/pessoal':
        await renderDashboardPessoal();
        break;
      case 'meu-dashboard':
        await renderVendorDashboard();
        break;
      case 'produtos':
        await renderProducts();
        break;
      case 'categorias':
        await renderCategories();
        break;
      case 'importar':
        await renderImport();
        break;
      case 'estoque-central':
      case 'estoque':
        await renderInventory();
        break;
      case 'vendas':
        await renderSales();
        break;
      case 'os':
        await renderServiceOrders();
        break;
      case 'clientes':
        await renderCustomers();
        break;
      case 'vendedores':
        await renderVendors();
        break;
      case 'receber':
        await renderReceivables();
        break;
      case 'pagar':
        await renderPayables();
        break;
      case 'conciliacao':
        await renderReconciliation();
        break;
      case 'fluxo':
        await renderCashFlow();
        break;
      case 'usuarios':
        await renderUsers();
        break;
      case 'franquias':
        await renderCompanies();
        break;
      case 'lojas':
        await renderStores();
        break;
      case 'solicitacoes':
      case 'solicitar':
        await renderPurchaseRequests();
        break;
      case 'auditoria':
        await renderAuditLogs();
        break;
      case 'manual':
        await renderManual();
        break;
      case 'notas-fiscais':
        await renderInvoices();
        break;
      case 'configuracoes':
        await renderSettings();
        break;
      case 'rankings':
        await renderRankings();
        break;
      case 'low-movers':
        await renderLowMovers();
        break;
      case 'franquias-dashboard':
        await renderFranchiseDashboard();
        break;
      default:
        await renderDashboard();
    }
  } catch (error) {
    console.error('Erro ao carregar página:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar página</h3>
      <p>${error.message}</p>
    </div>`;
  }
}

async function api(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...options
  };
  
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
    config.body = options.body;
  }
  
  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  
  if (response.status === 401) {
    logout();
    throw new Error('Sessão expirada');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  
  return data;
}

function getStatusColor(status) {
  const colors = {
    'PENDENTE': 'warning',
    'APROVADA': 'primary',
    'CONCLUIDA': 'success',
    'CANCELADA': 'danger',
    'ORCAMENTO': 'secondary',
    'ABERTA': 'primary',
    'EM_EXECUCAO': 'warning',
    'AGUARDANDO_APROVACAO': 'warning',
    'PAGO': 'success',
    'PARCIAL': 'warning',
    'ATRASADO': 'danger'
  };
  return colors[status] || 'secondary';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000);
}

function openModal(title, content) {
  const modal = document.getElementById('modal');
  const dialog = document.getElementById('modalDialog');
  
  dialog.innerHTML = `
    <div class="modal-header">
      <h2>${title}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">${content}</div>
  `;
  
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

let dashboardRange = localStorage.getItem('dashboardRange') || 'monthly';
let userAuthContext = null;

async function fetchUserAuthContext() {
  if (userAuthContext) return userAuthContext;
  try {
    userAuthContext = await api('/auth/me');
    console.log('User Auth Context:', userAuthContext);
    return userAuthContext;
  } catch (e) {
    console.error('Error fetching auth context:', e);
    return null;
  }
}

async function redirectToUserDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Verificando permissões...</div>';
  
  const authContext = await fetchUserAuthContext();
  
  if (!authContext) {
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao verificar permissões</h3>
    </div>`;
    return;
  }
  
  const dashboardPath = authContext.dashboardHome?.replace('/app/', '') || 'dashboard/operacional';
  console.log('Redirecting to:', dashboardPath);
  navigateTo(dashboardPath);
}

function canAccessDashboard(type) {
  if (!userAuthContext) return false;
  const roles = userAuthContext.roles || [];
  const isAdmin = roles.includes('ADMIN_GLOBAL') || currentUser?.perfil === 'ADMIN_GLOBAL';
  
  if (isAdmin) return true;
  
  const accessRules = {
    global: ['GESTOR_DASHBOARD'],
    financeiro: ['FINANCEIRO', 'FRANQUEADO_GESTOR'],
    operacional: ['GERENTE_OP', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA', 'VENDEDOR_LOJA'],
    pessoal: ['VENDEDOR_TMI', 'VENDEDOR_LOJA', 'GERENTE_OP', 'FRANQUEADO_GESTOR', 'GERENTE_LOJA']
  };
  
  return roles.some(r => (accessRules[type] || []).includes(r));
}

function renderAccessDenied(dashboardType) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card" style="text-align: center; padding: 60px;">
      <i class="fas fa-lock" style="font-size: 48px; color: var(--danger); margin-bottom: 20px;"></i>
      <h2>Acesso Negado</h2>
      <p style="color: var(--text-muted); margin: 20px 0;">
        Você não tem permissão para acessar o Dashboard ${dashboardType}.
      </p>
      <p style="color: var(--text-muted); font-size: 14px;">
        Suas roles: ${userAuthContext?.roles?.join(', ') || 'nenhuma'}
      </p>
      <button class="btn btn-primary" onclick="redirectToUserDashboard()" style="margin-top: 20px;">
        <i class="fas fa-home"></i> Ir para meu Dashboard
      </button>
    </div>
  `;
}

async function renderDashboardGlobal() {
  await fetchUserAuthContext();
  
  if (!canAccessDashboard('global')) {
    renderAccessDenied('Global');
    return;
  }
  
  await renderDashboard();
}

async function renderDashboardOperacional() {
  await fetchUserAuthContext();
  
  if (!canAccessDashboard('operacional')) {
    renderAccessDenied('Operacional');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando dashboard operacional...</div>';
  
  try {
    const [operData, summary] = await Promise.all([
      api('/dashboard/operacional-data?range=' + dashboardRange),
      api('/dashboard/summary?range=' + dashboardRange)
    ]);
    
    const rangeLabel = dashboardRange === 'weekly' ? 'Semanal' : dashboardRange === 'monthly' ? 'Mensal' : 'Total';
    
    const osMap = {};
    (operData.os || []).forEach(o => { osMap[o.status] = parseInt(o.qty) || 0; });
    const pedidosMap = {};
    (operData.pedidos || []).forEach(p => { pedidosMap[p.status] = parseInt(p.qty) || 0; });
    
    content.innerHTML = `
      <div class="dashboard-logo-section">
        <img src="/images/logo-tecle.png" alt="Dashboard" class="dashboard-logo" onerror="this.src='/images/logo-tmimports.jpg'">
        <h1 class="dashboard-title">Dashboard Operacional</h1>
      </div>
      
      <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn ${dashboardRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('weekly')">Semanal</button>
        <button class="btn ${dashboardRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('monthly')">Mensal</button>
        <button class="btn ${dashboardRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('all')">Total</button>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div>
          <div class="stat-value">${osMap['ABERTA'] || 0}</div>
          <div class="stat-label">OS Abertas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-tools"></i></div>
          <div class="stat-value">${osMap['EM_EXECUCAO'] || 0}</div>
          <div class="stat-label">OS em Execução</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
          <div class="stat-value">${osMap['CONCLUIDA'] || 0}</div>
          <div class="stat-label">OS Concluídas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-value">${operData.estoqueBaixo || 0}</div>
          <div class="stat-label">Estoque Baixo</div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fas fa-clock"></i></div>
          <div class="stat-value">${pedidosMap['PENDENTE'] || 0}</div>
          <div class="stat-label">Pedidos Pendentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-thumbs-up"></i></div>
          <div class="stat-value">${pedidosMap['APROVADA'] || 0}</div>
          <div class="stat-label">Pedidos Aprovados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-truck"></i></div>
          <div class="stat-value">${pedidosMap['ENVIADA'] || 0}</div>
          <div class="stat-label">Pedidos Enviados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-box-open"></i></div>
          <div class="stat-value">${pedidosMap['RECEBIDA'] || 0}</div>
          <div class="stat-label">Pedidos Recebidos</div>
        </div>
      </div>
      
      <div class="card" style="margin-top: 20px;">
        <div class="card-header"><h3><i class="fas fa-bolt"></i> Ações Rápidas</h3></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 20px;">
          <button class="btn btn-primary" onclick="navigateTo('os')"><i class="fas fa-wrench"></i> Ordens de Serviço</button>
          <button class="btn btn-secondary" onclick="navigateTo('solicitacoes')"><i class="fas fa-truck"></i> Pedidos</button>
          <button class="btn btn-secondary" onclick="navigateTo('estoque-central')"><i class="fas fa-warehouse"></i> Estoque Central</button>
          <button class="btn btn-secondary" onclick="navigateTo('produtos')"><i class="fas fa-box"></i> Catálogo</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro no dashboard operacional:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar dashboard</h3>
      <p>${error.message}</p>
    </div>`;
  }
}

async function renderDashboardFinanceiro() {
  await fetchUserAuthContext();
  
  if (!canAccessDashboard('financeiro')) {
    renderAccessDenied('Financeiro');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando dashboard financeiro...</div>';
  
  try {
    const finData = await api('/dashboard/financeiro-data?range=' + dashboardRange);
    
    const rangeLabel = dashboardRange === 'weekly' ? 'Semanal' : dashboardRange === 'monthly' ? 'Mensal' : 'Total';
    
    const receberMap = {};
    (finData.receber || []).forEach(r => { receberMap[r.status] = parseFloat(r.value) || 0; });
    const pagarMap = {};
    (finData.pagar || []).forEach(p => { pagarMap[p.status] = parseFloat(p.value) || 0; });
    
    const totalReceber = Object.values(receberMap).reduce((a, b) => a + b, 0);
    const totalPagar = Object.values(pagarMap).reduce((a, b) => a + b, 0);
    const saldo = totalReceber - totalPagar;
    
    content.innerHTML = `
      <div class="dashboard-logo-section">
        <img src="/images/logo-tmimports.jpg" alt="Financeiro" class="dashboard-logo">
        <h1 class="dashboard-title">Dashboard Financeiro</h1>
      </div>
      
      <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn ${dashboardRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('weekly')">Semanal</button>
        <button class="btn ${dashboardRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('monthly')">Mensal</button>
        <button class="btn ${dashboardRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('all')">Total</button>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-arrow-down"></i></div>
          <div class="stat-value">${formatCurrency(totalReceber)}</div>
          <div class="stat-label">Total a Receber</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fas fa-arrow-up"></i></div>
          <div class="stat-value">${formatCurrency(totalPagar)}</div>
          <div class="stat-label">Total a Pagar</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${saldo >= 0 ? 'green' : 'red'}"><i class="fas fa-balance-scale"></i></div>
          <div class="stat-value" style="color: ${saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(saldo)}</div>
          <div class="stat-label">Saldo Projetado</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-chart-line"></i></div>
          <div class="stat-value">${formatCurrency(finData.faturamento || 0)}</div>
          <div class="stat-label">Faturamento (${rangeLabel})</div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
          <div class="stat-value">${formatCurrency(receberMap['PENDENTE'] || 0)}</div>
          <div class="stat-label">Receber Pendente</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check"></i></div>
          <div class="stat-value">${formatCurrency(receberMap['PAGO'] || 0)}</div>
          <div class="stat-label">Receber Pago</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
          <div class="stat-value">${formatCurrency(pagarMap['PENDENTE'] || 0)}</div>
          <div class="stat-label">Pagar Pendente</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check"></i></div>
          <div class="stat-value">${formatCurrency(pagarMap['PAGO'] || 0)}</div>
          <div class="stat-label">Pagar Pago</div>
        </div>
      </div>
      
      <div class="card" style="margin-top: 20px;">
        <div class="card-header"><h3><i class="fas fa-bolt"></i> Ações Rápidas</h3></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 20px;">
          <button class="btn btn-primary" onclick="navigateTo('receber')"><i class="fas fa-arrow-down"></i> Contas a Receber</button>
          <button class="btn btn-secondary" onclick="navigateTo('pagar')"><i class="fas fa-arrow-up"></i> Contas a Pagar</button>
          <button class="btn btn-secondary" onclick="navigateTo('fluxo')"><i class="fas fa-chart-area"></i> Fluxo de Caixa</button>
          <button class="btn btn-secondary" onclick="navigateTo('conciliacao')"><i class="fas fa-sync"></i> Conciliação</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro no dashboard financeiro:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar dashboard</h3>
      <p>${error.message}</p>
    </div>`;
  }
}

async function renderDashboardPessoal() {
  await fetchUserAuthContext();
  await renderVendorDashboard();
}

async function renderDashboard() {
  const content = document.getElementById('content');
  
  // Apenas ADMIN_GLOBAL e GESTOR_DASHBOARD (gestor TM Imports) podem ver o dashboard global
  const perfisPermitidos = ['ADMIN_GLOBAL', 'GESTOR_DASHBOARD'];
  if (!perfisPermitidos.includes(currentUser.perfil)) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 60px;">
        <i class="fas fa-lock" style="font-size: 48px; color: var(--warning); margin-bottom: 20px;"></i>
        <h2>Acesso Restrito</h2>
        <p style="color: var(--text-muted); margin: 20px 0;">Você não tem permissão para acessar o Dashboard Principal.</p>
        <button class="btn btn-primary" onclick="navigateTo('meu-dashboard')">
          <i class="fas fa-user-tie"></i> Ir para Meu Dashboard
        </button>
      </div>
    `;
    return;
  }
  
  content.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando dashboard...</div>`;
  
  console.log('Dashboard fetch start', dashboardRange);
  
  const timeout = (ms) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: servidor não respondeu em 10 segundos')), ms)
  );
  
  try {
    const endpoint = currentUser.perfil === 'ADMIN_GLOBAL' ? '/dashboard/global' : '/dashboard/loja';
    
    const fetchWithTimeout = async (url) => {
      try {
        return await Promise.race([api(url), timeout(10000)]);
      } catch (e) {
        console.error('Dashboard fetch failed', url, e);
        return null;
      }
    };
    
    const [data, summary, charts, rankings] = await Promise.all([
      fetchWithTimeout(endpoint),
      fetchWithTimeout(`/dashboard/summary?range=${dashboardRange}`),
      fetchWithTimeout(`/dashboard/charts?range=${dashboardRange}`),
      fetchWithTimeout(`/dashboard/rankings?range=${dashboardRange}`)
    ]);
    
    console.log('Dashboard fetch response', { data, summary, charts, rankings });
    
    if (!data && !summary) {
      throw new Error('Falha ao carregar dados do dashboard');
    }
    
    const rangeLabel = dashboardRange === 'weekly' ? 'Semanal' : dashboardRange === 'monthly' ? 'Mensal' : 'Total';
    
    if (currentUser.perfil === 'ADMIN_GLOBAL') {
      content.innerHTML = `
        <div class="dashboard-logo-section">
          <img src="/images/logo-tmimports.jpg" alt="TM Imports" class="dashboard-logo">
          <h1 class="dashboard-title">TM Imports - Painel Administrativo</h1>
        </div>
        
        <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn ${dashboardRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('weekly')">Semanal</button>
          <button class="btn ${dashboardRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('monthly')">Mensal</button>
          <button class="btn ${dashboardRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeDashboardRange('all')">Total</button>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-value">${summary?.vendas?.total_qty || 0} | ${formatCurrency(summary?.vendas?.total_value || data.totalVendasMes)}</div>
            <div class="stat-label">Vendas (${rangeLabel})</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-wrench"></i></div>
            <div class="stat-value">${summary?.os?.open_qty || 0} | ${formatCurrency(summary?.os?.open_value || 0)}</div>
            <div class="stat-label">OS Abertas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
            <div class="stat-value">${summary?.os?.closed_qty || 0} | ${formatCurrency(summary?.os?.closed_value || 0)}</div>
            <div class="stat-label">OS Fechadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon ${data.saldoAtual >= 0 ? 'green' : 'red'}"><i class="fas fa-balance-scale"></i></div>
            <div class="stat-value" style="color: ${data.saldoAtual >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCurrency(data.saldoAtual)}</div>
            <div class="stat-label">Saldo Projetado</div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-value">${summary?.estoque?.low_stock_qty || 0}</div>
            <div class="stat-label">Estoque Baixo (<=2)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
            <div class="stat-value">${summary?.estoque?.out_stock_qty || 0}</div>
            <div class="stat-label">Sem Estoque</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-truck"></i></div>
            <div class="stat-value">${summary?.pedidos?.pending || 0}/${summary?.pedidos?.approved || 0}/${summary?.pedidos?.shipped || 0}</div>
            <div class="stat-label">Pedidos (Pend/Aprov/Env)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-double"></i></div>
            <div class="stat-value">${summary?.pedidos?.delivered || 0}</div>
            <div class="stat-label">Pedidos Recebidos</div>
          </div>
        </div>
        
        <div class="cashflow-section">
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-chart-area"></i> Fluxo de Caixa</h2>
            </div>
            <div class="card-body">
              <div class="cashflow-metrics">
                <div class="metric-card positive">
                  <div class="value">${formatCurrency(data.totalReceber)}</div>
                  <div class="label">A Receber</div>
                </div>
                <div class="metric-card negative">
                  <div class="value">${formatCurrency(data.totalPagar)}</div>
                  <div class="label">A Pagar</div>
                </div>
                <div class="metric-card ${data.receberVencido > 0 ? 'negative' : ''}">
                  <div class="value">${formatCurrency(data.receberVencido || 0)}</div>
                  <div class="label">Receber Vencido</div>
                </div>
                <div class="metric-card ${data.pagarVencido > 0 ? 'negative' : ''}">
                  <div class="value">${formatCurrency(data.pagarVencido || 0)}</div>
                  <div class="label">Pagar Vencido</div>
                </div>
              </div>
              <div class="chart-container" style="height: 250px;">
                <canvas id="fluxoCaixaChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-box"></i></div>
            <div class="stat-value">${data.produtosAtivos}</div>
            <div class="stat-label">Produtos Ativos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-users"></i></div>
            <div class="stat-value">${data.clientesAtivos}</div>
            <div class="stat-label">Clientes</div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-chart-bar"></i> Vendas - Últimos 6 Meses</h2>
            </div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="vendasChart"></canvas>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-shopping-cart"></i> Últimas Vendas</h2>
            </div>
            <div class="card-body">
              <div class="table-container table-sm">
                <table>
                  <thead>
                    <tr><th>Número</th><th>Cliente</th><th>Valor</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${(data.ultimasVendas || []).map(v => `
                      <tr>
                        <td>${v.numero || '-'}</td>
                        <td>${v.cliente?.nome || 'Consumidor'}</td>
                        <td>${formatCurrency(v.total)}</td>
                        <td><span class="badge badge-${getStatusColor(v.status)}">${v.status}</span></td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" class="text-center">Nenhuma venda</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-wrench"></i> Últimas Ordens de Serviço</h2>
            </div>
            <div class="card-body">
              <div class="table-container table-sm">
                <table>
                  <thead>
                    <tr><th>Número</th><th>Cliente</th><th>Valor</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${(data.ultimasOS || []).map(os => `
                      <tr>
                        <td>${os.numero || '-'}</td>
                        <td>${os.cliente?.nome || '-'}</td>
                        <td>${formatCurrency(os.total)}</td>
                        <td><span class="badge badge-${getStatusColor(os.status)}">${os.status}</span></td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" class="text-center">Nenhuma OS</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-exchange-alt"></i> Movimentações de Estoque</h2>
            </div>
            <div class="card-body">
              <div class="table-container table-sm">
                <table>
                  <thead>
                    <tr><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    ${(data.movimentacoesEstoque || []).map(m => `
                      <tr>
                        <td>${m.produto?.nome || m.produto?.codigo || '-'}</td>
                        <td><span class="badge badge-${m.tipo === 'ENTRADA' ? 'success' : m.tipo === 'SAIDA' ? 'danger' : 'secondary'}">${m.tipo}</span></td>
                        <td>${m.quantidade}</td>
                        <td>${new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" class="text-center">Nenhuma movimentação</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-hand-holding-usd"></i> Contas a Receber</h2>
            </div>
            <div class="card-body">
              <div class="table-container table-sm">
                <table>
                  <thead>
                    <tr><th>Descrição</th><th>Cliente</th><th>Valor</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${(data.ultimosRecebimentos || []).map(r => `
                      <tr>
                        <td>${r.descricao || '-'}</td>
                        <td>${r.cliente?.nome || '-'}</td>
                        <td>${formatCurrency(r.valor)}</td>
                        <td><span class="badge badge-${getStatusColor(r.status)}">${r.status}</span></td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" class="text-center">Nenhum recebimento</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h2><i class="fas fa-file-invoice-dollar"></i> Contas a Pagar</h2>
            </div>
            <div class="card-body">
              <div class="table-container table-sm">
                <table>
                  <thead>
                    <tr><th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${(data.ultimosPagamentos || []).map(p => `
                      <tr>
                        <td>${p.descricao || '-'}</td>
                        <td>${p.fornecedor || '-'}</td>
                        <td>${formatCurrency(p.valor)}</td>
                        <td><span class="badge badge-${getStatusColor(p.status)}">${p.status}</span></td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" class="text-center">Nenhum pagamento</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
      
      if (data.vendasUltimos6Meses) {
        const ctx = document.getElementById('vendasChart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.vendasUltimos6Meses.map(v => v.mes),
            datasets: [{
              label: 'Vendas',
              data: data.vendasUltimos6Meses.map(v => v.total),
              backgroundColor: '#FF6B35',
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#333' },
                ticks: { color: '#888' }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#888' }
              }
            }
          }
        });
      }

      if (data.fluxoCaixaUltimos6Meses) {
        const ctxFluxo = document.getElementById('fluxoCaixaChart').getContext('2d');
        new Chart(ctxFluxo, {
          type: 'line',
          data: {
            labels: data.fluxoCaixaUltimos6Meses.map(f => f.mes),
            datasets: [
              {
                label: 'Entradas',
                data: data.fluxoCaixaUltimos6Meses.map(f => f.entradas),
                borderColor: '#00FF88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Saídas',
                data: data.fluxoCaixaUltimos6Meses.map(f => f.saidas),
                borderColor: '#FF4757',
                backgroundColor: 'rgba(255, 71, 87, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Saldo',
                data: data.fluxoCaixaUltimos6Meses.map(f => f.saldo),
                borderColor: '#FF6B35',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: { color: '#888' }
              }
            },
            scales: {
              y: {
                grid: { color: '#333' },
                ticks: { color: '#888' }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#888' }
              }
            }
          }
        });
      }
    } else {
      content.innerHTML = `
        <div class="dashboard-logo-section">
          <img src="/images/logo.png" alt="Tecle Motos" class="dashboard-logo">
          <h1 class="dashboard-title">Tecle Motos - ${currentUser.loja?.nome || 'Franquia'}</h1>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-value">${formatCurrency(data.vendasHoje)}</div>
            <div class="stat-label">Vendas Hoje</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-calendar"></i></div>
            <div class="stat-value">${formatCurrency(data.vendasMes)}</div>
            <div class="stat-label">Vendas do Mês</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><i class="fas fa-wrench"></i></div>
            <div class="stat-value">${data.osAbertas + data.osEmExecucao}</div>
            <div class="stat-label">OS em Andamento</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-clock"></i></div>
            <div class="stat-value">${data.vendasPendentes}</div>
            <div class="stat-label">Vendas Pendentes</div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div>
            <div class="stat-value">${formatCurrency(data.totalReceber)}</div>
            <div class="stat-label">A Receber</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="stat-value">${formatCurrency(data.totalPagar)}</div>
            <div class="stat-label">A Pagar</div>
          </div>
        </div>
        
        <div id="minhasComissoes"></div>
        
        <div class="card" style="margin-top: 20px;">
          <div class="card-header">
            <h2><i class="fas fa-warehouse"></i> Estoque TM Imports - Produtos Disponíveis</h2>
            <button class="btn btn-primary" onclick="criarSolicitacaoCompra()">
              <i class="fas fa-cart-plus"></i> Nova Solicitação
            </button>
          </div>
          <div class="card-body">
            <div id="estoqueTMImports">
              <div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando estoque...</div>
            </div>
          </div>
        </div>
      `;
      
      carregarEstoqueTMImports();
      carregarMinhasComissoes();
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
      <h3>Erro ao carregar Dashboard</h3>
      <p>${error.message || 'Falha na conexão com a API'}</p>
      <button class="btn btn-primary" onclick="renderDashboard()" style="margin-top: 20px;">
        <i class="fas fa-redo"></i> Tentar Novamente
      </button>
    </div>`;
  }
}

function changeDashboardRange(range) {
  dashboardRange = range;
  localStorage.setItem('dashboardRange', range);
  renderDashboard();
}

async function renderVendorDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando dashboard...</div>';

  try {
    const data = await api('/vendors/me/dashboard');
    
    if (!data || data.error) {
      content.innerHTML = `<div class="empty-state">
        <i class="fas fa-user-tie"></i>
        <h3>Voce nao esta cadastrado como vendedor</h3>
        <p>Entre em contato com seu gestor para ser cadastrado.</p>
      </div>`;
      return;
    }

    const isAtacado = data.loja.tipo === 'MATRIZ';
    const tipoLabel = isAtacado ? 'Atacado - TM Imports' : 'Franquia - Tecle Motos';
    const corTema = isAtacado ? 'var(--primary)' : 'var(--success)';
    const iconeTema = isAtacado ? 'fa-warehouse' : 'fa-store';

    content.innerHTML = `
      <div class="card" style="margin-bottom: 20px; border-left: 4px solid ${corTema};">
        <div class="card-header">
          <h2><i class="fas ${iconeTema}"></i> Meu Dashboard - ${tipoLabel}</h2>
          <span class="badge ${isAtacado ? 'badge-primary' : 'badge-success'}">${data.vendedor.nome}</span>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 15px;">
            <div><strong>Loja:</strong> ${data.loja.nome}</div>
            <div><strong>Cidade:</strong> ${data.loja.cidade || '-'}</div>
            <div><strong>Taxa Comissao:</strong> <span style="color: ${corTema}; font-weight: bold;">${data.comissao.taxa}%</span></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-coins" style="color: #FFD700;"></i> Minhas Comissoes</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-calendar-alt"></i></div>
              <div class="stat-value">${data.comissao.mes.vendas}</div>
              <div class="stat-label">Vendas Este Mes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-dollar-sign"></i></div>
              <div class="stat-value">${formatCurrency(data.comissao.mes.totalVendas)}</div>
              <div class="stat-label">Total Vendido (Mes)</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div>
              <div class="stat-value">${formatCurrency(data.comissao.mes.comissao)}</div>
              <div class="stat-label">Comissao do Mes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon yellow"><i class="fas fa-trophy"></i></div>
              <div class="stat-value">${formatCurrency(data.comissao.ano.comissao)}</div>
              <div class="stat-label">Comissao Acumulada (Ano)</div>
            </div>
          </div>
          <div style="margin-top: 15px; padding: 15px; background: rgba(0,255,136,0.1); border-radius: 8px;">
            <p style="margin: 0;">
              <i class="fas fa-info-circle"></i> 
              No ano voce vendeu <strong>${formatCurrency(data.comissao.ano.totalVendas)}</strong> em <strong>${data.comissao.ano.vendas}</strong> vendas.
            </p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-shopping-cart"></i> Status das Minhas Vendas</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card" style="cursor: pointer;" onclick="navigateTo('/app/vendas?status=PENDENTE')">
              <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
              <div class="stat-value">${data.vendas.pendentes.qtd}</div>
              <div class="stat-label">Pendentes</div>
              <div class="stat-sublabel">${formatCurrency(data.vendas.pendentes.valor)}</div>
            </div>
            <div class="stat-card" style="cursor: pointer;" onclick="navigateTo('/app/vendas?status=APROVADA')">
              <div class="stat-icon blue"><i class="fas fa-check"></i></div>
              <div class="stat-value">${data.vendas.aprovadas.qtd}</div>
              <div class="stat-label">Aprovadas</div>
              <div class="stat-sublabel">${formatCurrency(data.vendas.aprovadas.valor)}</div>
            </div>
            <div class="stat-card" style="cursor: pointer;" onclick="navigateTo('/app/vendas?status=CONCLUIDA')">
              <div class="stat-icon green"><i class="fas fa-check-double"></i></div>
              <div class="stat-value">${data.vendas.concluidas.qtd}</div>
              <div class="stat-label">Concluidas</div>
              <div class="stat-sublabel">${formatCurrency(data.vendas.concluidas.valor)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon red"><i class="fas fa-times"></i></div>
              <div class="stat-value">${data.vendas.canceladas.qtd}</div>
              <div class="stat-label">Canceladas</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-boxes"></i> Estoque ${isAtacado ? 'Central' : 'da Loja'}</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-cubes"></i></div>
              <div class="stat-value">${data.estoque.total}</div>
              <div class="stat-label">Produtos em Estoque</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
              <div class="stat-value">${data.estoque.baixo}</div>
              <div class="stat-label">Estoque Baixo</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
              <div class="stat-value">${data.estoque.zerado}</div>
              <div class="stat-label">Sem Estoque</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
              <div class="stat-value">${formatCurrency(data.estoque.valorTotal)}</div>
              <div class="stat-label">Valor Total Estoque</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-users"></i> Clientes e Vendas Recentes</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid" style="margin-bottom: 20px;">
            <div class="stat-card">
              <div class="stat-icon purple"><i class="fas fa-user-check"></i></div>
              <div class="stat-value">${data.clientesAtendidos}</div>
              <div class="stat-label">Clientes Atendidos</div>
            </div>
          </div>
          
          ${data.vendasRecentes.length > 0 ? `
            <h4 style="margin-bottom: 10px;">Ultimas 5 Vendas</h4>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.vendasRecentes.map(v => `
                    <tr>
                      <td>${formatDate(v.data)}</td>
                      <td>${v.cliente}</td>
                      <td>${formatCurrency(v.total)}</td>
                      <td><span class="badge badge-${v.status === 'CONCLUIDA' ? 'success' : v.status === 'PENDENTE' ? 'warning' : v.status === 'APROVADA' ? 'primary' : 'danger'}">${v.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted);">Nenhuma venda registrada ainda.</p>'}
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-primary" onclick="navigateTo('/app/vendas')">
          <i class="fas fa-plus"></i> Nova Venda
        </button>
        <button class="btn btn-secondary" onclick="navigateTo('/app/clientes')" style="margin-left: 10px;">
          <i class="fas fa-users"></i> Ver Clientes
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar dashboard do vendedor:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
      <h3>Erro ao carregar Dashboard</h3>
      <p>${error.message || 'Voce pode nao estar cadastrado como vendedor.'}</p>
      <button class="btn btn-primary" onclick="renderVendorDashboard()" style="margin-top: 20px;">
        <i class="fas fa-redo"></i> Tentar Novamente
      </button>
    </div>`;
  }
}

let productsData = [];

async function renderProducts() {
  const content = document.getElementById('content');
  
  try {
    const products = await api('/products');
    productsData = products;
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Produtos / Serviços</h2>
          <div class="header-actions">
            ${currentUser.perfil === 'ADMIN_GLOBAL' ? `
            <button class="btn btn-danger" onclick="limparTodosProdutos()">
              <i class="fas fa-trash-alt"></i> Limpar Tudo
            </button>
            ` : ''}
            <button class="btn btn-success" onclick="exportarPlanilha()">
              <i class="fas fa-file-download"></i> Exportar Planilha
            </button>
            <button class="btn btn-secondary" onclick="toggleImportSection()">
              <i class="fas fa-file-upload"></i> Importar Planilha
            </button>
            <button class="btn btn-primary" onclick="openProductModal()">
              <i class="fas fa-plus"></i> Novo Produto
            </button>
          </div>
        </div>
        
        <div id="importSection" class="import-section" style="display: none;">
          <div class="import-content">
            <h3><i class="fas fa-upload"></i> Importar Planilha de Produtos</h3>
            <p class="text-muted">Faça upload de uma planilha Excel (.xlsx) ou CSV. O sistema identificará automaticamente o tipo e a categoria.</p>
            
            <form id="importForm" onsubmit="importProducts(event)">
              <div class="form-row">
                <div class="form-group" style="flex: 2;">
                  <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required id="importFileInput">
                </div>
                <div class="form-group" style="flex: 1;">
                  <button type="submit" class="btn btn-success" id="importBtn">
                    <i class="fas fa-upload"></i> Importar
                  </button>
                </div>
              </div>
            </form>
            
            <div id="importProgress" style="margin-top: 20px; display: none;">
              <div style="background: var(--bg-card); border-radius: 10px; overflow: hidden; height: 30px; position: relative;">
                <div id="progressBar" style="background: linear-gradient(90deg, var(--primary), var(--success)); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                <div id="progressText" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;">0%</div>
              </div>
              <p id="progressStatus" style="margin-top: 10px; color: var(--text-muted); text-align: center;">Preparando...</p>
            </div>
            
            <div id="importResult" style="margin-top: 20px;"></div>
            <div id="importedProductsList" style="margin-top: 20px;"></div>
            
            <details style="margin-top: 15px;">
              <summary style="cursor: pointer; color: var(--primary);">Formato esperado da planilha</summary>
              <div style="margin-top: 10px; color: var(--text-muted);">
                <p style="margin-bottom: 10px;"><strong>Campos principais:</strong></p>
                <ul style="list-style: inside; margin-bottom: 15px;">
                  <li>Coluna "Produto" ou "Descrição" ou "Nome" <span style="color: var(--danger);">*obrigatório</span></li>
                  <li>Coluna "Código" (opcional - gera automaticamente se vazio)</li>
                  <li>Coluna "Categoria" ou "Tipo" (Moto, Serviço, Peça)</li>
                  <li>Coluna "Custo" ou "Preço de Custo"</li>
                  <li>Coluna "Lucro" ou "Percentual" ou "Margem" (padrão 30%)</li>
                  <li>Coluna "Preço" ou "Preço Venda" (calculado automaticamente se vazio)</li>
                </ul>
                <p style="margin-bottom: 10px;"><strong>Campos adicionais:</strong></p>
                <ul style="list-style: inside;">
                  <li>Cor, Peso, Garantia</li>
                  <li>Chassi, Código Motor, Bateria (para motos)</li>
                  <li>Localização, Estoque Mínimo, Estoque Máximo</li>
                  <li>Observação ou Info</li>
                </ul>
                <p style="margin-top: 15px; padding: 10px; background: rgba(255,107,53,0.1); border-radius: 8px;">
                  <i class="fas fa-calculator"></i> <strong>Cálculo automático:</strong> Se você informar o Custo e o Percentual de Lucro, o Preço de Venda será calculado automaticamente.
                </p>
              </div>
            </details>
          </div>
        </div>
        
        <div class="card-body">
          <div class="filters">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" id="searchProducts" placeholder="Buscar produtos..." onkeyup="filterProducts()">
            </div>
            <select id="filterTipo" onchange="filterProducts()">
              <option value="">Todos os tipos</option>
              <option value="MOTO">Motos</option>
              <option value="PECA">Peças</option>
              <option value="SERVICO">Serviços</option>
            </select>
          </div>
          
          <div class="table-container">
            <table id="productsTable">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Preço Custo</th>
                  <th>Preço Venda</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${products.map((p, index) => `
                  <tr data-tipo="${p.tipo}" data-nome="${p.nome?.toLowerCase()}">
                    <td>${p.codigo || '-'}</td>
                    <td>${p.nome}</td>
                    <td><span class="badge badge-${p.tipo === 'MOTO' ? 'primary' : p.tipo === 'SERVICO' ? 'success' : 'secondary'}">${p.tipo}</span></td>
                    <td>${formatCurrency(p.preco_custo)}</td>
                    <td>${formatCurrency(p.preco_venda)}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="editProductById(${index})">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          ${products.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-box-open"></i>
              <h3>Nenhum produto cadastrado</h3>
              <p>Clique em "Novo Produto" para começar</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function filterProducts() {
  const search = document.getElementById('searchProducts').value.toLowerCase();
  const tipo = document.getElementById('filterTipo').value;
  const rows = document.querySelectorAll('#productsTable tbody tr');
  
  rows.forEach(row => {
    const nome = row.dataset.nome || '';
    const rowTipo = row.dataset.tipo;
    
    const matchSearch = nome.includes(search);
    const matchTipo = !tipo || rowTipo === tipo;
    
    row.style.display = matchSearch && matchTipo ? '' : 'none';
  });
}

function toggleImportSection() {
  const section = document.getElementById('importSection');
  if (section.style.display === 'none') {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

function openProductModal(product = null) {
  const isEdit = !!product;
  
  const formContent = `
    <form id="productForm" onsubmit="saveProduct(event, ${product?.id || 'null'})">
      <div class="form-row">
        <div class="form-group">
          <label>Tipo *</label>
          <select name="tipo" required>
            <option value="PECA" ${product?.tipo === 'PECA' ? 'selected' : ''}>Peça</option>
            <option value="MOTO" ${product?.tipo === 'MOTO' ? 'selected' : ''}>Moto / Scooter</option>
            <option value="SERVICO" ${product?.tipo === 'SERVICO' ? 'selected' : ''}>Serviço</option>
          </select>
        </div>
        <div class="form-group">
          <label>Código</label>
          <input type="text" name="codigo" value="${product?.codigo || ''}">
        </div>
      </div>
      
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" name="nome" required value="${product?.nome || ''}">
      </div>
      
      <div class="form-group">
        <label>Descrição</label>
        <textarea name="descricao" rows="3">${product?.descricao || ''}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Preço de Custo</label>
          <input type="number" step="0.01" name="preco_custo" value="${product?.preco_custo || 0}" oninput="calcularPrecoVenda()">
        </div>
        <div class="form-group">
          <label>% Lucro</label>
          <input type="number" step="0.01" name="percentual_lucro" value="${product?.percentual_lucro || 30}" oninput="calcularPrecoVenda()">
        </div>
        <div class="form-group">
          <label>Preço de Venda</label>
          <input type="number" step="0.01" name="preco_venda" value="${product?.preco_venda || 0}" style="background: #2a2a2a; font-weight: bold; color: var(--success);">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Estoque Mínimo</label>
          <input type="number" name="estoque_minimo" value="${product?.estoque_minimo || 0}">
        </div>
        <div class="form-group">
          <label>Estoque Máximo</label>
          <input type="number" name="estoque_maximo" value="${product?.estoque_maximo || 100}">
        </div>
      </div>
      
      <div class="form-group">
        <label>Localização</label>
        <input type="text" name="localizacao" value="${product?.localizacao || ''}">
      </div>
      
      <div class="form-group">
        <label>Garantia</label>
        <input type="text" name="garantia" value="${product?.garantia || ''}">
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </form>
  `;
  
  openModal(isEdit ? 'Editar Produto' : 'Novo Produto', formContent);
}

function calcularPrecoVenda() {
  const precoCusto = parseFloat(document.querySelector('[name="preco_custo"]')?.value) || 0;
  const percentualLucro = parseFloat(document.querySelector('[name="percentual_lucro"]')?.value) || 0;
  const precoVendaInput = document.querySelector('[name="preco_venda"]');
  
  if (precoVendaInput && precoCusto > 0) {
    let precoVenda;
    if (percentualLucro < 100) {
      const divisor = (100 - percentualLucro) / 100;
      precoVenda = precoCusto / divisor;
    } else {
      precoVenda = precoCusto * (1 + percentualLucro / 100);
    }
    precoVendaInput.value = precoVenda.toFixed(2);
  }
}

function editProductById(index) {
  const product = productsData[index];
  if (product) {
    openProductModal(product);
  } else {
    showToast('Produto não encontrado', 'error');
  }
}

function editProduct(product) {
  openProductModal(product);
}

async function exportarPlanilha() {
  try {
    showToast('Gerando planilha...', 'info');
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/products/exportar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Erro ao exportar planilha');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    showToast('Planilha exportada com sucesso!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveProduct(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    if (id) {
      await api(`/products/${id}`, { method: 'PUT', body: data });
      showToast('Produto atualizado com sucesso');
    } else {
      await api('/products', { method: 'POST', body: data });
      showToast('Produto cadastrado com sucesso');
    }
    
    closeModal();
    await renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function limparTodosProdutos() {
  const confirm1 = confirm('ATENÇÃO: Isso irá EXCLUIR TODOS os produtos, peças e serviços do sistema!\n\nDeseja continuar?');
  if (!confirm1) return;
  
  const confirm2 = confirm('CONFIRMAÇÃO FINAL: Esta ação NÃO pode ser desfeita!\n\nDigite OK para confirmar a exclusão de TODOS os produtos.');
  if (!confirm2) return;
  
  try {
    await api('/products/limpar-tudo', { method: 'DELETE' });
    showToast('Todos os produtos foram excluídos', 'success');
    await renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  
  try {
    await api(`/products/${id}`, { method: 'DELETE' });
    showToast('Produto excluído');
    await renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderImport() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>Importar Planilha de Produtos</h2>
      </div>
      <div class="card-body">
        <p style="margin-bottom: 20px; color: var(--text-muted);">
          Faça upload de uma planilha Excel (.xlsx, .xls) ou CSV com os produtos. 
          O sistema lê a coluna "Categoria do produto" para classificar automaticamente.
        </p>
        
        <form id="importForm" onsubmit="importProducts(event)">
          <div class="form-group">
            <label>Arquivo da Planilha</label>
            <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required id="importFileInput">
          </div>
          
          <button type="submit" class="btn btn-primary" id="importBtn">
            <i class="fas fa-upload"></i> Importar
          </button>
        </form>
        
        <div id="importProgress" style="margin-top: 20px; display: none;">
          <div style="background: var(--bg-card); border-radius: 10px; overflow: hidden; height: 30px; position: relative;">
            <div id="progressBar" style="background: linear-gradient(90deg, var(--primary), var(--success)); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            <div id="progressText" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;">0%</div>
          </div>
          <p id="progressStatus" style="margin-top: 10px; color: var(--text-muted); text-align: center;">Preparando...</p>
        </div>
        
        <div id="importResult" style="margin-top: 20px;"></div>
        
        <div id="importedProductsList" style="margin-top: 20px;"></div>
        
        <hr style="margin: 30px 0; border-color: var(--border);">
        
        <h3 style="margin-bottom: 15px;">Formato esperado da planilha:</h3>
        <ul style="color: var(--text-muted); list-style: inside;">
          <li>Coluna "Código" - Código do produto</li>
          <li>Coluna "Produto" ou "Descrição" - Nome do produto</li>
          <li>Coluna "Preço" - Preço de venda</li>
          <li>Coluna "Categoria do produto" - Tipo (Moto, Serviço, Peça)</li>
        </ul>
      </div>
    </div>
  `;
}

async function importProducts(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const resultDiv = document.getElementById('importResult');
  const progressDiv = document.getElementById('importProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressStatus = document.getElementById('progressStatus');
  const listDiv = document.getElementById('importedProductsList');
  const importBtn = document.getElementById('importBtn');
  
  progressDiv.style.display = 'block';
  resultDiv.innerHTML = '';
  listDiv.innerHTML = '';
  importBtn.disabled = true;
  importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  
  progressBar.style.width = '10%';
  progressText.textContent = '10%';
  progressStatus.textContent = 'Enviando arquivo...';
  
  try {
    progressBar.style.width = '30%';
    progressText.textContent = '30%';
    progressStatus.textContent = 'Processando planilha...';
    
    const result = await api('/products/importar', {
      method: 'POST',
      body: formData
    });
    
    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    progressStatus.textContent = 'Concluído!';
    
    resultDiv.innerHTML = `
      <div class="stat-card" style="background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success);">
        <h3 style="color: var(--success); margin-bottom: 15px;">
          <i class="fas fa-check-circle"></i> Importação Concluída!
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${result.linhasLidas || 0}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Linhas Lidas</div>
          </div>
          <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--success);">${result.criados}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Criados</div>
          </div>
          <div style="text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--warning);">${result.atualizados}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Atualizados</div>
          </div>
        </div>
        ${result.porTipo ? `
          <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
            <span style="padding: 5px 15px; background: var(--primary); border-radius: 20px;">
              <i class="fas fa-motorcycle"></i> Motos: ${result.porTipo.MOTO || 0}
            </span>
            <span style="padding: 5px 15px; background: var(--success); border-radius: 20px;">
              <i class="fas fa-wrench"></i> Serviços: ${result.porTipo.SERVICO || 0}
            </span>
            <span style="padding: 5px 15px; background: #6c757d; border-radius: 20px;">
              <i class="fas fa-cog"></i> Peças: ${result.porTipo.PECA || 0}
            </span>
          </div>
        ` : ''}
        ${result.erros?.length > 0 ? `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 8px;">
            <strong style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> ${result.erros.length} erros</strong>
          </div>
        ` : ''}
      </div>
    `;
    
    if (result.detalhes && result.detalhes.length > 0) {
      const motos = result.detalhes.filter(p => p.tipo === 'MOTO');
      const servicos = result.detalhes.filter(p => p.tipo === 'SERVICO');
      const pecas = result.detalhes.filter(p => p.tipo === 'PECA');
      
      const renderTabela = (items) => items.map(p => `
        <tr>
          <td>${p.codigo}</td>
          <td>${p.nome}</td>
          <td>${formatCurrency(p.precoCusto || 0)}</td>
          <td>${p.percentualLucro || 30}%</td>
          <td style="color: var(--success); font-weight: bold;">${formatCurrency(p.preco)}</td>
        </tr>
      `).join('');
      
      listDiv.innerHTML = `
        <div class="card" style="margin-top: 20px;">
          <div class="card-header">
            <h3><i class="fas fa-list"></i> Produtos Importados (${result.detalhes.length})</h3>
          </div>
          <div class="card-body">
            ${motos.length > 0 ? `
              <h4 style="color: var(--primary); margin-bottom: 10px;"><i class="fas fa-motorcycle"></i> Motos (${motos.length})</h4>
              <div class="table-container table-sm" style="margin-bottom: 20px;">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Custo</th><th>Lucro</th><th>Preço Venda</th></tr></thead>
                  <tbody>${renderTabela(motos)}</tbody>
                </table>
              </div>
            ` : ''}
            
            ${servicos.length > 0 ? `
              <h4 style="color: var(--success); margin-bottom: 10px;"><i class="fas fa-wrench"></i> Serviços (${servicos.length})</h4>
              <div class="table-container table-sm" style="margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Custo</th><th>Lucro</th><th>Preço Venda</th></tr></thead>
                  <tbody>${renderTabela(servicos)}</tbody>
                </table>
              </div>
            ` : ''}
            
            ${pecas.length > 0 ? `
              <h4 style="color: #6c757d; margin-bottom: 10px;"><i class="fas fa-cog"></i> Peças (${pecas.length})</h4>
              <div class="table-container table-sm" style="max-height: 400px; overflow-y: auto;">
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Custo</th><th>Lucro</th><th>Preço Venda</th></tr></thead>
                  <tbody>${renderTabela(pecas)}</tbody>
                </table>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    showToast('Importação concluída com sucesso!', 'success');
  } catch (error) {
    progressBar.style.width = '100%';
    progressBar.style.background = 'var(--danger)';
    progressText.textContent = 'Erro';
    progressStatus.textContent = error.message;
    
    resultDiv.innerHTML = `
      <div class="stat-card" style="background: rgba(255,0,0,0.1); border: 1px solid var(--danger);">
        <h3 style="color: var(--danger);"><i class="fas fa-times-circle"></i> Erro na Importação</h3>
        <p style="margin-top: 10px;">${error.message}</p>
      </div>
    `;
    showToast(error.message, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = '<i class="fas fa-upload"></i> Importar';
  }
}

async function renderCategories() {
  const content = document.getElementById('content');
  
  try {
    const categories = await api('/categories');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Categorias</h2>
          <button class="btn btn-primary" onclick="openCategoryModal()">
            <i class="fas fa-plus"></i> Nova Categoria
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${categories.map(c => `
                  <tr>
                    <td>${c.nome}</td>
                    <td><span class="badge badge-${c.tipo === 'MOTO' ? 'primary' : c.tipo === 'SERVICO' ? 'success' : 'secondary'}">${c.tipo}</span></td>
                    <td>${c.descricao || '-'}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openCategoryModal() {
  const formContent = `
    <form id="categoryForm" onsubmit="saveCategory(event)">
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" name="nome" required>
      </div>
      
      <div class="form-group">
        <label>Tipo *</label>
        <select name="tipo" required>
          <option value="PECA">Peça</option>
          <option value="MOTO">Moto</option>
          <option value="SERVICO">Serviço</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Descrição</label>
        <textarea name="descricao" rows="3"></textarea>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Nova Categoria', formContent);
}

async function saveCategory(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/categories', { method: 'POST', body: data });
    showToast('Categoria criada');
    closeModal();
    await renderCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Excluir esta categoria?')) return;
  
  try {
    await api(`/categories/${id}`, { method: 'DELETE' });
    showToast('Categoria excluída');
    await renderCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderInventory() {
  const content = document.getElementById('content');
  const isCentral = currentUser.perfil === 'ADMIN_GLOBAL' && currentPage === 'estoque-central';
  
  try {
    const endpoint = isCentral ? '/inventory/central' : '/inventory/loja';
    const inventory = await api(endpoint);
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>${isCentral ? 'Estoque Central (TM Imports)' : 'Estoque da Loja'}</h2>
          <button class="btn btn-primary" onclick="openInventoryEntryModal()">
            <i class="fas fa-plus"></i> Entrada de Estoque
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${inventory.map(i => `
                  <tr>
                    <td>${i.produto?.nome || 'Produto não encontrado'}</td>
                    <td>${i.quantidade}</td>
                    <td>${i.reservado || 0}</td>
                    <td>${i.quantidade - (i.reservado || 0)}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-success" onclick="openInventoryEntryModal(${i.produto_id})">
                        <i class="fas fa-plus"></i>
                      </button>
                      <button class="btn btn-sm btn-warning" onclick="openInventoryExitModal(${i.produto_id})">
                        <i class="fas fa-minus"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          ${inventory.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-warehouse"></i>
              <h3>Estoque vazio</h3>
              <p>Faça uma entrada de estoque para começar</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function openInventoryEntryModal(produtoId = null) {
  let productsOptions = '';
  
  if (!produtoId) {
    const products = await api('/products');
    productsOptions = products.map(p => 
      `<option value="${p.id}">${p.codigo ? p.codigo + ' - ' : ''}${p.nome}</option>`
    ).join('');
  }
  
  const formContent = `
    <form id="inventoryEntryForm" onsubmit="saveInventoryEntry(event)">
      ${produtoId ? 
        `<input type="hidden" name="produto_id" value="${produtoId}">` :
        `<div class="form-group">
          <label>Produto *</label>
          <select name="produto_id" required>
            <option value="">Selecione...</option>
            ${productsOptions}
          </select>
        </div>`
      }
      
      <div class="form-group">
        <label>Quantidade *</label>
        <input type="number" name="quantidade" min="1" required>
      </div>
      
      <div class="form-group">
        <label>Observações</label>
        <textarea name="observacoes" rows="2"></textarea>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar Entrada</button>
      </div>
    </form>
  `;
  
  openModal('Entrada de Estoque', formContent);
}

async function saveInventoryEntry(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/inventory/entrada', { method: 'POST', body: data });
    showToast('Entrada registrada');
    closeModal();
    await renderInventory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function openInventoryExitModal(produtoId) {
  const formContent = `
    <form id="inventoryExitForm" onsubmit="saveInventoryExit(event)">
      <input type="hidden" name="produto_id" value="${produtoId}">
      
      <div class="form-group">
        <label>Quantidade *</label>
        <input type="number" name="quantidade" min="1" required>
      </div>
      
      <div class="form-group">
        <label>Observações</label>
        <textarea name="observacoes" rows="2"></textarea>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-warning">Confirmar Saída</button>
      </div>
    </form>
  `;
  
  openModal('Saída de Estoque', formContent);
}

async function saveInventoryExit(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/inventory/saida', { method: 'POST', body: data });
    showToast('Saída registrada');
    closeModal();
    await renderInventory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

let salesData = [];

async function renderSales() {
  const content = document.getElementById('content');
  
  try {
    const sales = await api('/sales');
    salesData = sales;
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-shopping-cart"></i> Vendas</h2>
          <button class="btn btn-primary" onclick="openSaleModal()">
            <i class="fas fa-plus"></i> Nova Venda
          </button>
        </div>
        <div class="card-body">
          ${sales.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-shopping-cart"></i>
              <h3>Nenhuma venda registrada</h3>
              <p>Clique em "Nova Venda" para começar</p>
            </div>
          ` : `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${sales.map((s, index) => `
                    <tr>
                      <td>${formatDate(s.createdAt)}</td>
                      <td>${s.cliente?.nome || 'Cliente não informado'}</td>
                      <td style="font-weight: bold; color: var(--success);">${formatCurrency(s.valor_total)}</td>
                      <td><span class="badge badge-${getStatusColor(s.status)}">${s.status}</span></td>
                      <td class="actions">
                        <button class="btn btn-sm btn-secondary" onclick="viewSaleById(${index})">
                          <i class="fas fa-eye"></i>
                        </button>
                        ${s.status === 'PENDENTE' ? `
                          <button class="btn btn-sm btn-success" onclick="approveSale(${s.id})">
                            <i class="fas fa-check"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="cancelSale(${s.id})">
                            <i class="fas fa-times"></i>
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-shopping-cart"></i>
      <h3>Módulo de Vendas</h3>
      <p>Use o botão abaixo para criar uma nova venda</p>
      <button class="btn btn-primary" onclick="openSaleModal()">
        <i class="fas fa-plus"></i> Nova Venda
      </button>
    </div>`;
  }
}

function viewSaleById(index) {
  const sale = salesData[index];
  if (!sale) {
    showToast('Venda não encontrada', 'error');
    return;
  }
  
  const content = `
    <div class="sale-detail">
      <div class="detail-grid">
        <p><strong>Data:</strong> ${formatDate(sale.createdAt)}</p>
        <p><strong>Cliente:</strong> ${sale.cliente?.nome || '-'}</p>
        <p><strong>Status:</strong> <span class="badge badge-${getStatusColor(sale.status)}">${sale.status}</span></p>
        <p><strong>Valor Total:</strong> <span style="color: var(--success); font-weight: bold;">${formatCurrency(sale.valor_total)}</span></p>
      </div>
      
      ${sale.itens?.length > 0 ? `
        <h4 style="margin-top: 20px;">Itens da Venda</h4>
        <div class="table-container table-sm">
          <table>
            <thead><tr><th>Produto</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${sale.itens.map(i => `
                <tr>
                  <td>${i.produto?.nome || 'Produto'}</td>
                  <td>${i.quantidade}</td>
                  <td>${formatCurrency(i.valor_unitario)}</td>
                  <td>${formatCurrency(i.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
  
  openModal('Detalhes da Venda', content);
}

async function openSaleModal() {
  try {
    const [customers, allProducts] = await Promise.all([
      api('/customers'),
      api('/products')
    ]);
    
    const products = allProducts.filter(p => p.tipo === 'MOTO' || p.tipo === 'PECA');
    
    const formContent = `
      <form id="saleForm" onsubmit="saveSale(event)">
        <div class="form-group">
          <label>Cliente</label>
          <select name="cliente_id" required>
            <option value="">Selecione o cliente</option>
            ${customers.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Forma de Pagamento</label>
          <select name="forma_pagamento">
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="CARTAO_CREDITO">Cartão de Crédito</option>
            <option value="CARTAO_DEBITO">Cartão de Débito</option>
            <option value="BOLETO">Boleto</option>
            <option value="FINANCIAMENTO">Financiamento</option>
          </select>
        </div>
        
        <h4 style="margin: 20px 0 10px;">Itens da Venda (Motos e Peças)</h4>
        <div id="saleItems">
          <div class="sale-item-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select name="produto_id_0" style="flex: 2;" onchange="updateItemPrice(0)" required>
              <option value="">Selecione o produto</option>
              ${products.map(p => `<option value="${p.id}" data-preco="${p.preco_venda}">${p.codigo || ''} - ${p.nome} - ${formatCurrency(p.preco_venda)}</option>`).join('')}
            </select>
            <input type="number" name="quantidade_0" value="1" min="1" style="flex: 1;" placeholder="Qtd" onchange="updateItemPrice(0)">
            <input type="text" name="preco_0" style="flex: 1;" placeholder="Preço" readonly>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addSaleItem()" style="margin-bottom: 15px;">
          <i class="fas fa-plus"></i> Adicionar Item
        </button>
        
        <div class="form-row">
          <div class="form-group">
            <label>Desconto (R$)</label>
            <input type="number" name="desconto" step="0.01" min="0" value="0" onchange="calcSaleTotal()">
          </div>
          <div class="form-group">
            <label>Observações</label>
            <input type="text" name="observacoes" placeholder="Opcional">
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid var(--border); margin-top: 10px;">
          <div>
            <span style="color: var(--text-muted);">Subtotal: </span>
            <span id="saleSubtotal" style="font-weight: 500;">R$ 0,00</span>
          </div>
          <div style="font-size: 18px;">
            <strong>Total: </strong><span id="saleTotal" style="color: var(--success); font-weight: bold;">R$ 0,00</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Venda</button>
        </div>
      </form>
    `;
    
    openModal('Nova Venda', formContent);
    window.saleProducts = products;
    window.saleItemCount = 1;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function addSaleItem() {
  const container = document.getElementById('saleItems');
  const index = window.saleItemCount++;
  const products = window.saleProducts || [];
  
  const row = document.createElement('div');
  row.className = 'sale-item-row';
  row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
  row.innerHTML = `
    <select name="produto_id_${index}" style="flex: 2;" onchange="updateItemPrice(${index})">
      <option value="">Selecione o produto</option>
      ${products.map(p => `<option value="${p.id}" data-preco="${p.preco_venda}">${p.codigo || ''} - ${p.nome} - ${formatCurrency(p.preco_venda)}</option>`).join('')}
    </select>
    <input type="number" name="quantidade_${index}" value="1" min="1" style="flex: 1;" placeholder="Qtd" onchange="updateItemPrice(${index})">
    <input type="text" name="preco_${index}" style="flex: 1;" placeholder="Preço" readonly>
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); calcSaleTotal();">
      <i class="fas fa-trash"></i>
    </button>
  `;
  container.appendChild(row);
}

function updateItemPrice(index) {
  const select = document.querySelector(`[name="produto_id_${index}"]`);
  const qtdInput = document.querySelector(`[name="quantidade_${index}"]`);
  const precoInput = document.querySelector(`[name="preco_${index}"]`);
  
  if (select && qtdInput && precoInput) {
    const option = select.options[select.selectedIndex];
    const preco = parseFloat(option?.dataset?.preco) || 0;
    const qtd = parseInt(qtdInput.value) || 1;
    precoInput.value = formatCurrency(preco * qtd);
  }
  
  calcSaleTotal();
}

function calcSaleTotal() {
  let subtotal = 0;
  const rows = document.querySelectorAll('.sale-item-row');
  
  rows.forEach((row, i) => {
    const select = row.querySelector('select');
    const qtdInput = row.querySelector('input[type="number"]');
    
    if (select && qtdInput) {
      const option = select.options[select.selectedIndex];
      const preco = parseFloat(option?.dataset?.preco) || 0;
      const qtd = parseInt(qtdInput.value) || 0;
      subtotal += preco * qtd;
    }
  });
  
  const descontoInput = document.querySelector('input[name="desconto"]');
  const desconto = parseFloat(descontoInput?.value) || 0;
  const total = Math.max(0, subtotal - desconto);
  
  const subtotalEl = document.getElementById('saleSubtotal');
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  document.getElementById('saleTotal').textContent = formatCurrency(total);
}

async function saveSale(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const items = [];
  let i = 0;
  while (formData.has(`produto_id_${i}`)) {
    const produtoId = formData.get(`produto_id_${i}`);
    const quantidade = formData.get(`quantidade_${i}`);
    
    if (produtoId && quantidade) {
      const product = window.saleProducts?.find(p => p.id == produtoId);
      items.push({
        produto_id: parseInt(produtoId),
        quantidade: parseInt(quantidade),
        valor_unitario: product?.preco_venda || 0
      });
    }
    i++;
  }
  
  if (items.length === 0) {
    showToast('Adicione pelo menos um item à venda', 'error');
    return;
  }
  
  const data = {
    cliente_id: parseInt(formData.get('cliente_id')),
    forma_pagamento: formData.get('forma_pagamento'),
    observacoes: formData.get('observacoes'),
    desconto: parseFloat(formData.get('desconto')) || 0,
    itens: items
  };
  
  try {
    await api('/sales', { method: 'POST', body: data });
    showToast('Venda registrada com sucesso!', 'success');
    closeModal();
    await renderSales();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function approveSale(id) {
  if (!confirm('Aprovar esta venda?')) return;
  
  try {
    await api(`/sales/${id}/aprovar`, { method: 'PUT' });
    showToast('Venda aprovada!', 'success');
    await renderSales();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function cancelSale(id) {
  if (!confirm('Cancelar esta venda?')) return;
  
  try {
    await api(`/sales/${id}/cancelar`, { method: 'PUT' });
    showToast('Venda cancelada', 'warning');
    await renderSales();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

let serviceOrdersData = [];

async function renderServiceOrders() {
  const content = document.getElementById('content');
  
  try {
    const orders = await api('/service-orders');
    serviceOrdersData = orders;
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-wrench"></i> Ordens de Serviço</h2>
          <button class="btn btn-primary" onclick="openServiceOrderModal()">
            <i class="fas fa-plus"></i> Nova OS
          </button>
        </div>
        <div class="card-body">
          ${orders.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-wrench"></i>
              <h3>Nenhuma ordem de serviço</h3>
              <p>Clique em "Nova OS" para começar</p>
            </div>
          ` : `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map((o, index) => `
                    <tr>
                      <td><strong>${o.numero || o.id}</strong></td>
                      <td>${formatDate(o.createdAt)}</td>
                      <td>${o.cliente?.nome || '-'}</td>
                      <td>${o.veiculo_modelo || '-'}</td>
                      <td><span class="badge badge-${getStatusColor(o.status)}">${o.status}</span></td>
                      <td style="font-weight: bold; color: var(--success);">${formatCurrency(o.valor_total)}</td>
                      <td class="actions">
                        <button class="btn btn-sm btn-secondary" onclick="viewServiceOrderById(${index})">
                          <i class="fas fa-eye"></i>
                        </button>
                        ${o.status === 'ABERTA' ? `
                          <button class="btn btn-sm btn-success" onclick="closeServiceOrder(${o.id})">
                            <i class="fas fa-check"></i>
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-wrench"></i>
      <h3>Ordens de Serviço</h3>
      <p>Gerencie as ordens de serviço da loja</p>
      <button class="btn btn-primary" onclick="openServiceOrderModal()">
        <i class="fas fa-plus"></i> Nova OS
      </button>
    </div>`;
  }
}

function viewServiceOrderById(index) {
  const order = serviceOrdersData[index];
  if (!order) {
    showToast('OS não encontrada', 'error');
    return;
  }
  
  const content = `
    <div class="os-detail">
      <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <p><strong>Número:</strong> ${order.numero || order.id}</p>
        <p><strong>Data:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Cliente:</strong> ${order.cliente?.nome || '-'}</p>
        <p><strong>Status:</strong> <span class="badge badge-${getStatusColor(order.status)}">${order.status}</span></p>
        <p><strong>Veículo:</strong> ${order.veiculo_modelo || '-'}</p>
        <p><strong>Placa:</strong> ${order.veiculo_placa || '-'}</p>
      </div>
      
      ${order.problema_relatado ? `<p style="margin-top: 15px;"><strong>Problema:</strong> ${order.problema_relatado}</p>` : ''}
      
      ${order.itens?.length > 0 ? `
        <h4 style="margin-top: 20px;">Serviços</h4>
        <div class="table-container table-sm">
          <table>
            <thead><tr><th>Serviço</th><th>Qtd</th><th>Valor</th><th>Total</th></tr></thead>
            <tbody>
              ${order.itens.map(i => `
                <tr>
                  <td>${i.produto?.nome || i.descricao || 'Serviço'}</td>
                  <td>${i.quantidade}</td>
                  <td>${formatCurrency(i.valor_unitario)}</td>
                  <td>${formatCurrency(i.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div style="text-align: right; margin-top: 20px; font-size: 18px;">
        <strong>Total: </strong><span style="color: var(--success);">${formatCurrency(order.valor_total)}</span>
      </div>
    </div>
  `;
  
  openModal('Detalhes da OS #' + (order.numero || order.id), content);
}

async function openServiceOrderModal() {
  try {
    const [customers, allProducts] = await Promise.all([
      api('/customers'),
      api('/products')
    ]);
    
    const services = allProducts.filter(p => p.tipo === 'SERVICO');
    
    const formContent = `
      <form id="osForm" onsubmit="saveServiceOrder(event)">
        <div class="form-group">
          <label>Cliente</label>
          <select name="cliente_id">
            <option value="">Selecione o cliente</option>
            ${customers.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Modelo do Veículo</label>
            <input type="text" name="veiculo_modelo" placeholder="Ex: Moto Elétrica X1">
          </div>
          <div class="form-group">
            <label>Placa</label>
            <input type="text" name="veiculo_placa" placeholder="ABC-1234">
          </div>
        </div>
        
        <div class="form-group">
          <label>Problema Relatado</label>
          <textarea name="problema_relatado" rows="2" placeholder="Descreva o problema"></textarea>
        </div>
        
        <h4 style="margin: 15px 0 10px;">Serviços</h4>
        <div id="osItems">
          <div class="os-item-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select name="servico_id_0" style="flex: 2;" onchange="updateOSItemPrice(0)" required>
              <option value="">Selecione o serviço</option>
              ${services.map(s => `<option value="${s.id}" data-preco="${s.preco_venda}">${s.codigo || ''} - ${s.nome} - ${formatCurrency(s.preco_venda)}</option>`).join('')}
            </select>
            <input type="number" name="os_qtd_0" value="1" min="1" style="width: 70px;" onchange="updateOSItemPrice(0)">
            <input type="text" name="os_preco_0" style="width: 100px;" placeholder="Preço" readonly>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addOSItem()" style="margin-bottom: 15px;">
          <i class="fas fa-plus"></i> Adicionar Serviço
        </button>
        
        <div style="display: flex; justify-content: flex-end; padding: 10px 0; border-top: 1px solid var(--border);">
          <div style="font-size: 18px;">
            <strong>Total: </strong><span id="osTotal" style="color: var(--success); font-weight: bold;">R$ 0,00</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Criar OS</button>
        </div>
      </form>
    `;
    
    openModal('Nova Ordem de Serviço', formContent);
    window.osServices = services;
    window.osItemCount = 1;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function addOSItem() {
  const container = document.getElementById('osItems');
  const index = window.osItemCount++;
  const services = window.osServices || [];
  
  const row = document.createElement('div');
  row.className = 'os-item-row';
  row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
  row.innerHTML = `
    <select name="servico_id_${index}" style="flex: 2;" onchange="updateOSItemPrice(${index})">
      <option value="">Selecione o serviço</option>
      ${services.map(s => `<option value="${s.id}" data-preco="${s.preco_venda}">${s.codigo || ''} - ${s.nome} - ${formatCurrency(s.preco_venda)}</option>`).join('')}
    </select>
    <input type="number" name="os_qtd_${index}" value="1" min="1" style="width: 70px;" onchange="updateOSItemPrice(${index})">
    <input type="text" name="os_preco_${index}" style="width: 100px;" placeholder="Preço" readonly>
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); calcOSTotal();">
      <i class="fas fa-trash"></i>
    </button>
  `;
  container.appendChild(row);
}

function updateOSItemPrice(index) {
  const select = document.querySelector(`[name="servico_id_${index}"]`);
  const qtdInput = document.querySelector(`[name="os_qtd_${index}"]`);
  const precoInput = document.querySelector(`[name="os_preco_${index}"]`);
  
  if (select && qtdInput && precoInput) {
    const option = select.options[select.selectedIndex];
    const preco = parseFloat(option?.dataset?.preco) || 0;
    const qtd = parseInt(qtdInput.value) || 1;
    precoInput.value = formatCurrency(preco * qtd);
  }
  
  calcOSTotal();
}

function calcOSTotal() {
  let total = 0;
  const rows = document.querySelectorAll('.os-item-row');
  
  rows.forEach(row => {
    const select = row.querySelector('select');
    const qtdInput = row.querySelector('input[type="number"]');
    
    if (select && qtdInput) {
      const option = select.options[select.selectedIndex];
      const preco = parseFloat(option?.dataset?.preco) || 0;
      const qtd = parseInt(qtdInput.value) || 0;
      total += preco * qtd;
    }
  });
  
  document.getElementById('osTotal').textContent = formatCurrency(total);
}

async function saveServiceOrder(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const items = [];
  let i = 0;
  while (formData.has(`servico_id_${i}`)) {
    const servicoId = formData.get(`servico_id_${i}`);
    const quantidade = formData.get(`os_qtd_${i}`);
    
    if (servicoId && quantidade) {
      const service = window.osServices?.find(s => s.id == servicoId);
      items.push({
        produto_id: parseInt(servicoId),
        quantidade: parseInt(quantidade),
        preco_unitario: service?.preco_venda || 0
      });
    }
    i++;
  }
  
  if (items.length === 0) {
    showToast('Adicione pelo menos um serviço', 'error');
    return;
  }
  
  const data = {
    cliente_id: formData.get('cliente_id') ? parseInt(formData.get('cliente_id')) : null,
    veiculo_modelo: formData.get('veiculo_modelo'),
    veiculo_placa: formData.get('veiculo_placa'),
    problema_relatado: formData.get('problema_relatado'),
    itens: items
  };
  
  try {
    await api('/service-orders', { method: 'POST', body: data });
    showToast('OS criada com sucesso!', 'success');
    closeModal();
    await renderServiceOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function closeServiceOrder(id) {
  if (!confirm('Finalizar esta ordem de serviço?')) return;
  
  try {
    await api(`/service-orders/${id}/concluir`, { method: 'POST' });
    showToast('OS finalizada!', 'success');
    await renderServiceOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderCustomers() {
  const content = document.getElementById('content');
  
  try {
    const customers = await api('/customers');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Clientes</h2>
          <button class="btn btn-primary" onclick="openCustomerModal()">
            <i class="fas fa-plus"></i> Novo Cliente
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${customers.map(c => `
                  <tr>
                    <td>${c.nome}</td>
                    <td>${c.cpf_cnpj || '-'}</td>
                    <td>${c.telefone || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="viewCustomer(${c.id})" title="Ver cadastro completo">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-primary" onclick="editCustomer(${c.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openCustomerModal() {
  const formContent = `
    <form id="customerForm" onsubmit="saveCustomer(event)">
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" name="nome" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>CPF/CNPJ</label>
          <input type="text" name="cpf_cnpj">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="text" name="telefone">
        </div>
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email">
      </div>
      
      <div class="form-group">
        <label>Endereço</label>
        <textarea name="endereco" rows="2"></textarea>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Novo Cliente', formContent);
}

async function saveCustomer(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/customers', { method: 'POST', body: data });
    showToast('Cliente cadastrado');
    closeModal();
    await renderCustomers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteCustomer(id) {
  if (!confirm('Excluir este cliente?')) return;
  
  try {
    await api(`/customers/${id}`, { method: 'DELETE' });
    showToast('Cliente excluído');
    await renderCustomers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function viewCustomer(id) {
  try {
    const customer = await api(`/customers/${id}`);
    
    const content = `
      <div class="detail-view">
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Dados Pessoais</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Nome</label>
              <span>${customer.nome || '-'}</span>
            </div>
            <div class="detail-item">
              <label>CPF/CNPJ</label>
              <span>${customer.cpf_cnpj || '-'}</span>
            </div>
            <div class="detail-item">
              <label>RG</label>
              <span>${customer.rg || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Data de Nascimento</label>
              <span>${customer.data_nascimento ? formatDate(customer.data_nascimento) : '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-phone"></i> Contato</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Telefone</label>
              <span>${customer.telefone || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Celular</label>
              <span>${customer.celular || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <span>${customer.email || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Endereco</h4>
          <div class="detail-grid">
            <div class="detail-item full-width">
              <label>Endereco Completo</label>
              <span>${customer.endereco || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Cidade</label>
              <span>${customer.cidade || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Estado</label>
              <span>${customer.estado || '-'}</span>
            </div>
            <div class="detail-item">
              <label>CEP</label>
              <span>${customer.cep || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Informacoes Adicionais</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Cadastrado em</label>
              <span>${customer.createdAt ? formatDate(customer.createdAt) : '-'}</span>
            </div>
            <div class="detail-item">
              <label>Loja</label>
              <span>${customer.loja?.nome || '-'}</span>
            </div>
            <div class="detail-item full-width">
              <label>Observacoes</label>
              <span>${customer.observacoes || '-'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="editCustomer(${id})">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
      </div>
    `;
    
    openModal('Cadastro do Cliente', content);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editCustomer(id) {
  try {
    const customer = await api(`/customers/${id}`);
    
    const formContent = `
      <form id="customerForm" onsubmit="updateCustomer(event, ${id})">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" name="nome" value="${customer.nome || ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>CPF/CNPJ</label>
            <input type="text" name="cpf_cnpj" value="${customer.cpf_cnpj || ''}">
          </div>
          <div class="form-group">
            <label>RG</label>
            <input type="text" name="rg" value="${customer.rg || ''}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Telefone</label>
            <input type="text" name="telefone" value="${customer.telefone || ''}">
          </div>
          <div class="form-group">
            <label>Celular</label>
            <input type="text" name="celular" value="${customer.celular || ''}">
          </div>
        </div>
        
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${customer.email || ''}">
        </div>
        
        <div class="form-group">
          <label>Endereco</label>
          <textarea name="endereco" rows="2">${customer.endereco || ''}</textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" name="cidade" value="${customer.cidade || ''}">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <input type="text" name="estado" value="${customer.estado || ''}" maxlength="2">
          </div>
          <div class="form-group">
            <label>CEP</label>
            <input type="text" name="cep" value="${customer.cep || ''}">
          </div>
        </div>
        
        <div class="form-group">
          <label>Observacoes</label>
          <textarea name="observacoes" rows="3">${customer.observacoes || ''}</textarea>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `;
    
    openModal('Editar Cliente', formContent);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function updateCustomer(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api(`/customers/${id}`, { method: 'PUT', body: data });
    showToast('Cliente atualizado');
    closeModal();
    await renderCustomers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderVendors() {
  const content = document.getElementById('content');
  
  try {
    const vendors = await api('/vendors');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Vendedores</h2>
          <button class="btn btn-primary" onclick="openVendorModal()">
            <i class="fas fa-plus"></i> Novo Vendedor
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Comissao</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                ${vendors.map(v => `
                  <tr>
                    <td>${v.nome}</td>
                    <td>${v.email || '-'}</td>
                    <td>${v.telefone || '-'}</td>
                    <td>${v.comissao || 0}%</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="viewVendor(${v.id})" title="Ver cadastro completo">
                        <i class="fas fa-eye"></i>
                      </button>
                      ${currentUser.perfil !== 'OPERACIONAL' ? `
                      <button class="btn btn-sm btn-primary" onclick="editVendor(${v.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="deleteVendor(${v.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                      </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openVendorModal() {
  const formContent = `
    <form id="vendorForm" onsubmit="saveVendor(event)">
      <div class="form-group">
        <label>Nome *</label>
        <input type="text" name="nome" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="text" name="telefone">
        </div>
      </div>
      
      <div class="form-group">
        <label>Comissão (%)</label>
        <input type="number" step="0.01" name="comissao" value="5">
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Novo Vendedor', formContent);
}

async function saveVendor(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/vendors', { method: 'POST', body: data });
    showToast('Vendedor cadastrado');
    closeModal();
    await renderVendors();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function viewVendor(id) {
  try {
    const vendor = await api(`/vendors/${id}`);
    
    const content = `
      <div class="detail-view">
        <div class="detail-section">
          <h4><i class="fas fa-user-tie"></i> Dados do Vendedor</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Nome</label>
              <span>${vendor.nome || '-'}</span>
            </div>
            <div class="detail-item">
              <label>CPF</label>
              <span>${vendor.cpf || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-phone"></i> Contato</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Telefone</label>
              <span>${vendor.telefone || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <span>${vendor.email || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-percentage"></i> Configuracoes de Venda</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Comissao</label>
              <span>${vendor.comissao || 0}%</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Informacoes Adicionais</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Cadastrado em</label>
              <span>${vendor.createdAt ? formatDate(vendor.createdAt) : '-'}</span>
            </div>
            <div class="detail-item">
              <label>Loja</label>
              <span>${vendor.loja?.nome || '-'}</span>
            </div>
            <div class="detail-item full-width">
              <label>Observacoes</label>
              <span>${vendor.observacoes || '-'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="editVendor(${id})">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
      </div>
    `;
    
    openModal('Cadastro do Vendedor', content);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editVendor(id) {
  try {
    const vendor = await api(`/vendors/${id}`);
    
    const formContent = `
      <form id="vendorForm" onsubmit="updateVendor(event, ${id})">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" name="nome" value="${vendor.nome || ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" value="${vendor.email || ''}">
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input type="text" name="telefone" value="${vendor.telefone || ''}">
          </div>
        </div>
        
        <div class="form-group">
          <label>CPF</label>
          <input type="text" name="cpf" value="${vendor.cpf || ''}">
        </div>
        
        <div class="form-group">
          <label>Comissao (%)</label>
          <input type="number" step="0.01" name="comissao" value="${vendor.comissao || 5}">
        </div>
        
        <div class="form-group">
          <label>Observacoes</label>
          <textarea name="observacoes" rows="3">${vendor.observacoes || ''}</textarea>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `;
    
    openModal('Editar Vendedor', formContent);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function updateVendor(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api(`/vendors/${id}`, { method: 'PUT', body: data });
    showToast('Vendedor atualizado');
    closeModal();
    await renderVendors();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteVendor(id) {
  if (!confirm('Excluir este vendedor?')) return;
  
  try {
    await api(`/vendors/${id}`, { method: 'DELETE' });
    showToast('Vendedor excluido');
    await renderVendors();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderReceivables() {
  const content = document.getElementById('content');
  
  try {
    const contas = await api('/financial/receber');
    
    const pendentes = contas.filter(c => c.status !== 'PAGO');
    const totalPendente = pendentes.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    const vencidas = pendentes.filter(c => new Date(c.data_vencimento) < new Date());
    const totalVencido = vencidas.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-hand-holding-usd"></i> Contas a Receber</h2>
          <button class="btn btn-primary" onclick="openReceivableModal()">
            <i class="fas fa-plus"></i> Nova Conta
          </button>
        </div>
        
        <div class="financial-summary">
          <div class="summary-item">
            <span class="label">Total Pendente:</span>
            <span class="value positive">${formatCurrency(totalPendente)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Vencidas:</span>
            <span class="value negative">${formatCurrency(totalVencido)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Quantidade:</span>
            <span class="value">${pendentes.length} contas</span>
          </div>
        </div>
        
        <div class="card-body">
          <div class="filters">
            <select id="filterStatusReceber" onchange="filterReceivables()">
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGO">Pago</option>
            </select>
          </div>
          
          <div class="table-container">
            <table id="receivablesTable">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Pago</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${contas.map(c => {
                  const vencida = c.status !== 'PAGO' && new Date(c.data_vencimento) < new Date();
                  return `
                    <tr data-status="${c.status}" class="${vencida ? 'row-vencida' : ''}">
                      <td>${c.descricao || '-'}</td>
                      <td>${c.cliente?.nome || '-'}</td>
                      <td>${formatDate(c.data_vencimento)} ${vencida ? '<span class="badge badge-danger">Vencida</span>' : ''}</td>
                      <td>${formatCurrency(c.valor)}</td>
                      <td>${formatCurrency(c.valor_pago || 0)}</td>
                      <td><span class="badge badge-${c.status === 'PAGO' ? 'success' : c.status === 'PARCIAL' ? 'warning' : 'secondary'}">${c.status}</span></td>
                      <td class="actions">
                        ${c.status !== 'PAGO' ? `
                          <button class="btn btn-sm btn-success" onclick="openBaixaReceberModal(${c.id}, ${c.valor}, ${c.valor_pago || 0})">
                            <i class="fas fa-check"></i> Baixar
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          ${contas.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-hand-holding-usd"></i>
              <h3>Nenhuma conta a receber</h3>
              <p>As contas são geradas automaticamente pelas vendas ou podem ser criadas manualmente</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function filterReceivables() {
  const status = document.getElementById('filterStatusReceber').value;
  const rows = document.querySelectorAll('#receivablesTable tbody tr');
  
  rows.forEach(row => {
    const rowStatus = row.dataset.status;
    row.style.display = !status || rowStatus === status ? '' : 'none';
  });
}

function openReceivableModal() {
  const formContent = `
    <form id="receivableForm" onsubmit="saveReceivable(event)">
      <div class="form-group">
        <label>Descrição *</label>
        <input type="text" name="descricao" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Cliente</label>
          <input type="text" name="cliente_nome">
        </div>
        <div class="form-group">
          <label>Valor *</label>
          <input type="number" step="0.01" name="valor" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Vencimento *</label>
          <input type="date" name="data_vencimento" required>
        </div>
        <div class="form-group">
          <label>Observações</label>
          <input type="text" name="observacoes">
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Nova Conta a Receber', formContent);
}

async function saveReceivable(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  data.status = 'PENDENTE';
  
  try {
    await api('/financial/receber', { method: 'POST', body: data });
    showToast('Conta cadastrada');
    closeModal();
    await renderReceivables();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openBaixaReceberModal(id, valorTotal, valorPago) {
  const restante = valorTotal - valorPago;
  
  const formContent = `
    <form id="baixaReceberForm" onsubmit="baixarReceivable(event, ${id})">
      <div class="info-row">
        <p><strong>Valor Total:</strong> ${formatCurrency(valorTotal)}</p>
        <p><strong>Já Pago:</strong> ${formatCurrency(valorPago)}</p>
        <p><strong>Restante:</strong> ${formatCurrency(restante)}</p>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Valor Recebido *</label>
          <input type="number" step="0.01" name="valor_pago" value="${restante.toFixed(2)}" max="${restante.toFixed(2)}" required>
        </div>
        <div class="form-group">
          <label>Data do Pagamento</label>
          <input type="date" name="data_pagamento" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">Confirmar Baixa</button>
      </div>
    </form>
  `;
  
  openModal('Baixar Conta a Receber', formContent);
}

async function baixarReceivable(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api(`/financial/receber/${id}/baixar`, { method: 'POST', body: data });
    showToast('Conta baixada com sucesso');
    closeModal();
    await renderReceivables();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderPayables() {
  const content = document.getElementById('content');
  
  try {
    const contas = await api('/financial/pagar');
    
    const pendentes = contas.filter(c => c.status !== 'PAGO');
    const totalPendente = pendentes.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    const vencidas = pendentes.filter(c => new Date(c.data_vencimento) < new Date());
    const totalVencido = vencidas.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-file-invoice-dollar"></i> Contas a Pagar</h2>
          <button class="btn btn-primary" onclick="openPayableModal()">
            <i class="fas fa-plus"></i> Nova Conta
          </button>
        </div>
        
        <div class="financial-summary negative">
          <div class="summary-item">
            <span class="label">Total Pendente:</span>
            <span class="value">${formatCurrency(totalPendente)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Vencidas:</span>
            <span class="value negative">${formatCurrency(totalVencido)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Quantidade:</span>
            <span class="value">${pendentes.length} contas</span>
          </div>
        </div>
        
        <div class="card-body">
          <div class="filters">
            <select id="filterStatusPagar" onchange="filterPayables()">
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGO">Pago</option>
            </select>
          </div>
          
          <div class="table-container">
            <table id="payablesTable">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Fornecedor</th>
                  <th>Categoria</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Pago</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${contas.map(c => {
                  const vencida = c.status !== 'PAGO' && new Date(c.data_vencimento) < new Date();
                  return `
                    <tr data-status="${c.status}" class="${vencida ? 'row-vencida' : ''}">
                      <td>${c.descricao}</td>
                      <td>${c.fornecedor || '-'}</td>
                      <td>${c.categoria || '-'}</td>
                      <td>${formatDate(c.data_vencimento)} ${vencida ? '<span class="badge badge-danger">Vencida</span>' : ''}</td>
                      <td>${formatCurrency(c.valor)}</td>
                      <td>${formatCurrency(c.valor_pago || 0)}</td>
                      <td><span class="badge badge-${c.status === 'PAGO' ? 'success' : c.status === 'PARCIAL' ? 'warning' : 'secondary'}">${c.status}</span></td>
                      <td class="actions">
                        ${c.status !== 'PAGO' ? `
                          <button class="btn btn-sm btn-success" onclick="openBaixaPagarModal(${c.id}, ${c.valor}, ${c.valor_pago || 0})">
                            <i class="fas fa-check"></i> Baixar
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          ${contas.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-file-invoice-dollar"></i>
              <h3>Nenhuma conta a pagar</h3>
              <p>Clique em "Nova Conta" para cadastrar</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function filterPayables() {
  const status = document.getElementById('filterStatusPagar').value;
  const rows = document.querySelectorAll('#payablesTable tbody tr');
  
  rows.forEach(row => {
    const rowStatus = row.dataset.status;
    row.style.display = !status || rowStatus === status ? '' : 'none';
  });
}

function openBaixaPagarModal(id, valorTotal, valorPago) {
  const restante = valorTotal - valorPago;
  
  const formContent = `
    <form id="baixaPagarForm" onsubmit="baixarPayable(event, ${id})">
      <div class="info-row">
        <p><strong>Valor Total:</strong> ${formatCurrency(valorTotal)}</p>
        <p><strong>Já Pago:</strong> ${formatCurrency(valorPago)}</p>
        <p><strong>Restante:</strong> ${formatCurrency(restante)}</p>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Valor Pago *</label>
          <input type="number" step="0.01" name="valor_pago" value="${restante.toFixed(2)}" max="${restante.toFixed(2)}" required>
        </div>
        <div class="form-group">
          <label>Data do Pagamento</label>
          <input type="date" name="data_pagamento" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">Confirmar Pagamento</button>
      </div>
    </form>
  `;
  
  openModal('Baixar Conta a Pagar', formContent);
}

async function baixarPayable(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api(`/financial/pagar/${id}/baixar`, { method: 'POST', body: data });
    showToast('Conta paga com sucesso');
    closeModal();
    await renderPayables();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openPayableModal() {
  const formContent = `
    <form id="payableForm" onsubmit="savePayable(event)">
      <div class="form-group">
        <label>Descrição *</label>
        <input type="text" name="descricao" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Fornecedor</label>
          <input type="text" name="fornecedor">
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select name="categoria">
            <option value="">Selecione...</option>
            <option value="ALUGUEL">Aluguel</option>
            <option value="ENERGIA">Energia</option>
            <option value="AGUA">Água</option>
            <option value="INTERNET">Internet</option>
            <option value="FORNECEDOR">Fornecedor</option>
            <option value="SALARIOS">Salários</option>
            <option value="OUTROS">Outros</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Valor *</label>
          <input type="number" step="0.01" name="valor" required>
        </div>
        <div class="form-group">
          <label>Vencimento *</label>
          <input type="date" name="data_vencimento" required>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Nova Conta a Pagar', formContent);
}

async function savePayable(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/financial/pagar', { method: 'POST', body: data });
    showToast('Conta cadastrada');
    closeModal();
    await renderPayables();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderReconciliation() {
  const content = document.getElementById('content');
  
  try {
    const [dashboard, contas, transacoes] = await Promise.all([
      api('/bank/dashboard'),
      api('/bank/contas'),
      api('/bank/transacoes')
    ]);
    
    const pendentes = transacoes.filter(t => !t.conciliado);
    const conciliadas = transacoes.filter(t => t.conciliado);
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-university"></i> Conciliação Bancária</h2>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="openContaBancariaModal()">
              <i class="fas fa-plus"></i> Nova Conta
            </button>
          </div>
        </div>
        
        <div class="reconciliation-dashboard">
          <div class="recon-metric">
            <div class="metric-icon green"><i class="fas fa-arrow-down"></i></div>
            <div class="metric-info">
              <span class="metric-value">${formatCurrency(dashboard.totalReceber)}</span>
              <span class="metric-label">A Receber</span>
            </div>
          </div>
          <div class="recon-metric">
            <div class="metric-icon red"><i class="fas fa-arrow-up"></i></div>
            <div class="metric-info">
              <span class="metric-value">${formatCurrency(dashboard.totalPagar)}</span>
              <span class="metric-label">A Pagar</span>
            </div>
          </div>
          <div class="recon-metric">
            <div class="metric-icon orange"><i class="fas fa-wallet"></i></div>
            <div class="metric-info">
              <span class="metric-value">${formatCurrency(dashboard.saldoBancario)}</span>
              <span class="metric-label">Saldo Bancário</span>
            </div>
          </div>
          <div class="recon-metric">
            <div class="metric-icon yellow"><i class="fas fa-clock"></i></div>
            <div class="metric-info">
              <span class="metric-value">${dashboard.transacoesPendentes}</span>
              <span class="metric-label">Pendentes</span>
            </div>
          </div>
        </div>
        
        ${contas.length > 0 ? `
          <div class="bank-accounts-section">
            <h3>Contas Bancárias</h3>
            <div class="bank-accounts-grid">
              ${contas.map(c => `
                <div class="bank-account-card">
                  <div class="bank-logo">
                    <i class="fas fa-university"></i>
                  </div>
                  <div class="bank-info">
                    <strong>${c.nome}</strong>
                    <span>${c.banco || ''} - Ag: ${c.agencia || '-'} / Conta: ${c.numero_conta || '-'}</span>
                  </div>
                  <div class="bank-balance">
                    <span class="balance-label">Saldo</span>
                    <span class="balance-value ${parseFloat(c.saldo_atual || 0) >= 0 ? 'positive' : 'negative'}">
                      ${formatCurrency(c.saldo_atual || 0)}
                    </span>
                  </div>
                  <div class="bank-actions">
                    <button class="btn btn-sm btn-primary" onclick="openImportarExtratoModal(${c.id}, '${c.nome}')">
                      <i class="fas fa-upload"></i> Importar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBankAccount(${c.id}, '${c.nome}')" title="Excluir conta">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="empty-state-small">
            <p>Nenhuma conta bancária cadastrada. <a href="#" onclick="openContaBancariaModal()">Cadastre uma conta</a></p>
          </div>
        `}
        
        <div class="card-body">
          <div class="reconciliation-tabs">
            <button class="tab-btn active" onclick="showReconciliationTab('pendentes')">
              <i class="fas fa-clock"></i> Pendentes (${pendentes.length})
            </button>
            <button class="tab-btn" onclick="showReconciliationTab('conciliadas')">
              <i class="fas fa-check"></i> Conciliadas (${conciliadas.length})
            </button>
          </div>
          
          <div id="reconciliationContent">
            ${pendentes.length > 0 ? `
              <div class="auto-reconcile-bar">
                <span><i class="fas fa-magic"></i> ${pendentes.length} transações aguardando conciliação</span>
                <button class="btn btn-success" onclick="autoReconcile()">
                  <i class="fas fa-bolt"></i> Conciliar Automaticamente
                </button>
              </div>
              
              <div class="transactions-list">
                ${pendentes.map(t => `
                  <div class="transaction-item ${t.tipo === 'CREDITO' ? 'credit' : 'debit'}">
                    <div class="trans-date">${formatDate(t.data)}</div>
                    <div class="trans-info">
                      <span class="trans-desc">${t.historico || 'Sem descrição'}</span>
                      <span class="trans-account">${t.conta?.nome || 'Conta'}</span>
                    </div>
                    <div class="trans-value ${t.tipo === 'CREDITO' ? 'positive' : 'negative'}">
                      ${t.tipo === 'CREDITO' ? '+' : '-'} ${formatCurrency(t.valor)}
                    </div>
                    <div class="trans-actions">
                      <button class="btn btn-sm btn-primary" onclick="openManualReconcileModal(${t.id}, '${t.tipo}', ${t.valor})">
                        <i class="fas fa-link"></i> Conciliar
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>Tudo conciliado!</h3>
                <p>Não há transações pendentes de conciliação</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showReconciliationTab(tab) {
  renderReconciliation();
}

function openContaBancariaModal() {
  const formContent = `
    <form id="contaBancariaForm" onsubmit="saveContaBancaria(event)">
      <div class="form-group">
        <label>Nome da Conta *</label>
        <input type="text" name="nome" placeholder="Ex: Conta Principal" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Banco</label>
          <select name="banco">
            <option value="">Selecione...</option>
            <option value="001">Banco do Brasil</option>
            <option value="033">Santander</option>
            <option value="104">Caixa</option>
            <option value="237">Bradesco</option>
            <option value="341">Itaú</option>
            <option value="077">Inter</option>
            <option value="260">Nubank</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tipo de Conta</label>
          <select name="tipo">
            <option value="CORRENTE">Conta Corrente</option>
            <option value="POUPANCA">Poupança</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Agência</label>
          <input type="text" name="agencia">
        </div>
        <div class="form-group">
          <label>Número da Conta</label>
          <input type="text" name="numero_conta">
        </div>
      </div>
      
      <div class="form-group">
        <label>Saldo Inicial</label>
        <input type="number" step="0.01" name="saldo_atual" value="0">
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Nova Conta Bancária', formContent);
}

async function saveContaBancaria(event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/bank/contas', { method: 'POST', body: data });
    showToast('Conta bancária cadastrada');
    closeModal();
    await renderReconciliation();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openImportarExtratoModal(contaId, contaNome) {
  const formContent = `
    <form id="importExtratoForm" onsubmit="importarExtrato(event)">
      <input type="hidden" name="conta_id" value="${contaId}">
      
      <div class="import-info">
        <i class="fas fa-info-circle"></i>
        <p>Importando para: <strong>${contaNome}</strong></p>
      </div>
      
      <div class="upload-area" id="extratoUploadArea">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Arraste o arquivo aqui ou clique para selecionar</p>
        <span>Formatos aceitos: OFX, CSV, XLS, XLSX</span>
        <input type="file" name="arquivo" id="extratoFile" accept=".ofx,.csv,.xls,.xlsx" onchange="handleExtratoFile(this)" required>
      </div>
      
      <div id="extratoFileName" class="file-selected" style="display: none;">
        <i class="fas fa-file"></i>
        <span id="extratoFileNameText"></span>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Importar</button>
      </div>
    </form>
  `;
  
  openModal('Importar Extrato Bancário', formContent);
}

function handleExtratoFile(input) {
  if (input.files && input.files[0]) {
    document.getElementById('extratoFileName').style.display = 'flex';
    document.getElementById('extratoFileNameText').textContent = input.files[0].name;
    document.getElementById('extratoUploadArea').classList.add('has-file');
  }
}

async function importarExtrato(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    const response = await fetch('/api/bank/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) throw new Error(result.error);
    
    showToast(`Importação concluída: ${result.importadas} transações importadas, ${result.duplicadas} duplicadas ignoradas`);
    closeModal();
    await renderReconciliation();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteBankAccount(id, nome) {
  const confirm1 = confirm(`Deseja excluir a conta "${nome}"?\n\nTodas as transações importadas também serão excluídas.`);
  if (!confirm1) return;
  
  try {
    await api(`/bank/contas/${id}`, { method: 'DELETE' });
    showToast('Conta bancária excluída com sucesso');
    await renderReconciliation();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function autoReconcile() {
  try {
    const contas = await api('/bank/contas');
    
    if (contas.length === 0) {
      showToast('Nenhuma conta bancária cadastrada', 'error');
      return;
    }
    
    let totalConciliadas = 0;
    let totalPendentes = 0;
    
    for (const conta of contas) {
      const result = await api('/bank/auto-reconcile', { method: 'POST', body: { conta_id: conta.id } });
      totalConciliadas += result.conciliadas;
      totalPendentes += result.pendentes;
    }
    
    showToast(`Conciliação automática: ${totalConciliadas} conciliadas, ${totalPendentes} pendentes`);
    await renderReconciliation();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function openManualReconcileModal(transacaoId, tipo, valor) {
  try {
    let contas = [];
    
    if (tipo === 'CREDITO') {
      contas = await api('/financial/receber?status=PENDENTE');
    } else {
      contas = await api('/financial/pagar?status=PENDENTE');
    }
    
    const contasCompativeis = contas.filter(c => {
      const valorConta = parseFloat(c.valor) - parseFloat(c.valor_pago || 0);
      return Math.abs(valorConta - valor) < 0.01;
    });
    
    const formContent = `
      <form id="manualReconcileForm" onsubmit="manualReconcile(event, ${transacaoId})">
        <input type="hidden" name="tipo" value="${tipo === 'CREDITO' ? 'receber' : 'pagar'}">
        
        <div class="info-row">
          <p><strong>Valor da Transação:</strong> ${formatCurrency(valor)}</p>
          <p><strong>Tipo:</strong> ${tipo === 'CREDITO' ? 'Entrada' : 'Saída'}</p>
        </div>
        
        ${contasCompativeis.length > 0 ? `
          <div class="matching-accounts">
            <h4><i class="fas fa-magic"></i> Contas com valor correspondente:</h4>
            ${contasCompativeis.map(c => `
              <label class="account-option">
                <input type="radio" name="referencia_id" value="${c.id}">
                <div class="account-details">
                  <strong>${c.descricao || 'Sem descrição'}</strong>
                  <span>${c.cliente?.nome || c.fornecedor || '-'} - ${formatCurrency(c.valor)}</span>
                </div>
              </label>
            `).join('')}
          </div>
        ` : `
          <div class="no-matches">
            <i class="fas fa-search"></i>
            <p>Nenhuma conta ${tipo === 'CREDITO' ? 'a receber' : 'a pagar'} com valor correspondente encontrada.</p>
          </div>
        `}
        
        ${contas.length > contasCompativeis.length ? `
          <details class="all-accounts">
            <summary>Ver todas as contas (${contas.length})</summary>
            <div class="accounts-list">
              ${contas.map(c => `
                <label class="account-option">
                  <input type="radio" name="referencia_id" value="${c.id}">
                  <div class="account-details">
                    <strong>${c.descricao || 'Sem descrição'}</strong>
                    <span>${c.cliente?.nome || c.fornecedor || '-'} - ${formatCurrency(c.valor)}</span>
                  </div>
                </label>
              `).join('')}
            </div>
          </details>
        ` : ''}
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-success" ${contas.length === 0 ? 'disabled' : ''}>Conciliar</button>
        </div>
      </form>
    `;
    
    openModal('Conciliar Transação', formContent);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function manualReconcile(event, transacaoId) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  data.transacao_id = transacaoId;
  
  if (!data.referencia_id) {
    showToast('Selecione uma conta para conciliar', 'error');
    return;
  }
  
  try {
    await api('/bank/reconcile', { method: 'POST', body: data });
    showToast('Transação conciliada com sucesso');
    closeModal();
    await renderReconciliation();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderCashFlow() {
  const content = document.getElementById('content');
  
  try {
    const fluxo = await api('/financial/fluxo-caixa');
    
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-arrow-down"></i></div>
          <div class="stat-value">${formatCurrency(fluxo.receber?.total_previsto)}</div>
          <div class="stat-label">Total a Receber</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fas fa-arrow-up"></i></div>
          <div class="stat-value">${formatCurrency(fluxo.pagar?.total_previsto)}</div>
          <div class="stat-label">Total a Pagar</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow"><i class="fas fa-balance-scale"></i></div>
          <div class="stat-value">${formatCurrency(fluxo.saldo_previsto)}</div>
          <div class="stat-label">Saldo Previsto</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-check-circle"></i></div>
          <div class="stat-value">${formatCurrency(fluxo.saldo_realizado)}</div>
          <div class="stat-label">Saldo Realizado</div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderUsers() {
  const content = document.getElementById('content');
  
  try {
    const users = await api('/users');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-users"></i> Usuários</h2>
          <button class="btn btn-primary" onclick="openUserModal()">
            <i class="fas fa-plus"></i> Novo Usuário
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td>${u.nome}</td>
                    <td>${u.email}</td>
                    <td><span class="badge badge-${u.perfil === 'ADMIN_GLOBAL' ? 'primary' : u.perfil === 'GESTOR_FRANQUIA' ? 'warning' : 'secondary'}">${u.perfil}</span></td>
                    <td><span class="badge badge-${u.ativo ? 'success' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td class="actions">
                      <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Apagar
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function openUserModal() {
  try {
    const [roles, stores] = await Promise.all([
      api('/settings/roles'),
      api('/stores')
    ]);
    
    const rolesTMI = roles.filter(r => r.escopo === 'TMIMPORTS' || r.escopo === 'AMBOS');
    const rolesTecle = roles.filter(r => r.escopo === 'TECLE_MOTOS' || r.escopo === 'AMBOS');
    
    const formContent = `
      <form id="userForm" onsubmit="saveUser(event)">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" name="nome" required>
        </div>
        
        <div class="form-group">
          <label>Email *</label>
          <input type="email" name="email" required>
        </div>
        
        <div class="form-group">
          <label>Senha Temporária</label>
          <input type="password" name="senha" value="temp123">
          <small class="form-hint">O usuário deve alterar no primeiro acesso</small>
        </div>
        
        <div class="form-group">
          <label>Loja *</label>
          <select name="loja_id" id="userLojaSelect" required onchange="updateRolesByStore(this.value)">
            <option value="">Selecione a loja</option>
            ${stores.map(s => `<option value="${s.id}" data-empresa-tipo="${s.empresa?.tipo || 'FRANQUIA'}">${s.nome}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Perfil Principal *</label>
          <select name="perfil" id="userPerfilSelect" required>
            <option value="">Selecione primeiro a loja</option>
          </select>
          <small class="form-hint" id="perfilHint">Os perfis disponíveis dependem do tipo de loja selecionada</small>
        </div>
        
        <div class="form-group">
          <label>Funções Adicionais (Multi-Role)</label>
          <div id="rolesCheckboxContainer" class="roles-checkbox-container">
            <small class="form-hint">Selecione a loja para ver as funções disponíveis</small>
          </div>
          <small class="form-hint">O usuário terá as permissões combinadas de todas as funções selecionadas</small>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" name="ativo" checked> Usuário Ativo
          </label>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Cadastrar</button>
        </div>
      </form>
    `;
    
    openModal('Novo Usuário', formContent);
    
    window.cachedRoles = { tmi: rolesTMI, tecle: rolesTecle, all: roles };
  } catch (error) {
    showToast('Erro ao carregar dados: ' + error.message, 'error');
  }
}

function updateRolesByStore(lojaId) {
  const select = document.getElementById('userLojaSelect');
  const perfilSelect = document.getElementById('userPerfilSelect');
  const hint = document.getElementById('perfilHint');
  const checkboxContainer = document.getElementById('rolesCheckboxContainer');
  
  if (!lojaId || !select.selectedOptions[0]) {
    perfilSelect.innerHTML = '<option value="">Selecione primeiro a loja</option>';
    checkboxContainer.innerHTML = '<small class="form-hint">Selecione a loja para ver as funções disponíveis</small>';
    return;
  }
  
  const empresaTipo = select.selectedOptions[0].dataset.empresaTipo;
  const isMatriz = empresaTipo === 'MATRIZ';
  
  let roles = [];
  if (isMatriz) {
    roles = window.cachedRoles?.tmi || [];
    hint.textContent = 'Perfis para TM Imports (Atacado)';
  } else {
    roles = window.cachedRoles?.tecle || [];
    hint.textContent = 'Perfis para Tecle Motos (Franquia)';
  }
  
  perfilSelect.innerHTML = roles.map(r => 
    `<option value="${r.codigo}">${r.nome}</option>`
  ).join('');
  
  checkboxContainer.innerHTML = roles.map(r => `
    <label class="role-checkbox">
      <input type="checkbox" name="roles" value="${r.id}" data-codigo="${r.codigo}">
      <span class="role-label">
        <strong>${r.nome}</strong>
        <small>${r.descricao || ''}</small>
      </span>
    </label>
  `).join('');
}

async function saveUser(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  data.ativo = formData.has('ativo');
  data.loja_id = parseInt(data.loja_id);
  
  const roleCheckboxes = document.querySelectorAll('input[name="roles"]:checked');
  data.role_ids = Array.from(roleCheckboxes).map(cb => parseInt(cb.value));
  
  try {
    await api('/users', { method: 'POST', body: data });
    showToast('Usuário cadastrado com sucesso');
    closeModal();
    await renderUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function confirmDeleteUser(id, nome) {
  const confirmContent = `
    <div class="confirm-delete">
      <div class="confirm-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3>Confirmar Exclusão</h3>
      <p>Tem certeza que deseja <strong>apagar permanentemente</strong> o usuário:</p>
      <p class="user-name">${nome}</p>
      <p class="warning-text">Esta ação não pode ser desfeita!</p>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="button" class="btn btn-danger" onclick="deleteUser(${id})">
          <i class="fas fa-trash"></i> Apagar Permanentemente
        </button>
      </div>
    </div>
  `;
  
  openModal('Apagar Usuário', confirmContent);
}

async function deleteUser(id) {
  try {
    await api(`/users/${id}`, { method: 'DELETE' });
    showToast('Usuário apagado com sucesso');
    closeModal();
    await renderUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

let franquiasData = [];

async function renderCompanies() {
  const content = document.getElementById('content');
  
  try {
    const companies = await api('/companies');
    const franquias = companies.filter(c => c.tipo === 'FRANQUIA');
    franquiasData = franquias;
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-store"></i> Gestão de Franquias</h2>
          <button class="btn btn-primary" onclick="openCompanyModal()">
            <i class="fas fa-plus"></i> Nova Franquia
          </button>
        </div>
        <div class="card-body">
          ${franquias.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-store"></i>
              <h3>Nenhuma franquia cadastrada</h3>
              <p>Clique em "Nova Franquia" para cadastrar uma franquia completa com loja e administrador</p>
            </div>
          ` : `
            <div class="franchise-list">
              ${franquias.map((c, index) => `
                <div class="franchise-card">
                  <div class="franchise-header">
                    <div class="franchise-info">
                      <h3>${c.nome}</h3>
                      <span class="badge badge-${c.ativo ? 'success' : 'danger'}">${c.ativo ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div class="franchise-actions">
                      <button class="btn btn-sm btn-secondary" onclick="viewFranchiseById(${index})">
                        <i class="fas fa-eye"></i> Detalhes
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="deleteCompany(${c.id})">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div class="franchise-details">
                    <div class="detail-row">
                      <i class="fas fa-id-card"></i>
                      <span><strong>CNPJ:</strong> ${c.cnpj || 'Não informado'}</span>
                    </div>
                    <div class="detail-row">
                      <i class="fas fa-phone"></i>
                      <span><strong>Telefone:</strong> ${c.telefone || 'Não informado'}</span>
                    </div>
                    <div class="detail-row">
                      <i class="fas fa-envelope"></i>
                      <span><strong>Email:</strong> ${c.email || 'Não informado'}</span>
                    </div>
                  </div>
                  <div class="franchise-sections">
                    <div class="franchise-section">
                      <h4><i class="fas fa-map-marker-alt"></i> Lojas (${c.lojas?.length || 0})</h4>
                      ${c.lojas?.length > 0 ? `
                        <ul>
                          ${c.lojas.map(l => `
                            <li>
                              <strong>${l.nome}</strong> - ${l.cidade || ''}/${l.estado || ''}
                              <span class="badge badge-${l.ativo ? 'success' : 'danger'} badge-sm">${l.ativo ? 'Ativa' : 'Inativa'}</span>
                            </li>
                          `).join('')}
                        </ul>
                      ` : '<p class="text-muted">Nenhuma loja cadastrada</p>'}
                    </div>
                    <div class="franchise-section">
                      <h4><i class="fas fa-user-tie"></i> Administradores</h4>
                      ${c.Users?.length > 0 ? `
                        <ul>
                          ${c.Users.map(u => `
                            <li>
                              <strong>${u.nome}</strong> - ${u.email}
                              <span class="badge badge-${u.ativo ? 'success' : 'danger'} badge-sm">${u.ativo ? 'Ativo' : 'Inativo'}</span>
                            </li>
                          `).join('')}
                        </ul>
                      ` : '<p class="text-muted">Nenhum administrador</p>'}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function viewFranchiseById(index) {
  const company = franquiasData[index];
  if (company) {
    viewFranchise(company);
  } else {
    showToast('Franquia não encontrada', 'error');
  }
}

function viewFranchise(company) {
  const totalLojas = company.lojas?.length || 0;
  const totalAdmins = company.Users?.length || 0;
  
  const content = `
    <div class="franchise-detail-view">
      <div class="franchise-summary">
        <div class="summary-stat">
          <i class="fas fa-store"></i>
          <span class="number">${totalLojas}</span>
          <span class="label">${totalLojas === 1 ? 'Loja' : 'Lojas'}</span>
        </div>
        <div class="summary-stat">
          <i class="fas fa-user-tie"></i>
          <span class="number">${totalAdmins}</span>
          <span class="label">${totalAdmins === 1 ? 'Admin' : 'Admins'}</span>
        </div>
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-building"></i> Dados da Franquia</h3>
        <div class="detail-grid">
          <p><strong>Nome:</strong> ${company.nome}</p>
          <p><strong>CNPJ:</strong> ${company.cnpj || '-'}</p>
          <p><strong>Telefone:</strong> ${company.telefone || '-'}</p>
          <p><strong>Email:</strong> ${company.email || '-'}</p>
        </div>
        <p><strong>Endereço:</strong> ${company.endereco || '-'}</p>
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-map-marker-alt"></i> Lojas da Franquia (${totalLojas})</h3>
        ${company.lojas?.length > 0 ? company.lojas.map(l => `
          <div class="store-card">
            <div class="store-header">
              <strong>${l.nome}</strong>
              <span class="badge badge-${l.ativo ? 'success' : 'danger'}">${l.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
            <div class="store-details">
              <p><i class="fas fa-barcode"></i> Código: ${l.codigo}</p>
              <p><i class="fas fa-map-marker-alt"></i> ${l.cidade || 'Cidade'}/${l.estado || 'UF'}</p>
              ${l.telefone ? `<p><i class="fas fa-phone"></i> ${l.telefone}</p>` : ''}
              ${l.email ? `<p><i class="fas fa-envelope"></i> ${l.email}</p>` : ''}
            </div>
          </div>
        `).join('') : '<p class="text-muted">Nenhuma loja cadastrada</p>'}
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-user-tie"></i> Administradores (${totalAdmins})</h3>
        ${company.Users?.length > 0 ? company.Users.map(u => `
          <div class="admin-card">
            <div class="admin-info">
              <strong>${u.nome}</strong>
              <span class="badge badge-${u.ativo ? 'success' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
            <p><i class="fas fa-envelope"></i> ${u.email}</p>
          </div>
        `).join('') : '<p class="text-muted">Nenhum administrador</p>'}
      </div>
    </div>
  `;
  
  openModal('Detalhes da Franquia: ' + company.nome, content);
}

function openCompanyModal(company = null) {
  const title = company ? 'Editar Franquia' : 'Cadastrar Nova Franquia';
  const isNew = !company;
  
  const content = `
    <form id="companyForm" onsubmit="saveCompany(event, ${company?.id || 'null'})">
      <div class="form-section">
        <h3><i class="fas fa-building"></i> Dados da Franquia</h3>
        
        <div class="form-group">
          <label>CNPJ</label>
          <div class="input-with-button">
            <input type="text" name="cnpj" id="cnpjInput" value="${company?.cnpj || ''}" placeholder="00.000.000/0001-00" onblur="buscarCNPJ()">
            <button type="button" class="btn btn-secondary" onclick="buscarCNPJ()">
              <i class="fas fa-search"></i> Buscar
            </button>
          </div>
          <small class="form-hint">Digite o CNPJ e clique em buscar para preencher automaticamente</small>
        </div>
        <div id="cnpjLoading" style="display:none; text-align:center; padding:10px;">
          <i class="fas fa-spinner fa-spin"></i> Buscando dados do CNPJ...
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Nome da Franquia *</label>
            <input type="text" name="nome" id="nomeInput" value="${company?.nome || ''}" required>
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input type="text" name="telefone" id="telefoneInput" value="${company?.telefone || ''}" placeholder="(11) 99999-9999">
          </div>
        </div>
        
        <div class="form-group">
          <label>Email da Franquia</label>
          <input type="email" name="email" id="emailInput" value="${company?.email || ''}">
        </div>
        
        <div class="form-group">
          <label>Endereço Completo</label>
          <textarea name="endereco" id="enderecoInput" rows="2">${company?.endereco || ''}</textarea>
        </div>
      </div>
      
      ${isNew ? `
        <div class="form-section">
          <h3><i class="fas fa-map-marker-alt"></i> Dados da Loja Principal</h3>
          
          <div class="form-group">
            <label>Nome da Loja</label>
            <input type="text" name="loja_nome" id="lojaNomeInput" placeholder="Se vazio, usará o nome da franquia">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Cidade</label>
              <input type="text" name="loja_cidade" id="lojaCidadeInput">
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select name="loja_estado" id="lojaEstadoInput">
                <option value="">Selecione</option>
                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-user-tie"></i> Administrador da Franquia</h3>
          <p class="form-hint">Este usuário terá acesso total à gestão da franquia</p>
          
          <div class="form-group">
            <label>Nome do Administrador *</label>
            <input type="text" name="admin_nome" id="adminNomeInput" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Email de Acesso *</label>
              <input type="email" name="admin_email" id="adminEmailInput" required placeholder="email@franquia.com">
            </div>
            <div class="form-group">
              <label>Senha de Acesso *</label>
              <input type="password" name="admin_senha" id="adminSenhaInput" required minlength="6" placeholder="Mínimo 6 caracteres">
            </div>
          </div>
        </div>
      ` : ''}
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isNew ? 'Cadastrar Franquia' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  `;
  
  openModal(title, content);
}

async function buscarCNPJ() {
  const cnpjInput = document.getElementById('cnpjInput');
  const cnpj = cnpjInput.value.replace(/\D/g, '');
  
  if (cnpj.length !== 14) {
    showToast('CNPJ deve ter 14 dígitos', 'error');
    return;
  }
  
  const loading = document.getElementById('cnpjLoading');
  loading.style.display = 'block';
  
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    
    if (!response.ok) {
      throw new Error('CNPJ não encontrado');
    }
    
    const data = await response.json();
    
    document.getElementById('nomeInput').value = data.razao_social || data.nome_fantasia || '';
    document.getElementById('telefoneInput').value = formatarTelefone(data.ddd_telefone_1) || '';
    document.getElementById('emailInput').value = data.email || '';
    
    const endereco = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro,
      data.municipio,
      data.uf,
      data.cep ? `CEP: ${formatarCEP(data.cep)}` : ''
    ].filter(Boolean).join(', ');
    
    document.getElementById('enderecoInput').value = endereco;
    
    cnpjInput.value = formatarCNPJ(cnpj);
    
    showToast('Dados do CNPJ preenchidos!', 'success');
  } catch (error) {
    showToast(error.message || 'Erro ao buscar CNPJ', 'error');
  } finally {
    loading.style.display = 'none';
  }
}

function formatarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatarTelefone(tel) {
  if (!tel) return '';
  tel = tel.replace(/\D/g, '');
  if (tel.length === 11) {
    return tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (tel.length === 10) {
    return tel.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return tel;
}

function formatarCEP(cep) {
  if (!cep) return '';
  cep = cep.toString().replace(/\D/g, '');
  return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

function editCompany(company) {
  openCompanyModal(company);
}

async function saveCompany(event, id) {
  event.preventDefault();
  
  const form = event.target;
  const data = {
    nome: form.nome.value,
    cnpj: form.cnpj.value,
    telefone: form.telefone.value,
    email: form.email.value,
    endereco: form.endereco.value
  };
  
  if (!id) {
    data.loja_nome = form.loja_nome?.value || '';
    data.loja_cidade = form.loja_cidade?.value || '';
    data.loja_estado = form.loja_estado?.value || '';
    data.admin_nome = form.admin_nome?.value || '';
    data.admin_email = form.admin_email?.value || '';
    data.admin_senha = form.admin_senha?.value || '';
  }
  
  try {
    if (id) {
      await api(`/companies/${id}`, { method: 'PUT', body: data });
      showToast('Franquia atualizada com sucesso!', 'success');
    } else {
      await api('/companies', { method: 'POST', body: data });
      showToast('Franquia cadastrada com sucesso! O administrador pode fazer login com o email e senha informados.', 'success');
    }
    closeModal();
    await renderCompanies();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteCompany(id) {
  if (!confirm('Tem certeza que deseja excluir esta franquia?')) return;
  
  try {
    await api(`/companies/${id}`, { method: 'DELETE' });
    showToast('Franquia excluída com sucesso!', 'success');
    await renderCompanies();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderStores() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-map-marker-alt"></i>
    <h3>Lojas</h3>
    <p>Gerencie as lojas do sistema</p>
  </div>`;
}

let carrinhoSolicitacao = [];

async function carregarEstoqueTMImports() {
  try {
    const estoque = await api('/inventory/central-disponivel');
    const container = document.getElementById('estoqueTMImports');
    
    if (!estoque || estoque.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-box-open"></i>
          <h3>Nenhum produto disponível</h3>
          <p>O estoque central da TM Imports está vazio no momento</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="filters" style="margin-bottom: 15px;">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" id="searchEstoqueTM" placeholder="Buscar produtos..." onkeyup="filtrarEstoqueTM()">
        </div>
      </div>
      <div class="table-container">
        <table id="estoqueTMTable">
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Disponível</th>
              <th>Preço Custo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${estoque.map(item => `
              <tr data-id="${item.produto_id}" data-nome="${(item.produto?.nome || '').toLowerCase()}">
                <td>${item.produto?.codigo || '-'}</td>
                <td>${item.produto?.nome || '-'}</td>
                <td><span class="badge badge-${item.produto?.tipo === 'MOTO' ? 'primary' : item.produto?.tipo === 'SERVICO' ? 'success' : 'secondary'}">${item.produto?.tipo || '-'}</span></td>
                <td><strong style="color: var(--success);">${item.quantidade}</strong></td>
                <td>${formatCurrency(item.produto?.preco_custo)}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="adicionarAoCarrinho(${item.produto_id}, '${(item.produto?.nome || '').replace(/'/g, "\\'")}', ${item.quantidade}, ${item.produto?.preco_custo || 0})">
                    <i class="fas fa-cart-plus"></i> Solicitar
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    const container = document.getElementById('estoqueTMImports');
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar estoque</p></div>`;
    console.error('Erro ao carregar estoque TM Imports:', error);
  }
}

function filtrarEstoqueTM() {
  const search = document.getElementById('searchEstoqueTM').value.toLowerCase();
  const rows = document.querySelectorAll('#estoqueTMTable tbody tr');
  
  rows.forEach(row => {
    const nome = row.dataset.nome || '';
    row.style.display = nome.includes(search) ? '' : 'none';
  });
}

async function carregarMinhasComissoes() {
  const container = document.getElementById('minhasComissoes');
  if (!container) return;
  
  try {
    const data = await api('/vendors/me/comissoes');
    
    if (!data || data.error) {
      container.innerHTML = '';
      return;
    }
    
    const tipoLabel = data.tipo_loja === 'MATRIZ' ? 'Atacado (TM Imports)' : 'Franquia (Tecle Motos)';
    
    container.innerHTML = `
      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-coins"></i> Minhas Comissoes - ${data.vendedor_nome}</h2>
          <span class="badge badge-primary">${tipoLabel} - ${data.taxa_comissao}%</span>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
              <div class="stat-value">${data.mes_atual.qtd_vendas}</div>
              <div class="stat-label">Vendas Este Mes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
              <div class="stat-value">${formatCurrency(data.mes_atual.total_vendas)}</div>
              <div class="stat-label">Total Vendido (Mes)</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div>
              <div class="stat-value">${formatCurrency(data.mes_atual.comissao)}</div>
              <div class="stat-label">Comissao do Mes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon yellow"><i class="fas fa-chart-line"></i></div>
              <div class="stat-value">${formatCurrency(data.ano_atual.comissao)}</div>
              <div class="stat-label">Comissao Acumulada (Ano)</div>
            </div>
          </div>
          <div style="margin-top: 15px; padding: 15px; background: rgba(0,255,136,0.1); border-radius: 8px;">
            <p style="margin: 0; color: var(--text-muted);">
              <i class="fas fa-info-circle"></i> 
              Sua taxa de comissao e de <strong style="color: var(--success);">${data.taxa_comissao}%</strong> sobre o valor das vendas concluidas.
              No ano, voce fez <strong>${data.ano_atual.qtd_vendas}</strong> vendas totalizando <strong>${formatCurrency(data.ano_atual.total_vendas)}</strong>.
            </p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '';
    console.log('Usuario nao e vendedor ou erro ao carregar comissoes:', error.message);
  }
}

function adicionarAoCarrinho(produtoId, produtoNome, disponivelMax, precoCusto) {
  const qtdStr = prompt(`Quantas unidades de "${produtoNome}" deseja solicitar?\n(Disponível: ${disponivelMax})`, '1');
  if (!qtdStr) return;
  
  const qtd = parseInt(qtdStr);
  if (isNaN(qtd) || qtd <= 0) {
    showToast('Quantidade inválida', 'error');
    return;
  }
  
  if (qtd > disponivelMax) {
    showToast(`Quantidade máxima disponível: ${disponivelMax}`, 'error');
    return;
  }
  
  const existente = carrinhoSolicitacao.find(item => item.produto_id === produtoId);
  if (existente) {
    existente.quantidade += qtd;
    if (existente.quantidade > disponivelMax) {
      existente.quantidade = disponivelMax;
    }
  } else {
    carrinhoSolicitacao.push({
      produto_id: produtoId,
      nome: produtoNome,
      quantidade: qtd,
      preco_unitario: precoCusto,
      disponivelMax
    });
  }
  
  showToast(`${qtd}x ${produtoNome} adicionado à solicitação!`, 'success');
}

function criarSolicitacaoCompra() {
  if (carrinhoSolicitacao.length === 0) {
    showToast('Adicione produtos ao carrinho primeiro clicando em "Solicitar" em cada produto', 'warning');
    return;
  }
  
  const total = carrinhoSolicitacao.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);
  
  const content = `
    <div class="form-group">
      <h3>Itens da Solicitação</h3>
      <div class="table-container table-sm">
        <table>
          <thead>
            <tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th><th>Ação</th></tr>
          </thead>
          <tbody>
            ${carrinhoSolicitacao.map((item, idx) => `
              <tr>
                <td>${item.nome}</td>
                <td>${item.quantidade}</td>
                <td>${formatCurrency(item.preco_unitario)}</td>
                <td>${formatCurrency(item.preco_unitario * item.quantidade)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removerDoCarrinho(${idx})"><i class="fas fa-trash"></i></button></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold;">
              <td colspan="3">TOTAL</td>
              <td colspan="2">${formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <form onsubmit="enviarSolicitacaoCompra(event)">
      <div class="form-group">
        <label>Observações</label>
        <textarea name="observacoes" class="form-control" rows="3" placeholder="Observações para a matriz (opcional)"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="limparCarrinho()">Limpar Carrinho</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Enviar Solicitação</button>
      </div>
    </form>
  `;
  
  openModal('Nova Solicitação de Compra', content);
}

function removerDoCarrinho(idx) {
  carrinhoSolicitacao.splice(idx, 1);
  criarSolicitacaoCompra();
}

function limparCarrinho() {
  carrinhoSolicitacao = [];
  closeModal();
  showToast('Carrinho limpo', 'info');
}

async function enviarSolicitacaoCompra(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const observacoes = formData.get('observacoes');
  
  try {
    await api('/purchase-requests', {
      method: 'POST',
      body: {
        itens: carrinhoSolicitacao.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        })),
        observacoes
      }
    });
    
    carrinhoSolicitacao = [];
    closeModal();
    showToast('Solicitação de compra enviada com sucesso! Aguarde a aprovação da matriz.', 'success');
    await renderDashboard();
  } catch (error) {
    showToast(error.message || 'Erro ao enviar solicitação', 'error');
  }
}

async function renderPurchaseRequests() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-truck"></i>
    <h3>Solicitações de Compra</h3>
    <p>Gerencie as solicitações de produtos</p>
  </div>`;
}

async function renderAuditLogs() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-history"></i>
    <h3>Logs de Auditoria</h3>
    <p>Visualize o histórico de ações do sistema</p>
  </div>`;
}

async function renderManual() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="manual-container">
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-book"></i> Manual do Sistema TM Imports / Tecle Motos</h2>
        </div>
        <div class="card-body manual-content">
          <div class="manual-section">
            <h3>1. Acesso ao Sistema</h3>
            <p>Para acessar o sistema, utilize as credenciais fornecidas pelo administrador:</p>
            <ul>
              <li><strong>Email:</strong> Seu email cadastrado</li>
              <li><strong>Senha:</strong> Sua senha de acesso</li>
            </ul>
            <p class="manual-note"><i class="fas fa-info-circle"></i> Altere sua senha no primeiro acesso para maior segurança.</p>
          </div>

          <div class="manual-section">
            <h3>2. Perfis de Usuário</h3>
            <div class="manual-subsection">
              <h4><i class="fas fa-crown"></i> Admin Global (TM Imports)</h4>
              <ul>
                <li>Acesso total ao sistema</li>
                <li>Dashboard global com métricas de todas as franquias</li>
                <li>Gerencia empresas, lojas e usuários</li>
                <li>Controle do estoque central</li>
                <li>Aprova solicitações de compra das franquias</li>
                <li>Módulo financeiro completo</li>
                <li>Logs de auditoria</li>
              </ul>
            </div>
            <div class="manual-subsection">
              <h4><i class="fas fa-store"></i> Gestor de Franquia</h4>
              <ul>
                <li>Dashboard da loja</li>
                <li>Cadastro de produtos/serviços</li>
                <li>Gestão de estoque da loja</li>
                <li>Solicita produtos da matriz</li>
                <li>Vendas e ordens de serviço</li>
                <li>Financeiro da loja</li>
                <li>Gerencia usuários da loja</li>
              </ul>
            </div>
            <div class="manual-subsection">
              <h4><i class="fas fa-user"></i> Operacional</h4>
              <ul>
                <li>Dashboard simplificado</li>
                <li>Cadastra vendas (status pendente)</li>
                <li>Cria ordens de serviço</li>
                <li>Cadastra clientes</li>
                <li>Consulta estoque (somente leitura)</li>
              </ul>
            </div>
          </div>

          <div class="manual-section">
            <h3>3. Dashboard</h3>
            <p>O dashboard exibe todas as informações importantes em tempo real:</p>
            <ul>
              <li><strong>Vendas do Mês:</strong> Total de vendas concluídas no mês atual</li>
              <li><strong>Serviços do Mês:</strong> Total de ordens de serviço concluídas</li>
              <li><strong>A Receber:</strong> Total de contas a receber pendentes</li>
              <li><strong>A Pagar:</strong> Total de contas a pagar pendentes</li>
              <li><strong>Últimas Vendas:</strong> Lista das vendas mais recentes</li>
              <li><strong>Últimas OS:</strong> Lista das ordens de serviço mais recentes</li>
              <li><strong>Movimentações:</strong> Histórico de movimentações de estoque</li>
            </ul>
          </div>

          <div class="manual-section">
            <h3>4. Fluxo de Vendas</h3>
            <ol>
              <li><strong>Criar Venda:</strong> Acesse "Vendas" e clique em "Nova Venda"</li>
              <li><strong>Selecionar Cliente:</strong> Escolha um cliente existente ou cadastre um novo</li>
              <li><strong>Adicionar Produtos:</strong> Selecione os produtos e quantidades</li>
              <li><strong>Forma de Pagamento:</strong> Defina a forma e quantidade de parcelas</li>
              <li><strong>Salvar:</strong> A venda ficará com status PENDENTE</li>
              <li><strong>Aprovação:</strong> O gestor/admin aprova ou edita a venda</li>
              <li><strong>Conclusão:</strong> Ao concluir, o estoque é baixado e a conta a receber é gerada</li>
            </ol>
          </div>

          <div class="manual-section">
            <h3>5. Ordens de Serviço (OS)</h3>
            <ol>
              <li>Acesse "Ordens de Serviço" e clique em "Nova OS"</li>
              <li>Preencha os dados do cliente e veículo</li>
              <li>Descreva o problema relatado</li>
              <li>Adicione peças e serviços necessários</li>
              <li>O gestor aprova e conclui a OS</li>
            </ol>
          </div>

          <div class="manual-section">
            <h3>6. Solicitações de Compra (Franquias)</h3>
            <p>Franquias podem solicitar produtos da matriz:</p>
            <ol>
              <li>Acesse "Solicitar Produtos"</li>
              <li>Selecione os produtos e quantidades desejadas</li>
              <li>Envie a solicitação (status PENDENTE)</li>
              <li>A matriz (Admin Global) aprova ou rejeita</li>
              <li>Após aprovação, a matriz envia os produtos</li>
              <li>O gestor da franquia confirma o recebimento</li>
            </ol>
          </div>

          <div class="manual-section">
            <h3>7. Conciliação Bancária</h3>
            <ol>
              <li>Cadastre as contas bancárias da empresa/loja</li>
              <li>Importe extratos (OFX, CSV, Excel)</li>
              <li>O sistema identifica transações duplicadas</li>
              <li>Conciliação automática por valor</li>
              <li>Conciliação manual para casos específicos</li>
            </ol>
          </div>

          <div class="manual-section">
            <h3>8. Dicas Importantes</h3>
            <ul>
              <li><i class="fas fa-check-circle text-success"></i> Sempre salve suas alterações antes de sair da página</li>
              <li><i class="fas fa-check-circle text-success"></i> Use o menu lateral para navegar entre as funcionalidades</li>
              <li><i class="fas fa-check-circle text-success"></i> Consulte os logs de auditoria para rastrear alterações</li>
              <li><i class="fas fa-check-circle text-success"></i> Mantenha o estoque atualizado para evitar problemas nas vendas</li>
            </ul>
          </div>

          <div class="manual-section">
            <h3>9. Suporte</h3>
            <p>Em caso de dúvidas ou problemas, entre em contato com o suporte:</p>
            <p><strong>Email:</strong> suporte@tmimports.com</p>
            <p><strong>Telefone:</strong> (11) 1234-5678</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderInvoices() {
  const content = document.getElementById('content');
  const isGestor = ['ADMIN_GLOBAL', 'GESTOR_FRANQUIA'].includes(currentUser.perfil);
  
  try {
    const [invoices, stats] = await Promise.all([
      api('/invoices'),
      api('/invoices/dashboard/stats')
    ]);
    
    content.innerHTML = `
      <div class="page-actions">
        ${isGestor ? `
          <button class="btn btn-primary" onclick="openNewInvoiceModal()">
            <i class="fas fa-plus"></i> Nova Nota Fiscal
          </button>
          <button class="btn btn-secondary" onclick="openFiscalConfigModal()">
            <i class="fas fa-cog"></i> Configurar Dados Fiscais
          </button>
        ` : ''}
      </div>
      
      <div class="stats-grid stats-grid-4">
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
          <div class="stat-value">${stats.totalEmitidas || 0}</div>
          <div class="stat-label">Notas Autorizadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
          <div class="stat-value">${stats.totalCanceladas || 0}</div>
          <div class="stat-label">Canceladas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange"><i class="fas fa-calendar"></i></div>
          <div class="stat-value">${stats.totalMes || 0}</div>
          <div class="stat-label">Emitidas no Mes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
          <div class="stat-value">${formatCurrency(stats.valorMes || 0)}</div>
          <div class="stat-label">Valor no Mes</div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-file-invoice"></i> Notas Fiscais</h2>
          <div class="filters">
            <select id="filterStatus" onchange="filterInvoices()">
              <option value="">Todos os Status</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="PROCESSANDO">Processando</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="REJEITADA">Rejeitada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
            <select id="filterTipo" onchange="filterInvoices()">
              <option value="">Todos os Tipos</option>
              <option value="NFE">NF-e</option>
              <option value="NFCE">NFC-e</option>
              <option value="NFSE">NFS-e</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody id="invoicesTableBody">
                ${renderInvoicesTable(invoices)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    window.allInvoices = invoices;
  } catch (error) {
    console.error('Erro ao carregar notas fiscais:', error);
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Erro ao carregar notas fiscais</h3>
      <p>${error.message}</p>
    </div>`;
  }
}

function renderInvoicesTable(invoices) {
  if (!invoices || invoices.length === 0) {
    return '<tr><td colspan="7" class="text-center">Nenhuma nota fiscal encontrada</td></tr>';
  }
  
  return invoices.map(inv => {
    const statusColors = {
      'RASCUNHO': 'secondary',
      'PROCESSANDO': 'warning',
      'AUTORIZADA': 'success',
      'REJEITADA': 'danger',
      'CANCELADA': 'danger'
    };
    
    const tipoLabels = {
      'NFE': 'NF-e',
      'NFCE': 'NFC-e',
      'NFSE': 'NFS-e'
    };
    
    return `
      <tr>
        <td>${inv.numero || '-'}</td>
        <td><span class="badge badge-primary">${tipoLabels[inv.tipo] || inv.tipo}</span></td>
        <td>${inv.cliente?.nome || inv.destinatario_nome || 'Consumidor Final'}</td>
        <td>${formatCurrency(inv.valor_total)}</td>
        <td>${inv.data_emissao ? formatDate(inv.data_emissao) : formatDate(inv.createdAt)}</td>
        <td><span class="badge badge-${statusColors[inv.status] || 'secondary'}">${inv.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm btn-secondary" onclick="viewInvoice(${inv.id})" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          ${inv.status === 'RASCUNHO' ? `
            <button class="btn btn-sm btn-success" onclick="emitInvoice(${inv.id})" title="Emitir">
              <i class="fas fa-paper-plane"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteInvoice(${inv.id})" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
          ${inv.status === 'AUTORIZADA' ? `
            <button class="btn btn-sm btn-warning" onclick="openCancelModal(${inv.id})" title="Cancelar">
              <i class="fas fa-ban"></i>
            </button>
            <button class="btn btn-sm btn-info" onclick="openCartaCorrecaoModal(${inv.id})" title="Carta de Correcao">
              <i class="fas fa-edit"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function filterInvoices() {
  const status = document.getElementById('filterStatus').value;
  const tipo = document.getElementById('filterTipo').value;
  
  let filtered = window.allInvoices || [];
  
  if (status) {
    filtered = filtered.filter(inv => inv.status === status);
  }
  if (tipo) {
    filtered = filtered.filter(inv => inv.tipo === tipo);
  }
  
  document.getElementById('invoicesTableBody').innerHTML = renderInvoicesTable(filtered);
}

async function openNewInvoiceModal() {
  try {
    const [customers, products] = await Promise.all([
      api('/customers'),
      api('/products')
    ]);
    
    const modalContent = `
      <form id="newInvoiceForm" onsubmit="saveNewInvoice(event)">
        <div class="form-row">
          <div class="form-group">
            <label>Tipo de Nota *</label>
            <select name="tipo" required>
              <option value="NFE">NF-e (Nota Fiscal Eletronica)</option>
              <option value="NFCE">NFC-e (Nota Fiscal Consumidor)</option>
              <option value="NFSE">NFS-e (Nota Fiscal de Servico)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Natureza da Operacao</label>
            <input type="text" name="natureza_operacao" value="Venda de Mercadoria">
          </div>
        </div>
        
        <div class="form-group">
          <label>Cliente</label>
          <select name="cliente_id" id="invoiceClienteSelect" onchange="fillClienteData()">
            <option value="">Consumidor Final</option>
            ${customers.map(c => `<option value="${c.id}" data-cpf="${c.cpf_cnpj || ''}" data-email="${c.email || ''}" data-endereco="${c.endereco || ''}" data-cidade="${c.cidade || ''}" data-uf="${c.estado || ''}" data-cep="${c.cep || ''}" data-tel="${c.telefone || ''}">${c.nome}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Nome/Razao Social</label>
            <input type="text" name="destinatario_nome" id="destNome">
          </div>
          <div class="form-group">
            <label>CPF/CNPJ</label>
            <input type="text" name="destinatario_cpf_cnpj" id="destCpf">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="destinatario_email" id="destEmail">
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input type="text" name="destinatario_telefone" id="destTel">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Endereco</label>
            <input type="text" name="destinatario_endereco" id="destEndereco">
          </div>
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" name="destinatario_cidade" id="destCidade">
          </div>
          <div class="form-group" style="width: 80px;">
            <label>UF</label>
            <input type="text" name="destinatario_uf" id="destUf" maxlength="2">
          </div>
          <div class="form-group">
            <label>CEP</label>
            <input type="text" name="destinatario_cep" id="destCep">
          </div>
        </div>
        
        <h4>Itens da Nota</h4>
        <div id="invoiceItems">
          <div class="invoice-item-row" data-index="0">
            <select name="produto_0" class="produto-select" onchange="updateItemPrice(0)">
              <option value="">Selecione um produto</option>
              ${products.filter(p => p.tipo !== 'SERVICO').map(p => `<option value="${p.id}" data-preco="${p.preco_venda}" data-codigo="${p.codigo}" data-nome="${p.nome}">${p.codigo} - ${p.nome} (${formatCurrency(p.preco_venda)})</option>`).join('')}
            </select>
            <input type="number" name="quantidade_0" placeholder="Qtd" min="1" value="1" onchange="updateItemTotal(0)">
            <input type="number" name="preco_0" placeholder="Preco" step="0.01" onchange="updateItemTotal(0)">
            <input type="number" name="total_0" placeholder="Total" step="0.01" readonly>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeInvoiceItem(0)"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addInvoiceItem()">
          <i class="fas fa-plus"></i> Adicionar Item
        </button>
        
        <div class="form-row" style="margin-top: 20px;">
          <div class="form-group">
            <label>Valor Produtos</label>
            <input type="number" name="valor_produtos" id="valorProdutos" step="0.01" readonly>
          </div>
          <div class="form-group">
            <label>Desconto</label>
            <input type="number" name="valor_desconto" step="0.01" value="0" onchange="calcInvoiceTotal()">
          </div>
          <div class="form-group">
            <label>Total da Nota</label>
            <input type="number" name="valor_total" id="valorTotal" step="0.01" readonly>
          </div>
        </div>
        
        <div class="form-group">
          <label>Forma de Pagamento</label>
          <select name="forma_pagamento">
            <option value="DINHEIRO">Dinheiro</option>
            <option value="CARTAO_CREDITO">Cartao de Credito</option>
            <option value="CARTAO_DEBITO">Cartao de Debito</option>
            <option value="PIX">PIX</option>
            <option value="BOLETO">Boleto</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Informacoes Adicionais</label>
          <textarea name="informacoes_adicionais" rows="2"></textarea>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Rascunho</button>
        </div>
      </form>
    `;
    
    openModal('Nova Nota Fiscal', modalContent);
    window.invoiceProducts = products;
    window.invoiceItemIndex = 1;
  } catch (error) {
    showToast('Erro ao carregar dados: ' + error.message, 'error');
  }
}

function fillClienteData() {
  const select = document.getElementById('invoiceClienteSelect');
  const option = select.options[select.selectedIndex];
  
  document.getElementById('destNome').value = option.text !== 'Consumidor Final' ? option.text : '';
  document.getElementById('destCpf').value = option.dataset.cpf || '';
  document.getElementById('destEmail').value = option.dataset.email || '';
  document.getElementById('destEndereco').value = option.dataset.endereco || '';
  document.getElementById('destCidade').value = option.dataset.cidade || '';
  document.getElementById('destUf').value = option.dataset.uf || '';
  document.getElementById('destCep').value = option.dataset.cep || '';
  document.getElementById('destTel').value = option.dataset.tel || '';
}

function addInvoiceItem() {
  const idx = window.invoiceItemIndex++;
  const products = window.invoiceProducts || [];
  
  const html = `
    <div class="invoice-item-row" data-index="${idx}">
      <select name="produto_${idx}" class="produto-select" onchange="updateItemPrice(${idx})">
        <option value="">Selecione um produto</option>
        ${products.filter(p => p.tipo !== 'SERVICO').map(p => `<option value="${p.id}" data-preco="${p.preco_venda}" data-codigo="${p.codigo}" data-nome="${p.nome}">${p.codigo} - ${p.nome} (${formatCurrency(p.preco_venda)})</option>`).join('')}
      </select>
      <input type="number" name="quantidade_${idx}" placeholder="Qtd" min="1" value="1" onchange="updateItemTotal(${idx})">
      <input type="number" name="preco_${idx}" placeholder="Preco" step="0.01" onchange="updateItemTotal(${idx})">
      <input type="number" name="total_${idx}" placeholder="Total" step="0.01" readonly>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeInvoiceItem(${idx})"><i class="fas fa-times"></i></button>
    </div>
  `;
  
  document.getElementById('invoiceItems').insertAdjacentHTML('beforeend', html);
}

function removeInvoiceItem(idx) {
  const row = document.querySelector(`.invoice-item-row[data-index="${idx}"]`);
  if (row) {
    row.remove();
    calcInvoiceTotal();
  }
}

function updateItemPrice(idx) {
  const select = document.querySelector(`select[name="produto_${idx}"]`);
  const option = select.options[select.selectedIndex];
  const preco = parseFloat(option.dataset.preco) || 0;
  
  document.querySelector(`input[name="preco_${idx}"]`).value = preco.toFixed(2);
  updateItemTotal(idx);
}

function updateItemTotal(idx) {
  const qtd = parseFloat(document.querySelector(`input[name="quantidade_${idx}"]`).value) || 0;
  const preco = parseFloat(document.querySelector(`input[name="preco_${idx}"]`).value) || 0;
  const total = qtd * preco;
  
  document.querySelector(`input[name="total_${idx}"]`).value = total.toFixed(2);
  calcInvoiceTotal();
}

function calcInvoiceTotal() {
  const rows = document.querySelectorAll('.invoice-item-row');
  let subtotal = 0;
  
  rows.forEach(row => {
    const idx = row.dataset.index;
    const total = parseFloat(document.querySelector(`input[name="total_${idx}"]`).value) || 0;
    subtotal += total;
  });
  
  const desconto = parseFloat(document.querySelector('input[name="valor_desconto"]').value) || 0;
  
  document.getElementById('valorProdutos').value = subtotal.toFixed(2);
  document.getElementById('valorTotal').value = (subtotal - desconto).toFixed(2);
}

async function saveNewInvoice(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  const itens = [];
  const rows = document.querySelectorAll('.invoice-item-row');
  
  rows.forEach(row => {
    const idx = row.dataset.index;
    const produtoId = formData.get(`produto_${idx}`);
    if (produtoId) {
      const select = document.querySelector(`select[name="produto_${idx}"]`);
      const option = select.options[select.selectedIndex];
      
      itens.push({
        produto_id: parseInt(produtoId),
        codigo: option.dataset.codigo,
        descricao: option.dataset.nome,
        quantidade: parseFloat(formData.get(`quantidade_${idx}`)) || 1,
        valor_unitario: parseFloat(formData.get(`preco_${idx}`)) || 0,
        valor_total: parseFloat(formData.get(`total_${idx}`)) || 0,
        ncm: '00000000',
        cfop: '5102',
        unidade: 'UN',
        cst_icms: '102',
        cst_pis: '49',
        cst_cofins: '49',
        origem: '0'
      });
    }
  });
  
  const data = {
    tipo: formData.get('tipo'),
    natureza_operacao: formData.get('natureza_operacao'),
    cliente_id: formData.get('cliente_id') || null,
    destinatario_nome: formData.get('destinatario_nome'),
    destinatario_cpf_cnpj: formData.get('destinatario_cpf_cnpj'),
    destinatario_email: formData.get('destinatario_email'),
    destinatario_telefone: formData.get('destinatario_telefone'),
    destinatario_endereco: formData.get('destinatario_endereco'),
    destinatario_cidade: formData.get('destinatario_cidade'),
    destinatario_uf: formData.get('destinatario_uf'),
    destinatario_cep: formData.get('destinatario_cep'),
    valor_produtos: parseFloat(formData.get('valor_produtos')) || 0,
    valor_desconto: parseFloat(formData.get('valor_desconto')) || 0,
    valor_total: parseFloat(formData.get('valor_total')) || 0,
    forma_pagamento: formData.get('forma_pagamento'),
    informacoes_adicionais: formData.get('informacoes_adicionais'),
    itens
  };
  
  try {
    await api('/invoices', { method: 'POST', body: data });
    showToast('Nota fiscal criada com sucesso!', 'success');
    closeModal();
    await renderInvoices();
  } catch (error) {
    showToast('Erro ao criar nota: ' + error.message, 'error');
  }
}

async function viewInvoice(id) {
  try {
    const invoice = await api(`/invoices/${id}`);
    
    const statusColors = {
      'RASCUNHO': 'secondary',
      'PROCESSANDO': 'warning',
      'AUTORIZADA': 'success',
      'REJEITADA': 'danger',
      'CANCELADA': 'danger'
    };
    
    const modalContent = `
      <div class="invoice-details">
        <div class="invoice-header-info">
          <div class="invoice-number">
            <h3>${invoice.tipo} ${invoice.numero}/${invoice.serie}</h3>
            <span class="badge badge-${statusColors[invoice.status]}">${invoice.status}</span>
          </div>
          <div class="invoice-dates">
            <p><strong>Emissao:</strong> ${invoice.data_emissao ? formatDate(invoice.data_emissao) : 'Pendente'}</p>
            ${invoice.chave_acesso ? `<p><strong>Chave:</strong> <small>${invoice.chave_acesso}</small></p>` : ''}
            ${invoice.protocolo ? `<p><strong>Protocolo:</strong> ${invoice.protocolo}</p>` : ''}
          </div>
        </div>
        
        <div class="invoice-section">
          <h4>Destinatario</h4>
          <p><strong>Nome:</strong> ${invoice.destinatario_nome || 'Consumidor Final'}</p>
          <p><strong>CPF/CNPJ:</strong> ${invoice.destinatario_cpf_cnpj || '-'}</p>
          <p><strong>Email:</strong> ${invoice.destinatario_email || '-'}</p>
          <p><strong>Endereco:</strong> ${invoice.destinatario_endereco || '-'}, ${invoice.destinatario_cidade || ''} - ${invoice.destinatario_uf || ''}</p>
        </div>
        
        <div class="invoice-section">
          <h4>Itens</h4>
          <table class="table-sm">
            <thead>
              <tr><th>Codigo</th><th>Descricao</th><th>Qtd</th><th>Valor Unit</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(invoice.itens || []).map(item => `
                <tr>
                  <td>${item.codigo || '-'}</td>
                  <td>${item.descricao || item.produto?.nome || '-'}</td>
                  <td>${item.quantidade}</td>
                  <td>${formatCurrency(item.valor_unitario)}</td>
                  <td>${formatCurrency(item.valor_total)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">Nenhum item</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <div class="invoice-totals">
          <p><strong>Subtotal:</strong> ${formatCurrency(invoice.valor_produtos)}</p>
          <p><strong>Desconto:</strong> ${formatCurrency(invoice.valor_desconto)}</p>
          <p class="total"><strong>Total:</strong> ${formatCurrency(invoice.valor_total)}</p>
        </div>
        
        ${(invoice.eventos || []).length > 0 ? `
          <div class="invoice-section">
            <h4>Eventos</h4>
            <ul class="event-list">
              ${invoice.eventos.map(ev => `
                <li>
                  <span class="badge badge-${ev.tipo === 'EMISSAO' ? 'success' : ev.tipo === 'CANCELAMENTO' ? 'danger' : 'info'}">${ev.tipo}</span>
                  ${ev.descricao} - ${formatDate(ev.data_evento)}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
          ${invoice.status === 'RASCUNHO' ? `<button class="btn btn-success" onclick="closeModal(); emitInvoice(${id})">Emitir Nota</button>` : ''}
        </div>
      </div>
    `;
    
    openModal(`Nota Fiscal ${invoice.numero}`, modalContent);
  } catch (error) {
    showToast('Erro ao carregar nota: ' + error.message, 'error');
  }
}

async function emitInvoice(id) {
  if (!confirm('Deseja emitir esta nota fiscal? Apos a emissao, os dados nao poderao ser alterados.')) {
    return;
  }
  
  try {
    const result = await api(`/invoices/${id}/emitir`, { method: 'POST' });
    showToast(result.message, 'success');
    await renderInvoices();
  } catch (error) {
    showToast('Erro ao emitir nota: ' + error.message, 'error');
  }
}

async function deleteInvoice(id) {
  if (!confirm('Deseja excluir este rascunho de nota fiscal?')) {
    return;
  }
  
  try {
    await api(`/invoices/${id}`, { method: 'DELETE' });
    showToast('Nota fiscal excluida!', 'success');
    await renderInvoices();
  } catch (error) {
    showToast('Erro ao excluir: ' + error.message, 'error');
  }
}

function openCancelModal(id) {
  const modalContent = `
    <form onsubmit="cancelInvoice(event, ${id})">
      <div class="form-group">
        <label>Motivo do Cancelamento *</label>
        <textarea name="motivo" required minlength="15" rows="3" placeholder="Descreva o motivo do cancelamento (minimo 15 caracteres)"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Voltar</button>
        <button type="submit" class="btn btn-danger">Cancelar Nota</button>
      </div>
    </form>
  `;
  
  openModal('Cancelar Nota Fiscal', modalContent);
}

async function cancelInvoice(e, id) {
  e.preventDefault();
  const motivo = e.target.motivo.value;
  
  try {
    await api(`/invoices/${id}/cancelar`, { method: 'POST', body: { motivo } });
    showToast('Nota fiscal cancelada!', 'success');
    closeModal();
    await renderInvoices();
  } catch (error) {
    showToast('Erro ao cancelar: ' + error.message, 'error');
  }
}

function openCartaCorrecaoModal(id) {
  const modalContent = `
    <form onsubmit="sendCartaCorrecao(event, ${id})">
      <div class="form-group">
        <label>Correcao *</label>
        <textarea name="correcao" required minlength="15" rows="3" placeholder="Descreva a correcao a ser feita (minimo 15 caracteres)"></textarea>
        <small>A carta de correcao nao permite alterar valores, apenas informacoes complementares.</small>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Enviar Carta de Correcao</button>
      </div>
    </form>
  `;
  
  openModal('Carta de Correcao', modalContent);
}

async function sendCartaCorrecao(e, id) {
  e.preventDefault();
  const correcao = e.target.correcao.value;
  
  try {
    const result = await api(`/invoices/${id}/carta-correcao`, { method: 'POST', body: { correcao } });
    showToast(`Carta de correcao #${result.sequencia} registrada!`, 'success');
    closeModal();
    await renderInvoices();
  } catch (error) {
    showToast('Erro: ' + error.message, 'error');
  }
}

async function openFiscalConfigModal() {
  try {
    const fiscalData = await api('/invoices/fiscal-data');
    
    const modalContent = `
      <form onsubmit="saveFiscalConfig(event)">
        <h4>Dados da Empresa</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Razao Social *</label>
            <input type="text" name="razao_social" value="${fiscalData.razao_social || ''}" required>
          </div>
          <div class="form-group">
            <label>Nome Fantasia</label>
            <input type="text" name="nome_fantasia" value="${fiscalData.nome_fantasia || ''}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>CNPJ *</label>
            <input type="text" name="cnpj" value="${fiscalData.cnpj || ''}" required>
          </div>
          <div class="form-group">
            <label>Inscricao Estadual</label>
            <input type="text" name="inscricao_estadual" value="${fiscalData.inscricao_estadual || ''}">
          </div>
          <div class="form-group">
            <label>Inscricao Municipal</label>
            <input type="text" name="inscricao_municipal" value="${fiscalData.inscricao_municipal || ''}">
          </div>
        </div>
        
        <h4>Endereco</h4>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Logradouro</label>
            <input type="text" name="endereco" value="${fiscalData.endereco || ''}">
          </div>
          <div class="form-group">
            <label>Numero</label>
            <input type="text" name="numero" value="${fiscalData.numero || ''}">
          </div>
          <div class="form-group">
            <label>Bairro</label>
            <input type="text" name="bairro" value="${fiscalData.bairro || ''}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" name="cidade" value="${fiscalData.cidade || ''}">
          </div>
          <div class="form-group" style="width: 80px;">
            <label>UF</label>
            <input type="text" name="uf" value="${fiscalData.uf || ''}" maxlength="2">
          </div>
          <div class="form-group">
            <label>CEP</label>
            <input type="text" name="cep" value="${fiscalData.cep || ''}">
          </div>
          <div class="form-group">
            <label>Codigo IBGE Cidade</label>
            <input type="text" name="codigo_municipio" value="${fiscalData.codigo_municipio || ''}">
          </div>
        </div>
        
        <h4>Regime Tributario</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Regime Tributario</label>
            <select name="regime_tributario">
              <option value="1" ${fiscalData.regime_tributario === '1' ? 'selected' : ''}>Simples Nacional</option>
              <option value="2" ${fiscalData.regime_tributario === '2' ? 'selected' : ''}>Simples Nacional - Excesso</option>
              <option value="3" ${fiscalData.regime_tributario === '3' ? 'selected' : ''}>Regime Normal</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ambiente</label>
            <select name="ambiente">
              <option value="2" ${fiscalData.ambiente !== '1' ? 'selected' : ''}>Homologacao (Testes)</option>
              <option value="1" ${fiscalData.ambiente === '1' ? 'selected' : ''}>Producao</option>
            </select>
          </div>
        </div>
        
        <h4>Numeracao</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Serie NF-e</label>
            <input type="number" name="serie_nfe" value="${fiscalData.serie_nfe || 1}" min="1">
          </div>
          <div class="form-group">
            <label>Ultimo Numero NF-e</label>
            <input type="number" name="numero_nfe_atual" value="${fiscalData.numero_nfe_atual || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Serie NFC-e</label>
            <input type="number" name="serie_nfce" value="${fiscalData.serie_nfce || 1}" min="1">
          </div>
          <div class="form-group">
            <label>Ultimo Numero NFC-e</label>
            <input type="number" name="numero_nfce_atual" value="${fiscalData.numero_nfce_atual || 0}" min="0">
          </div>
        </div>
        
        <h4>Integracao com API (Opcional)</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Provedor de API</label>
            <select name="api_provider">
              <option value="MANUAL" ${!fiscalData.api_provider || fiscalData.api_provider === 'MANUAL' ? 'selected' : ''}>Manual (Sem integracao)</option>
              <option value="FOCUSNFE" ${fiscalData.api_provider === 'FOCUSNFE' ? 'selected' : ''}>Focus NFe</option>
              <option value="PLUGNOTAS" ${fiscalData.api_provider === 'PLUGNOTAS' ? 'selected' : ''}>PlugNotas</option>
              <option value="NUVEMFISCAL" ${fiscalData.api_provider === 'NUVEMFISCAL' ? 'selected' : ''}>Nuvem Fiscal</option>
            </select>
          </div>
          <div class="form-group flex-2">
            <label>Token da API</label>
            <input type="password" name="api_token" value="${fiscalData.api_token || ''}" placeholder="Insira o token da API">
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Configuracoes</button>
        </div>
      </form>
    `;
    
    openModal('Configuracoes Fiscais', modalContent);
  } catch (error) {
    showToast('Erro ao carregar configuracoes: ' + error.message, 'error');
  }
}

async function saveFiscalConfig(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  
  try {
    await api('/invoices/fiscal-data', { method: 'POST', body: data });
    showToast('Configuracoes fiscais salvas!', 'success');
    closeModal();
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  }
}

async function generateInvoiceFromSale(vendaId) {
  const tipoNota = prompt('Tipo de nota fiscal:\n1 - NF-e (Nota Fiscal Eletronica)\n2 - NFC-e (Cupom Fiscal)', '1');
  
  if (!tipoNota) return;
  
  const tipo = tipoNota === '2' ? 'NFCE' : 'NFE';
  
  try {
    const invoice = await api(`/invoices/from-sale/${vendaId}`, { 
      method: 'POST', 
      body: { tipo } 
    });
    showToast(`Nota fiscal ${invoice.numero} criada! Acesse Notas Fiscais para emitir.`, 'success');
  } catch (error) {
    showToast('Erro ao criar nota: ' + error.message, 'error');
  }
}

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

window.addEventListener('popstate', () => {
  const path = window.location.pathname.replace('/app/', '').replace('/app', '');
  if (path) {
    currentPage = path;
    renderMenu();
    loadPage(currentPage);
  }
});

async function renderSettings() {
  const content = document.getElementById('content');
  
  if (currentUser.perfil !== 'ADMIN_GLOBAL') {
    content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Acesso Restrito</h3><p>Apenas Admin Global pode acessar as configurações</p></div>';
    return;
  }
  
  try {
    const [config, roles] = await Promise.all([
      api('/settings'),
      api('/settings/roles')
    ]);
    
    content.innerHTML = `
      <div class="settings-page">
        <div class="form-section">
          <h3><i class="fas fa-percent"></i> Limites de Desconto</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Desconto Máx. Motos (%)</label>
              <input type="number" id="desconto_max_moto" value="${config.desconto_max_moto || 3.5}" step="0.5" min="0" max="100">
            </div>
            <div class="form-group">
              <label>Desconto Máx. Peças (%)</label>
              <input type="number" id="desconto_max_peca" value="${config.desconto_max_peca || 10}" step="0.5" min="0" max="100">
            </div>
            <div class="form-group">
              <label>Desconto Máx. Serviços (%)</label>
              <input type="number" id="desconto_max_servico" value="${config.desconto_max_servico || 10}" step="0.5" min="0" max="100">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-credit-card"></i> Limites de Parcelamento</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Parcelas Máx. Motos</label>
              <input type="number" id="parcelas_max_moto" value="${config.parcelas_max_moto || 21}" min="1" max="24">
            </div>
            <div class="form-group">
              <label>Parcelas Máx. Peças</label>
              <input type="number" id="parcelas_max_peca" value="${config.parcelas_max_peca || 10}" min="1" max="12">
            </div>
            <div class="form-group">
              <label>Taxa Débito (%)</label>
              <input type="number" id="taxa_debito" value="${config.taxa_debito || 1}" step="0.1" min="0" max="10">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-boxes"></i> Estoque e Margens</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Estoque Minimo Alerta (unidades)</label>
              <input type="number" id="estoque_minimo_alerta" value="${config.estoque_minimo_alerta || 2}" min="0">
            </div>
            <div class="form-group">
              <label>Margem Franqueado Pecas (%)</label>
              <input type="number" id="margem_franqueado_peca" value="${config.margem_franqueado_peca || 60}" step="1" min="0" max="200">
            </div>
            <div class="form-group">
              <label>Margem Franqueado Motos (%)</label>
              <input type="number" id="margem_franqueado_moto" value="${config.margem_franqueado_moto || 26.32}" step="0.01" min="0" max="100">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-building"></i> Configuracoes de Atacado (TM Imports)</h3>
          <p style="color: var(--text-muted); margin-bottom: 15px; font-size: 0.9rem;">
            Formula: Preco Venda = Custo + (Custo x Markup %). Ex: Custo R$ 5.000 x 42% = R$ 7.100
          </p>
          <div class="form-row">
            <div class="form-group">
              <label>Markup Atacado Motos (%)</label>
              <input type="number" id="markup_atacado_moto" value="${config.markup_atacado_moto || 42}" step="0.5" min="0" max="100">
            </div>
            <div class="form-group">
              <label>Desconto Maximo Atacado (R$)</label>
              <input type="number" id="desconto_max_atacado" value="${config.desconto_max_atacado || 100}" step="10" min="0">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-hand-holding-usd"></i> Comissoes de Vendedores</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Comissao Atacado - TM Imports (%)</label>
              <input type="number" id="comissao_atacado" value="${config.comissao_atacado || 2}" step="0.5" min="0" max="20">
              <small style="color: var(--text-muted);">Vendedores da matriz</small>
            </div>
            <div class="form-group">
              <label>Comissao Franquia - Tecle Motos (%)</label>
              <input type="number" id="comissao_franquia" value="${config.comissao_franquia || 1}" step="0.5" min="0" max="20">
              <small style="color: var(--text-muted);">Vendedores das lojas</small>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-table"></i> Tabela de Taxas Cartao de Credito</h3>
          <div class="taxas-grid" id="taxasGrid">
            ${renderTaxasCartao(config.taxas_cartao || {})}
          </div>
        </div>
        
        <div class="form-section">
          <h3><i class="fas fa-user-tag"></i> Perfis/Roles do Sistema</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Escopo</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${roles.map(r => `
                <tr>
                  <td><code>${r.codigo}</code></td>
                  <td>${r.nome}</td>
                  <td><span class="badge ${r.escopo === 'TMIMPORTS' ? 'badge-primary' : r.escopo === 'TECLE_MOTOS' ? 'badge-success' : 'badge-info'}">${r.escopo}</span></td>
                  <td>${r.descricao || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="form-section" style="border: 2px solid var(--danger); background: rgba(255,0,0,0.05);">
          <h3 style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Manutencao do Sistema</h3>
          <p style="color: var(--text-muted); margin-bottom: 15px;">
            <strong>ATENCAO:</strong> Estas acoes sao irreversiveis e afetam todos os dados do sistema.
          </p>
          <div class="form-row">
            <div class="form-group">
              <button class="btn btn-danger" onclick="limparDadosSistema()">
                <i class="fas fa-eraser"></i> Limpar Todos os Dados
              </button>
              <small style="color: var(--text-muted); display: block; margin-top: 5px;">
                Remove vendas, clientes, OS, notas fiscais, etc. Mantem usuarios, produtos e configuracoes.
              </small>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" onclick="saveSettings()"><i class="fas fa-save"></i> Salvar Configurações</button>
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar configurações</h3><p>' + error.message + '</p></div>';
  }
}

async function limparDadosSistema() {
  const confirma1 = confirm('ATENCAO: Esta acao ira APAGAR todos os dados transacionais do sistema!\n\nSerao removidos:\n- Vendas e itens\n- Ordens de servico\n- Clientes\n- Contas a receber/pagar\n- Notas fiscais\n- Solicitacoes de compra\n- Logs de auditoria\n\nDeseja continuar?');
  
  if (!confirma1) return;
  
  const confirma2 = prompt('Para confirmar, digite "LIMPAR" (em maiusculas):');
  
  if (confirma2 !== 'LIMPAR') {
    showToast('Operacao cancelada', 'info');
    return;
  }
  
  try {
    const result = await api('/admin/limpar-dados', { method: 'POST' });
    
    if (result.success) {
      showToast('Dados limpos com sucesso! Sistema pronto para uso.', 'success');
      setTimeout(() => location.reload(), 2000);
    }
  } catch (error) {
    showToast('Erro ao limpar dados: ' + error.message, 'error');
  }
}

function renderTaxasCartao(taxas) {
  let html = '';
  for (let i = 1; i <= 21; i++) {
    html += `
      <div class="taxa-item">
        <label>${i}x</label>
        <input type="number" id="taxa_${i}" value="${taxas[i] || 0}" step="0.5" min="0" max="50">
        <span>%</span>
      </div>
    `;
  }
  return html;
}

async function saveSettings() {
  const taxas_cartao = {};
  for (let i = 1; i <= 21; i++) {
    taxas_cartao[i] = parseFloat(document.getElementById(`taxa_${i}`).value) || 0;
  }
  
  const settings = {
    desconto_max_moto: parseFloat(document.getElementById('desconto_max_moto').value),
    desconto_max_peca: parseFloat(document.getElementById('desconto_max_peca').value),
    desconto_max_servico: parseFloat(document.getElementById('desconto_max_servico').value),
    parcelas_max_moto: parseInt(document.getElementById('parcelas_max_moto').value),
    parcelas_max_peca: parseInt(document.getElementById('parcelas_max_peca').value),
    taxa_debito: parseFloat(document.getElementById('taxa_debito').value),
    estoque_minimo_alerta: parseInt(document.getElementById('estoque_minimo_alerta').value),
    margem_franqueado_peca: parseFloat(document.getElementById('margem_franqueado_peca').value),
    margem_franqueado_moto: parseFloat(document.getElementById('margem_franqueado_moto').value),
    markup_atacado_moto: parseFloat(document.getElementById('markup_atacado_moto').value),
    desconto_max_atacado: parseFloat(document.getElementById('desconto_max_atacado').value),
    comissao_atacado: parseFloat(document.getElementById('comissao_atacado').value),
    comissao_franquia: parseFloat(document.getElementById('comissao_franquia').value),
    taxas_cartao
  };
  
  try {
    await api('/settings', { method: 'PUT', body: settings });
    showToast('Configurações salvas com sucesso!', 'success');
  } catch (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
  }
}

async function checkNotifications() {
  try {
    const [countData, alertas] = await Promise.all([
      api('/notifications/nao-lidas'),
      api('/notifications/verificar-estoque')
    ]);
    
    const badge = document.getElementById('notificationBadge');
    const total = (countData?.count || 0) + (alertas?.length || 0);
    
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Erro ao verificar notificações:', error);
  }
}

async function toggleNotifications() {
  const dropdown = document.getElementById('notificationsDropdown');
  notificationsVisible = !notificationsVisible;
  
  if (notificationsVisible) {
    dropdown.style.display = 'block';
    await loadNotifications();
  } else {
    dropdown.style.display = 'none';
  }
}

async function loadNotifications() {
  const list = document.getElementById('notificationsList');
  
  try {
    const [notifications, alertas] = await Promise.all([
      api('/notifications'),
      api('/notifications/verificar-estoque')
    ]);
    
    let html = '';
    
    alertas.forEach(a => {
      html += `
        <div class="notification-item unread">
          <div class="title"><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> ${a.titulo}</div>
          <div class="message">${a.mensagem}</div>
        </div>
      `;
    });
    
    notifications.forEach(n => {
      const date = new Date(n.createdAt).toLocaleDateString('pt-BR');
      html += `
        <div class="notification-item ${n.lida ? '' : 'unread'}" onclick="lerNotificacao(${n.id}, '${n.link || ''}')">
          <div class="title">${n.titulo}</div>
          <div class="message">${n.mensagem}</div>
          <div class="time">${date}</div>
        </div>
      `;
    });
    
    if (!html) {
      html = '<div class="empty-notifications"><i class="fas fa-check-circle"></i><p>Nenhuma notificação</p></div>';
    }
    
    list.innerHTML = html;
  } catch (error) {
    list.innerHTML = '<div class="empty-notifications">Erro ao carregar</div>';
  }
}

async function lerNotificacao(id, link) {
  try {
    await api(`/notifications/${id}/ler`, { method: 'PUT' });
    checkNotifications();
    if (link) {
      window.location.href = link;
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

async function marcarTodasLidas() {
  try {
    await api('/notifications/marcar-todas-lidas', { method: 'POST' });
    checkNotifications();
    loadNotifications();
    showToast('Todas notificações marcadas como lidas', 'success');
  } catch (error) {
    showToast('Erro ao marcar notificações', 'error');
  }
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('notificationsDropdown');
  const btn = document.getElementById('btnNotifications');
  if (notificationsVisible && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = 'none';
    notificationsVisible = false;
  }
});

let rankingsRange = localStorage.getItem('rankingsRange') || 'monthly';

async function renderRankings() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando rankings...</div>';
  
  try {
    const data = await api(`/dashboard/rankings?range=${rankingsRange}`);
    
    const motos = (data.topProdutos || []).filter(p => p.tipo === 'MOTO' || p.tipo === 'SCOOTER').map(p => ({ nome: p.nome, quantidade: p.qty, valor: p.value }));
    const pecas = (data.topProdutos || []).filter(p => p.tipo === 'PECA').map(p => ({ nome: p.nome, quantidade: p.qty, valor: p.value }));
    const servicos = (data.topProdutos || []).filter(p => p.tipo === 'SERVICO').map(p => ({ nome: p.nome, quantidade: p.qty, valor: p.value }));
    
    const rangeLabel = rankingsRange === 'weekly' ? 'Semanal' : rankingsRange === 'monthly' ? 'Mensal' : 'Total';
    
    const renderTable = (items, icon, title) => {
      if (items.length === 0) return '<tr><td colspan="5" class="text-center">Sem dados no periodo</td></tr>';
      return items.map((p, i) => {
        const perfColor = i < 3 ? 'success' : i < 10 ? 'primary' : 'warning';
        const perfIcon = i < 3 ? '🥇' : i < 10 ? '🥈' : '⚠️';
        return `
        <tr style="border-left: 4px solid var(--${perfColor});">
          <td><span class="badge badge-${i < 3 ? 'warning' : 'secondary'}">${i + 1}</span></td>
          <td><span class="badge badge-${perfColor}">${perfIcon}</span></td>
          <td>${p.nome}</td>
          <td>${p.quantidade || 0}</td>
          <td>${formatCurrency(p.valor || 0)}</td>
        </tr>`;
      }).join('');
    };
    
    content.innerHTML = `
      <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn ${rankingsRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeRankingsRange('weekly')">Semanal</button>
        <button class="btn ${rankingsRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeRankingsRange('monthly')">Mensal</button>
        <button class="btn ${rankingsRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeRankingsRange('all')">Total</button>
      </div>
      
      <div class="tabs">
        <button class="tab active" onclick="showRankingTab('motos')">Motos</button>
        <button class="tab" onclick="showRankingTab('pecas')">Pecas</button>
        <button class="tab" onclick="showRankingTab('servicos')">Servicos</button>
      </div>
      
      <div style="margin-bottom: 15px; display: flex; gap: 15px; flex-wrap: wrap;">
        <span><span class="badge badge-success" style="font-size: 14px;">🥇</span> Top 3 - Excelente</span>
        <span><span class="badge badge-primary" style="font-size: 14px;">🥈</span> 4-10 - Bom</span>
        <span><span class="badge badge-warning" style="font-size: 14px;">⚠️</span> 11+ - Atencao</span>
      </div>
      
      <div id="rankingMotos" class="tab-content active">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-motorcycle"></i> Top Motos Vendidas (${rangeLabel})</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>#</th><th>Performance</th><th>Produto</th><th>Qtd Vendida</th><th>Valor Total</th></tr></thead>
                <tbody>${renderTable(motos)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div id="rankingPecas" class="tab-content" style="display:none;">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-cog"></i> Top Pecas Vendidas (${rangeLabel})</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>#</th><th>Performance</th><th>Produto</th><th>Qtd Vendida</th><th>Valor Total</th></tr></thead>
                <tbody>${renderTable(pecas)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div id="rankingServicos" class="tab-content" style="display:none;">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-wrench"></i> Top Servicos (${rangeLabel})</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>#</th><th>Performance</th><th>Servico</th><th>Qtd Vendida</th><th>Valor Total</th></tr></thead>
                <tbody>${renderTable(servicos)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar rankings</h3><p>${error.message}</p></div>`;
  }
}

function changeRankingsRange(range) {
  rankingsRange = range;
  localStorage.setItem('rankingsRange', range);
  renderRankings();
}

function showRankingTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('ranking' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
  event.target.classList.add('active');
}

async function renderLowMovers() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando produtos parados...</div>';
  
  try {
    const lowMovers = await api(`/dashboard/low-movers?range=${rankingsRange}`);
    
    const rangeLabel = rankingsRange === 'weekly' ? 'Semanal' : rankingsRange === 'monthly' ? 'Mensal' : 'Total';
    
    content.innerHTML = `
      <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn ${rankingsRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeLowMoversRange('weekly')">Semanal</button>
        <button class="btn ${rankingsRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeLowMoversRange('monthly')">Mensal</button>
        <button class="btn ${rankingsRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeLowMoversRange('all')">Total</button>
      </div>
      
      <div class="tabs">
        <button class="tab active" onclick="showLowMoverTab('menos')">Menos Vendidos</button>
        <button class="tab" onclick="showLowMoverTab('sem')">Sem Venda no Período</button>
        <button class="tab" onclick="showLowMoverTab('parados')">Parados há 30 dias</button>
      </div>
      
      <div id="lowMenos" class="tab-content active">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-arrow-down"></i> Menos Vendidos (${rangeLabel})</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>Produto</th><th>Tipo</th><th>Qtd Vendida</th><th>Estoque Atual</th></tr></thead>
                <tbody>
                  ${(lowMovers?.menosVendidos || []).map(p => `
                    <tr>
                      <td>${p.nome}</td>
                      <td><span class="badge badge-secondary">${p.tipo}</span></td>
                      <td>${p.quantidade || 0}</td>
                      <td>${p.estoque || 0}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum dado</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div id="lowSem" class="tab-content" style="display:none;">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-ban"></i> Sem Venda no Período (${rangeLabel})</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>Produto</th><th>Tipo</th><th>Estoque Atual</th><th>Última Venda</th></tr></thead>
                <tbody>
                  ${(lowMovers?.semVenda || []).map(p => `
                    <tr>
                      <td>${p.nome}</td>
                      <td><span class="badge badge-secondary">${p.tipo}</span></td>
                      <td>${p.estoque || 0}</td>
                      <td>${p.ultimaVenda ? new Date(p.ultimaVenda).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum dado</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div id="lowParados" class="tab-content" style="display:none;">
        <div class="card">
          <div class="card-header"><h2><i class="fas fa-snowflake"></i> Parados há 30+ Dias (com estoque)</h2></div>
          <div class="card-body">
            <div class="table-container">
              <table>
                <thead><tr><th>Produto</th><th>Tipo</th><th>Estoque</th><th>Dias Parado</th></tr></thead>
                <tbody>
                  ${(lowMovers?.parados30dias || []).map(p => `
                    <tr>
                      <td>${p.nome}</td>
                      <td><span class="badge badge-secondary">${p.tipo}</span></td>
                      <td>${p.estoque || 0}</td>
                      <td><span class="badge badge-${p.diasParado >= 60 ? 'danger' : p.diasParado >= 30 ? 'warning' : 'primary'}">${p.diasParado !== null ? p.diasParado + ' dias' : 'Nunca vendeu'}</span></td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum dado</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>${error.message}</p></div>`;
  }
}

function changeLowMoversRange(range) {
  rankingsRange = range;
  localStorage.setItem('rankingsRange', range);
  renderLowMovers();
}

function showLowMoverTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('low' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
  event.target.classList.add('active');
}

function getPriorityColor(priority, total) {
  const pct = priority / total;
  if (pct <= 0.33) return 'danger';
  if (pct <= 0.66) return 'warning';
  return 'success';
}

function getPriorityLabel(priority, total) {
  const pct = priority / total;
  if (pct <= 0.33) return 'Alta';
  if (pct <= 0.66) return 'Média';
  return 'Baixa';
}

async function renderFranchiseDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando franquias...</div>';
  
  try {
    const [rankings, estoqueStats] = await Promise.all([
      api(`/dashboard/franchise-ranking?range=${dashboardRange}`),
      api(`/dashboard/central-inventory-stats?range=${dashboardRange}`)
    ]);
    
    const rangeLabel = dashboardRange === 'weekly' ? 'Semanal' : dashboardRange === 'monthly' ? 'Mensal' : 'Total';
    const total = rankings.length || 1;
    
    content.innerHTML = `
      <div class="dashboard-filters" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn ${dashboardRange === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeFranchiseRange('weekly')">Semanal</button>
        <button class="btn ${dashboardRange === 'monthly' ? 'btn-primary' : 'btn-secondary'}" onclick="changeFranchiseRange('monthly')">Mensal</button>
        <button class="btn ${dashboardRange === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="changeFranchiseRange('all')">Total</button>
      </div>
      
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-warehouse"></i> Estoque Central - Metricas (${rangeLabel})</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-boxes"></i></div>
              <div class="stat-value">${formatCurrency(estoqueStats.valorTotalEstoque || 0)}</div>
              <div class="stat-label">Valor Total em Estoque</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-chart-line"></i></div>
              <div class="stat-value">${formatCurrency(estoqueStats.margemPotencial || 0)}</div>
              <div class="stat-label">Margem Potencial (Lucro)</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
              <div class="stat-value">${formatCurrency(estoqueStats.mediaDiariaVendas || 0)}/dia</div>
              <div class="stat-label">Media Diaria de Vendas</div>
            </div>
            <div class="stat-card" title="Quantos dias o estoque atual duraria se voce parar de comprar. Calculado: Valor Estoque / Media Diaria de Vendas. Verde = mais de 90 dias, Amarelo = 30-90 dias, Vermelho = menos de 30 dias.">
              <div class="stat-icon ${estoqueStats.diasEstoqueParado > 90 ? 'green' : estoqueStats.diasEstoqueParado > 30 ? 'yellow' : 'red'}"><i class="fas fa-hourglass-half"></i></div>
              <div class="stat-value">${estoqueStats.diasEstoqueParado || 0} dias</div>
              <div class="stat-label">Cobertura de Estoque <i class="fas fa-question-circle" style="font-size: 0.7rem;"></i></div>
            </div>
          </div>
          <div class="stats-grid" style="margin-top: 15px;">
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-cubes"></i></div>
              <div class="stat-value">${estoqueStats.qtdTotalItens || 0} itens</div>
              <div class="stat-label">Quantidade Total</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-tags"></i></div>
              <div class="stat-value">${estoqueStats.qtdProdutosDiferentes || 0}</div>
              <div class="stat-label">Produtos Diferentes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-receipt"></i></div>
              <div class="stat-value">${estoqueStats.qtdVendasPeriodo || 0}</div>
              <div class="stat-label">Vendas no Periodo</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
              <div class="stat-value">${formatCurrency(estoqueStats.totalVendasPeriodo || 0)}</div>
              <div class="stat-label">Total Vendido no Periodo</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2><i class="fas fa-store"></i> Franquias - Ranking por Performance (${rangeLabel})</h2>
        </div>
        <div class="card-body">
          <div style="margin-bottom: 15px; display: flex; gap: 15px; flex-wrap: wrap;">
            <span><span class="badge badge-danger">●</span> Alta Prioridade (precisa atencao)</span>
            <span><span class="badge badge-warning">●</span> Media Prioridade</span>
            <span><span class="badge badge-success">●</span> Baixa Prioridade (bom desempenho)</span>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank Vendas</th>
                  <th>Prioridade</th>
                  <th>Franquia</th>
                  <th>Cidade</th>
                  <th>Vendas (Qtd)</th>
                  <th>Vendas (R$)</th>
                  <th>OS</th>
                  <th>Estoque Critico</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                ${rankings.map(s => {
                  const prioColor = getPriorityColor(s.attention_priority, total);
                  const prioLabel = getPriorityLabel(s.attention_priority, total);
                  return `
                  <tr style="border-left: 4px solid var(--${prioColor === 'danger' ? 'danger' : prioColor === 'warning' ? 'warning' : 'success'});">
                    <td><span class="badge badge-${s.ranking <= 3 ? 'warning' : 'secondary'}">#${s.ranking}</span></td>
                    <td><span class="badge badge-${prioColor}">${prioLabel}</span></td>
                    <td><strong>${s.nome}</strong></td>
                    <td>${s.cidade || '-'}</td>
                    <td>${s.vendas_count}</td>
                    <td>${formatCurrency(s.vendas_value)}</td>
                    <td>${s.os_count}</td>
                    <td>
                      <span class="badge badge-${s.estoque_sem > 0 ? 'danger' : s.estoque_baixo > 0 ? 'warning' : 'success'}">
                        ${s.estoque_sem > 0 ? s.estoque_sem + ' sem estoque' : s.estoque_baixo > 0 ? s.estoque_baixo + ' baixo' : 'OK'}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="viewFranchiseDetail(${s.id})">
                        <i class="fas fa-chart-bar"></i> Ver Dashboard
                      </button>
                    </td>
                  </tr>
                `}).join('') || '<tr><td colspan="9" class="text-center">Nenhuma franquia</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div id="franchiseDetail"></div>
    `;
  } catch (error) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3><p>${error.message}</p></div>`;
  }
}

function changeFranchiseRange(range) {
  dashboardRange = range;
  localStorage.setItem('dashboardRange', range);
  renderFranchiseDashboard();
}

async function viewFranchiseDetail(storeId) {
  let detail = document.getElementById('franchiseDetail');
  if (!detail) {
    const content = document.getElementById('content');
    const div = document.createElement('div');
    div.id = 'franchiseDetail';
    content.appendChild(div);
    detail = div;
  }
  detail.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
  detail.scrollIntoView({ behavior: 'smooth' });
  
  try {
    const [store, summary] = await Promise.all([
      api(`/stores/${storeId}`),
      api(`/dashboard/summary?range=${dashboardRange}&storeId=${storeId}`)
    ]);
    
    detail.innerHTML = `
      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h2><i class="fas fa-store"></i> ${store.nome} - Dashboard Detalhado</h2>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
              <div class="stat-value">${summary?.vendas?.total_qty || 0} | ${formatCurrency(summary?.vendas?.total_value || 0)}</div>
              <div class="stat-label">Vendas</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue"><i class="fas fa-wrench"></i></div>
              <div class="stat-value">${summary?.os?.open_qty || 0} | ${formatCurrency(summary?.os?.open_value || 0)}</div>
              <div class="stat-label">OS Abertas</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
              <div class="stat-value">${summary?.os?.closed_qty || 0} | ${formatCurrency(summary?.os?.closed_value || 0)}</div>
              <div class="stat-label">OS Fechadas</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
              <div class="stat-value">${summary?.estoque?.low_stock_qty || 0}</div>
              <div class="stat-label">Estoque Baixo</div>
            </div>
          </div>
          <div class="stats-grid" style="margin-top: 15px;">
            <div class="stat-card">
              <div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div>
              <div class="stat-value">${summary?.receber?.pending_qty || 0} | ${formatCurrency(summary?.receber?.pending_value || 0)}</div>
              <div class="stat-label">A Receber (Pendente)</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon red"><i class="fas fa-file-invoice-dollar"></i></div>
              <div class="stat-value">${summary?.pagar?.pending_qty || 0} | ${formatCurrency(summary?.pagar?.pending_value || 0)}</div>
              <div class="stat-label">A Pagar (Pendente)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    detail.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${error.message}</p></div>`;
  }
}

window.viewFranchiseDetail = viewFranchiseDetail;
window.changeFranchiseRange = changeFranchiseRange;
window.changeRankingsRange = changeRankingsRange;
window.changeLowMoversRange = changeLowMoversRange;

init();
