const API_URL = '';
let currentUser = null;
let currentPage = 'dashboard';

const menuItems = {
  ADMIN_GLOBAL: [
    { section: 'Principal', items: [
      { id: 'dashboard', label: 'Dashboard Global', icon: 'fas fa-chart-line' }
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
    { section: 'Financeiro', items: [
      { id: 'receber', label: 'Contas a Receber', icon: 'fas fa-hand-holding-usd' },
      { id: 'pagar', label: 'Contas a Pagar', icon: 'fas fa-file-invoice-dollar' },
      { id: 'conciliacao', label: 'Conciliação Bancária', icon: 'fas fa-university' },
      { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'fas fa-chart-bar' }
    ]},
    { section: 'Sistema', items: [
      { id: 'usuarios', label: 'Usuários', icon: 'fas fa-users-cog' },
      { id: 'auditoria', label: 'Logs de Auditoria', icon: 'fas fa-history' },
      { id: 'manual', label: 'Manual do Sistema', icon: 'fas fa-book' }
    ]}
  ],
  GESTOR_FRANQUIA: [
    { section: 'Principal', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' }
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
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' }
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
  ]
};

async function init() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    window.location.href = '/login';
    return;
  }
  
  try {
    currentUser = JSON.parse(user);
    renderMenu();
    renderUserInfo();
    
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
    'OPERACIONAL': 'Operacional'
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
    'manual': 'Manual do Sistema'
  };
  
  pageTitle.textContent = titles[page] || 'Dashboard';
  
  try {
    switch (page) {
      case 'dashboard':
        await renderDashboard();
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

async function renderDashboard() {
  const content = document.getElementById('content');
  
  try {
    const endpoint = currentUser.perfil === 'ADMIN_GLOBAL' ? '/dashboard/global' : '/dashboard/loja';
    const data = await api(endpoint);
    
    if (currentUser.perfil === 'ADMIN_GLOBAL') {
      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div>
            <div class="stat-value">${formatCurrency(data.totalVendasMes)}</div>
            <div class="stat-label">Vendas do Mês</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-wrench"></i></div>
            <div class="stat-value">${formatCurrency(data.totalOSMes)}</div>
            <div class="stat-label">Serviços do Mês</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon ${data.saldoAtual >= 0 ? 'green' : 'red'}"><i class="fas fa-balance-scale"></i></div>
            <div class="stat-value" style="color: ${data.saldoAtual >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCurrency(data.saldoAtual)}</div>
            <div class="stat-label">Saldo Projetado</div>
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
      `;
    }
  } catch (error) {
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-chart-line"></i>
      <h3>Bem-vindo ao Sistema</h3>
      <p>Use o menu lateral para navegar</p>
    </div>`;
  }
}

async function renderProducts() {
  const content = document.getElementById('content');
  
  try {
    const products = await api('/products');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Produtos / Serviços</h2>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="toggleImportSection()">
              <i class="fas fa-file-excel"></i> Importar Planilha
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
                  <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required>
                </div>
                <div class="form-group" style="flex: 1;">
                  <button type="submit" class="btn btn-success">
                    <i class="fas fa-upload"></i> Importar
                  </button>
                </div>
              </div>
            </form>
            <div id="importResult"></div>
            
            <details style="margin-top: 15px;">
              <summary style="cursor: pointer; color: var(--primary);">Formato esperado da planilha</summary>
              <ul style="color: var(--text-muted); list-style: inside; margin-top: 10px;">
                <li>Coluna "Código" ou "codigo"</li>
                <li>Coluna "Descrição" ou "Nome"</li>
                <li>Coluna "Categoria" (será criada automaticamente)</li>
                <li>Coluna "Preço" ou "Preço Venda"</li>
                <li>Coluna "Preço Custo" ou "Custo" (opcional)</li>
              </ul>
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
                ${products.map(p => `
                  <tr data-tipo="${p.tipo}" data-nome="${p.nome?.toLowerCase()}">
                    <td>${p.codigo || '-'}</td>
                    <td>${p.nome}</td>
                    <td><span class="badge badge-${p.tipo === 'MOTO' ? 'primary' : p.tipo === 'SERVICO' ? 'success' : 'secondary'}">${p.tipo}</span></td>
                    <td>${formatCurrency(p.preco_custo)}</td>
                    <td>${formatCurrency(p.preco_venda)}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "\\'")})'>
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
          <input type="number" step="0.01" name="preco_custo" value="${product?.preco_custo || 0}">
        </div>
        <div class="form-group">
          <label>% Lucro</label>
          <input type="number" step="0.01" name="percentual_lucro" value="${product?.percentual_lucro || 30}">
        </div>
        <div class="form-group">
          <label>Preço de Venda</label>
          <input type="number" step="0.01" name="preco_venda" value="${product?.preco_venda || 0}">
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

function editProduct(product) {
  openProductModal(product);
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
          Faça upload de uma planilha Excel (.xlsx) ou CSV com os produtos. 
          O sistema identificará automaticamente o tipo (Moto, Peça ou Serviço) baseado no nome.
        </p>
        
        <form id="importForm" onsubmit="importProducts(event)">
          <div class="form-group">
            <label>Arquivo da Planilha</label>
            <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required>
          </div>
          
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-upload"></i> Importar
          </button>
        </form>
        
        <div id="importResult" style="margin-top: 20px;"></div>
        
        <hr style="margin: 30px 0; border-color: var(--border);">
        
        <h3 style="margin-bottom: 15px;">Formato esperado da planilha:</h3>
        <ul style="color: var(--text-muted); list-style: inside;">
          <li>Coluna "Código" ou "codigo" - Código do produto</li>
          <li>Coluna "Descrição" ou "Nome" - Nome do produto</li>
          <li>Coluna "Preço" ou "Preço Venda" - Preço de venda</li>
          <li>Coluna "Preço Custo" ou "Custo" - Preço de custo (opcional)</li>
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
  
  resultDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Importando...</div>';
  
  try {
    const result = await api('/products/importar', {
      method: 'POST',
      body: formData
    });
    
    resultDiv.innerHTML = `
      <div class="stat-card" style="background: rgba(0, 255, 136, 0.1);">
        <h3 style="color: var(--success);">Importação Concluída!</h3>
        <p style="margin-top: 10px;">
          <strong>${result.criados}</strong> produtos criados<br>
          <strong>${result.atualizados}</strong> produtos atualizados<br>
          ${result.erros?.length > 0 ? `<strong style="color: var(--danger);">${result.erros.length}</strong> erros` : ''}
        </p>
      </div>
    `;
    
    showToast('Importação concluída');
  } catch (error) {
    resultDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    showToast(error.message, 'error');
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

async function renderSales() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-shopping-cart"></i>
    <h3>Módulo de Vendas</h3>
    <p>Use o botão abaixo para criar uma nova venda</p>
    <button class="btn btn-primary" onclick="showToast('Funcionalidade em desenvolvimento', 'warning')">
      <i class="fas fa-plus"></i> Nova Venda
    </button>
  </div>`;
}

async function renderServiceOrders() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-wrench"></i>
    <h3>Ordens de Serviço</h3>
    <p>Gerencie as ordens de serviço da loja</p>
    <button class="btn btn-primary" onclick="showToast('Funcionalidade em desenvolvimento', 'warning')">
      <i class="fas fa-plus"></i> Nova OS
    </button>
  </div>`;
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
                      <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">
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
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                ${vendors.map(v => `
                  <tr>
                    <td>${v.nome}</td>
                    <td>${v.email || '-'}</td>
                    <td>${v.telefone || '-'}</td>
                    <td>${v.comissao || 0}%</td>
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
                  <button class="btn btn-sm btn-primary" onclick="openImportarExtratoModal(${c.id}, '${c.nome}')">
                    <i class="fas fa-upload"></i> Importar
                  </button>
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
          <h2>Usuários</h2>
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
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td>${u.nome}</td>
                    <td>${u.email}</td>
                    <td>${u.perfil}</td>
                    <td><span class="badge badge-${u.ativo ? 'success' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
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

function openUserModal() {
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
      </div>
      
      <div class="form-group">
        <label>Perfil</label>
        <select name="perfil">
          <option value="OPERACIONAL">Operacional</option>
          <option value="GESTOR_FRANQUIA">Gestor de Franquia</option>
          ${currentUser.perfil === 'ADMIN_GLOBAL' ? '<option value="ADMIN_GLOBAL">Admin Global</option>' : ''}
        </select>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Cadastrar</button>
      </div>
    </form>
  `;
  
  openModal('Novo Usuário', formContent);
}

async function saveUser(event) {
  event.preventDefault();
  
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  
  try {
    await api('/users', { method: 'POST', body: data });
    showToast('Usuário cadastrado');
    closeModal();
    await renderUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function renderCompanies() {
  const content = document.getElementById('content');
  
  try {
    const companies = await api('/companies');
    const franquias = companies.filter(c => c.tipo === 'FRANQUIA');
    
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
              ${franquias.map(c => `
                <div class="franchise-card">
                  <div class="franchise-header">
                    <div class="franchise-info">
                      <h3>${c.nome}</h3>
                      <span class="badge badge-${c.ativo ? 'success' : 'danger'}">${c.ativo ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div class="franchise-actions">
                      <button class="btn btn-sm btn-secondary" onclick='viewFranchise(${JSON.stringify(c).replace(/'/g, "\\'")})'>
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

init();
