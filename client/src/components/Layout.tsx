import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from './ui';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = {
  ADMIN_GERAL: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
    { id: 'grupos', label: 'Grupos', icon: '🏢' },
    { id: 'lojas', label: 'Lojas', icon: '🏪' },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
    { id: 'produtos', label: 'Produtos', icon: '📦' },
    { id: 'servicos', label: 'Servicos', icon: '🔧' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'pedidos-compra', label: 'Pedidos de Compra', icon: '🛒' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Contas a Pagar', icon: '💵' },
    { id: 'contas-receber', label: 'Contas a Receber', icon: '💳' },
    { id: 'garantias', label: 'Garantias', icon: '📜' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
    { id: 'utilidades', label: 'Utilidades', icon: '🔄' },
    { id: 'configuracoes', label: 'Configuracoes', icon: '⚙️' },
  ],
  ADMIN_FINANCEIRO: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'pedidos-compra', label: 'Pedidos de Compra', icon: '🛒' },
    { id: 'financeiro', label: 'Contas a Pagar', icon: '💵' },
    { id: 'contas-receber', label: 'Contas a Receber', icon: '💳' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
  ],
  ADMIN_REDE: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'grupos', label: 'Grupos', icon: '🏢' },
    { id: 'lojas', label: 'Lojas', icon: '🏪' },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
  ],
  DONO_LOJA: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'pedidos-compra', label: 'Pedidos de Compra', icon: '🛒' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Contas a Pagar', icon: '💵' },
    { id: 'contas-receber', label: 'Contas a Receber', icon: '💳' },
    { id: 'garantias', label: 'Garantias', icon: '📜' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
    { id: 'utilidades', label: 'Utilidades', icon: '🔄' },
  ],
  GERENTE_LOJA: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'pedidos-compra', label: 'Pedidos de Compra', icon: '🛒' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Contas a Pagar', icon: '💵' },
    { id: 'contas-receber', label: 'Contas a Receber', icon: '💳' },
    { id: 'garantias', label: 'Garantias', icon: '📜' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
    { id: 'utilidades', label: 'Utilidades', icon: '🔄' },
  ],
  VENDEDOR: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'vendas', label: 'Minhas Vendas', icon: '💰' },
    { id: 'os', label: 'Minhas OS', icon: '🔩' },
    { id: 'garantias', label: 'Garantias', icon: '📜' },
    { id: 'comissoes', label: 'Minhas Comissoes', icon: '💸' },
    { id: 'utilidades', label: 'Utilidades', icon: '🔄' },
  ],
};

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Admin Geral',
  ADMIN_FINANCEIRO: 'Admin Financeiro',
  ADMIN_REDE: 'Admin Rede',
  DONO_LOJA: 'Dono de Loja',
  GERENTE_LOJA: 'Gerente',
  VENDEDOR: 'Vendedor'
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [senhaModal, setSenhaModal] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [senhaErro, setSenhaErro] = useState('');
  const [senhaSucesso, setSenhaSucesso] = useState('');
  const [senhaLoading, setSenhaLoading] = useState(false);
  
  const items = menuItems[user?.role as keyof typeof menuItems] || menuItems.VENDEDOR;

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaErro('');
    setSenhaSucesso('');

    if (senhaForm.novaSenha !== senhaForm.confirmar) {
      setSenhaErro('Nova senha e confirmacao nao conferem');
      return;
    }
    if (senhaForm.novaSenha.length < 8) {
      setSenhaErro('Nova senha deve ter no minimo 8 caracteres');
      return;
    }

    setSenhaLoading(true);
    try {
      const response = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          senhaAtual: senhaForm.senhaAtual,
          novaSenha: senhaForm.novaSenha,
          confirmarSenha: senhaForm.confirmar
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setSenhaErro(data.error || 'Erro ao trocar senha');
        return;
      }
      setSenhaSucesso('Senha alterada com sucesso!');
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
      setTimeout(() => { setSenhaModal(false); setSenhaSucesso(''); }, 1500);
    } catch {
      setSenhaErro('Erro de conexao com o servidor');
    } finally {
      setSenhaLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        bg-zinc-900 min-h-screen border-r border-zinc-800 flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-56'}
        ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-14 px-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="Tecle Motos" className="w-8 h-8 shrink-0" />
            {!collapsed && (
              <div className="min-w-0 hidden md:block">
                <p className="text-sm font-semibold text-white leading-tight truncate">Tecle Motos</p>
                <p className="text-[10px] text-orange-500 leading-tight">Sistema ERP</p>
              </div>
            )}
          </div>
          {/* Collapse toggle (desktop) */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              }
            </svg>
          </button>
          {/* Close (mobile) */}
          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {items.map(item => {
            const active = currentPage === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    w-full flex items-center rounded-lg text-sm font-medium
                    transition-all duration-150 text-left
                    ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'}
                    ${active
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[70]
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-zinc-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl border border-zinc-700">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-2 border-t border-zinc-800 space-y-1">
          {!collapsed && (
            <div className="px-2 py-2 bg-zinc-800/50 rounded-lg mb-1">
              <p className="text-xs font-semibold text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{roleLabels[user?.role || ''] || user?.role}</p>
              {user?.loja && (
                <p className="text-[10px] text-orange-400 mt-0.5 truncate">{user.loja.nomeFantasia}</p>
              )}
            </div>
          )}

          {/* Trocar senha */}
          <div className="relative group">
            <button
              onClick={() => { setSenhaModal(true); setSenhaErro(''); setSenhaSucesso(''); setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' }); }}
              className={`w-full flex items-center rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors
                ${collapsed ? 'justify-center py-2.5' : 'gap-2 px-2.5 py-2'}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {!collapsed && <span>Alterar Senha</span>}
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[70]
                opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-zinc-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl border border-zinc-700">
                  Alterar Senha
                </div>
              </div>
            )}
          </div>

          {/* Sair */}
          <div className="relative group">
            <button
              onClick={logout}
              className={`w-full flex items-center rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors
                ${collapsed ? 'justify-center py-2.5' : 'gap-2 px-2.5 py-2'}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!collapsed && <span>Sair do Sistema</span>}
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[70]
                opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-zinc-800 text-red-400 text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl border border-zinc-700">
                  Sair do Sistema
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <button 
            onClick={() => setMenuOpen(true)}
            className="text-gray-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Tecle Motos" className="w-8 h-8" />
            <span className="text-sm font-semibold text-white">Tecle Motos</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-4 md:p-5 overflow-y-auto bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {senhaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSenhaModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Alterar Senha</h2>
            <form onSubmit={handleTrocarSenha} className="space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                value={senhaForm.senhaAtual}
                onChange={(e) => setSenhaForm({ ...senhaForm, senhaAtual: e.target.value })}
                required
              />
              <Input
                label="Nova Senha"
                type="password"
                value={senhaForm.novaSenha}
                onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
                hint="Minimo 8 caracteres"
                required
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={senhaForm.confirmar}
                onChange={(e) => setSenhaForm({ ...senhaForm, confirmar: e.target.value })}
                required
              />
              {senhaErro && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">{senhaErro}</div>
              )}
              {senhaSucesso && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">{senhaSucesso}</div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setSenhaModal(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" fullWidth loading={senhaLoading}>Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
