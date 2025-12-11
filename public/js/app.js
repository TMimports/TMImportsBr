const API_URL = '';
let currentUser = null;
let currentPage = 'dashboard';

const menuItems = {
  ADMIN_GLOBAL: [
    { section: 'Principal', items: [
      { id: 'dashboard', label: 'Dashboard Global', icon: 'fas fa-chart-line' }
    ]},
    { section: 'Franquias', items: [
      { id: 'franquias', label: 'Gerenciar Franquias', icon: 'fas fa-store' },
      { id: 'lojas', label: 'Lojas', icon: 'fas fa-map-marker-alt' }
    ]},
    { section: 'Produtos', items: [
      { id: 'produtos', label: 'Produtos / Serviços', icon: 'fas fa-box' },
      { id: 'categorias', label: 'Categorias', icon: 'fas fa-tags' },
      { id: 'importar', label: 'Importar Planilha', icon: 'fas fa-file-excel' }
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
      { id: 'produtos', label: 'Produtos', icon: 'fas fa-box' },
      { id: 'importar', label: 'Importar Planilha', icon: 'fas fa-file-excel' }
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
            <div class="stat-icon yellow"><i class="fas fa-hand-holding-usd"></i></div>
            <div class="stat-value">${formatCurrency(data.totalReceber)}</div>
            <div class="stat-label">A Receber</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="stat-value">${formatCurrency(data.totalPagar)}</div>
            <div class="stat-label">A Pagar</div>
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
          <button class="btn btn-primary" onclick="openProductModal()">
            <i class="fas fa-plus"></i> Novo Produto
          </button>
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
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-hand-holding-usd"></i>
    <h3>Contas a Receber</h3>
    <p>As contas a receber são geradas automaticamente pelas vendas</p>
  </div>`;
}

async function renderPayables() {
  const content = document.getElementById('content');
  
  try {
    const contas = await api('/financial/pagar');
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Contas a Pagar</h2>
          <button class="btn btn-primary" onclick="openPayableModal()">
            <i class="fas fa-plus"></i> Nova Conta
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Fornecedor</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${contas.map(c => `
                  <tr>
                    <td>${c.descricao}</td>
                    <td>${c.fornecedor || '-'}</td>
                    <td>${formatDate(c.data_vencimento)}</td>
                    <td>${formatCurrency(c.valor)}</td>
                    <td><span class="badge badge-${c.status === 'PAGO' ? 'success' : 'warning'}">${c.status}</span></td>
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
  content.innerHTML = `<div class="empty-state">
    <i class="fas fa-university"></i>
    <h3>Conciliação Bancária</h3>
    <p>Importe extratos bancários para conciliar automaticamente</p>
  </div>`;
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
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Franquias</h2>
          <button class="btn btn-primary" onclick="openCompanyModal()">
            <i class="fas fa-plus"></i> Nova Franquia
          </button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Tipo</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Lojas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${companies.map(c => `
                  <tr>
                    <td>${c.nome}</td>
                    <td>${c.cnpj || '-'}</td>
                    <td><span class="badge badge-${c.tipo === 'MATRIZ' ? 'primary' : 'success'}">${c.tipo}</span></td>
                    <td>${c.telefone || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td><span class="badge badge-${c.ativo ? 'success' : 'danger'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>${c.lojas?.length || 0}</td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" onclick='editCompany(${JSON.stringify(c).replace(/'/g, "\\'")})'>
                        <i class="fas fa-edit"></i>
                      </button>
                      ${c.tipo !== 'MATRIZ' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteCompany(${c.id})">
                          <i class="fas fa-trash"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          ${companies.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-store"></i>
              <h3>Nenhuma franquia cadastrada</h3>
              <p>Clique em "Nova Franquia" para começar</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openCompanyModal(company = null) {
  const title = company ? 'Editar Franquia' : 'Nova Franquia';
  const content = `
    <form id="companyForm" onsubmit="saveCompany(event, ${company?.id || 'null'})">
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
      <div class="form-group">
        <label>Nome da Empresa *</label>
        <input type="text" name="nome" id="nomeInput" value="${company?.nome || ''}" required>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="text" name="telefone" id="telefoneInput" value="${company?.telefone || ''}" placeholder="(11) 99999-9999">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" id="emailInput" value="${company?.email || ''}">
      </div>
      <div class="form-group">
        <label>Endereço</label>
        <textarea name="endereco" id="enderecoInput" rows="2">${company?.endereco || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Salvar
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
    endereco: form.endereco.value,
    tipo: 'FRANQUIA'
  };
  
  try {
    if (id) {
      await api(`/companies/${id}`, { method: 'PUT', body: data });
      showToast('Franquia atualizada com sucesso!', 'success');
    } else {
      await api('/companies', { method: 'POST', body: data });
      showToast('Franquia cadastrada com sucesso!', 'success');
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
