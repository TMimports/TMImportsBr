import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from './ui';
import { Button } from './ui';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

// ─── Menu structure ───────────────────────────────────────────────────────────

interface NavItem {
  type: 'item';
  id: string;
  label: string;
  icon: string;
}

interface NavGroup {
  type: 'group';
  id: string;
  label: string;
  icon: string;
  items: Omit<NavItem, 'type'>[];
}

type NavEntry = NavItem | NavGroup;

function item(id: string, label: string, icon: string): NavItem {
  return { type: 'item', id, label, icon };
}
function group(id: string, label: string, icon: string, items: Omit<NavItem, 'type'>[]): NavGroup {
  return { type: 'group', id, label, icon, items };
}

// Vendas group — Clientes incluído dentro
const VENDAS_GROUP = (vendorLabel = 'Vendas') =>
  group('vendas-group', vendorLabel, '💰', [
    { id: 'clientes',    label: 'Clientes',    icon: '👤' },
    { id: 'vendas',      label: vendorLabel === 'Vendas' ? 'Vendas' : 'Minhas Vendas', icon: '🛍️' },
    { id: 'os',          label: vendorLabel === 'Vendas' ? 'Ordens de Serviço' : 'Minhas OS', icon: '🔩' },
    { id: 'garantias',   label: 'Garantias',   icon: '📜' },
    { id: 'comissoes',   label: vendorLabel === 'Vendas' ? 'Comissões' : 'Minhas Comissões', icon: '💸' },
    { id: 'utilidades',  label: 'Utilidades',  icon: '🔄' },
  ]);

// Logística — Produtos, Serviços, Estoque
const LOGISTICA_GROUP = group('logistica-group', 'Logística', '📦', [
  { id: 'produtos',  label: 'Produtos',  icon: '🏍️' },
  { id: 'servicos',  label: 'Serviços',  icon: '🔧' },
  { id: 'estoque',   label: 'Estoque',   icon: '📋' },
]);

// Financeiro — Pedidos de Compra incluído dentro
const FIN_GROUP = group('fin-group', 'Financeiro', '💵', [
  { id: 'pedidos-compra',      label: 'Pedidos de Compra',  icon: '🛒' },
  { id: 'financeiro',          label: 'Contas a Pagar',     icon: '📤' },
  { id: 'contas-receber',      label: 'Contas a Receber',   icon: '📥' },
  { id: 'plano-contas',        label: 'Plano de Contas',    icon: '🏷' },
]);

// Configurações — Usuários incluído dentro
const CONFIG_GROUP = group('config-group', 'Configurações', '⚙️', [
  { id: 'usuarios',      label: 'Usuários',      icon: '👥' },
  { id: 'configuracoes', label: 'Configurações', icon: '🔩' },
]);

const menuItems: Record<string, NavEntry[]> = {
  ADMIN_GERAL: [
    item('dashboard',  'Dashboard', '📊'),
    item('lojas',      'Lojas',     '🏪'),
    LOGISTICA_GROUP,
    VENDAS_GROUP(),
    FIN_GROUP,
    CONFIG_GROUP,
  ],
  ADMIN_FINANCEIRO: [
    item('dashboard', 'Dashboard', '📊'),
    item('estoque',   'Estoque',   '📋'),
    FIN_GROUP,
    item('comissoes', 'Comissões', '💸'),
  ],
  ADMIN_REDE: [
    item('dashboard', 'Dashboard', '📊'),
    item('lojas',     'Lojas',     '🏪'),
    item('usuarios',  'Usuários',  '👥'),
  ],
  DONO_LOJA: [
    item('dashboard', 'Dashboard', '📊'),
    item('estoque',   'Estoque',   '📋'),
    VENDAS_GROUP(),
    FIN_GROUP,
    CONFIG_GROUP,
  ],
  GERENTE_LOJA: [
    item('dashboard', 'Dashboard', '📊'),
    item('estoque',   'Estoque',   '📋'),
    VENDAS_GROUP(),
    FIN_GROUP,
  ],
  VENDEDOR: [
    item('dashboard', 'Dashboard', '📊'),
    item('estoque',   'Estoque',   '📋'),
    VENDAS_GROUP('Minhas Vendas'),
  ],
};

const roleLabels: Record<string, string> = {
  ADMIN_GERAL:      'Admin Geral',
  ADMIN_FINANCEIRO: 'Admin Financeiro',
  ADMIN_REDE:       'Admin Rede',
  DONO_LOJA:        'Dono de Loja',
  GERENTE_LOJA:     'Gerente',
  VENDEDOR:         'Vendedor',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupContainsPage(g: NavGroup, page: string) {
  return g.items.some(i => i.id === page);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [collapsed, setCollapsed]   = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // Which groups are open (by group id)
  const entries = menuItems[user?.role as keyof typeof menuItems] || menuItems.VENDEDOR;
  const initialOpen = entries
    .filter((e): e is NavGroup => e.type === 'group' && groupContainsPage(e, currentPage))
    .map(g => g.id);
  const [openGroups, setOpenGroups] = useState<string[]>(initialOpen);

  // Auto-open group when navigating into it
  useEffect(() => {
    entries.forEach(e => {
      if (e.type === 'group' && groupContainsPage(e, currentPage)) {
        setOpenGroups(prev => prev.includes(e.id) ? prev : [...prev, e.id]);
      }
    });
  }, [currentPage]);

  const [senhaModal,   setSenhaModal]   = useState(false);
  const [senhaForm,    setSenhaForm]    = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [senhaErro,    setSenhaErro]    = useState('');
  const [senhaSucesso, setSenhaSucesso] = useState('');
  const [senhaLoading, setSenhaLoading] = useState(false);

  const handleNavigate = (page: string) => { onNavigate(page); setMenuOpen(false); };

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaErro(''); setSenhaSucesso('');
    if (senhaForm.novaSenha !== senhaForm.confirmar) { setSenhaErro('Nova senha e confirmação não conferem'); return; }
    if (senhaForm.novaSenha.length < 8) { setSenhaErro('Nova senha deve ter no mínimo 8 caracteres'); return; }
    setSenhaLoading(true);
    try {
      const r = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ senhaAtual: senhaForm.senhaAtual, novaSenha: senhaForm.novaSenha, confirmarSenha: senhaForm.confirmar }),
      });
      const d = await r.json();
      if (!r.ok) { setSenhaErro(d.error || 'Erro ao trocar senha'); return; }
      setSenhaSucesso('Senha alterada com sucesso!');
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
      setTimeout(() => { setSenhaModal(false); setSenhaSucesso(''); }, 1500);
    } catch { setSenhaErro('Erro de conexão com o servidor'); }
    finally { setSenhaLoading(false); }
  };

  // ── Tooltip wrapper ──────────────────────────────────────────────────────────
  function Tooltip({ label, children: ch }: { label: string; children: ReactNode }) {
    return (
      <div className="relative group/tip">
        {ch}
        {collapsed && (
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-[70]
            opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
            <div className="bg-zinc-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-md
              whitespace-nowrap shadow-xl border border-zinc-700">
              {label}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Single nav item ──────────────────────────────────────────────────────────
  function NavBtn({ id, label, icon, indent = false }: { id: string; label: string; icon: string; indent?: boolean }) {
    const active = currentPage === id;
    return (
      <Tooltip label={label}>
        <button
          onClick={() => handleNavigate(id)}
          className={`
            w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150 text-left
            ${collapsed ? 'justify-center px-0 py-2' : indent ? 'gap-2 pl-7 pr-2.5 py-1.5' : 'gap-2.5 px-2.5 py-2'}
            ${active
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : indent
                ? 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }
          `}
        >
          <span className={`shrink-0 ${indent && !collapsed ? 'text-sm' : 'text-base'}`}>{icon}</span>
          {!collapsed && <span className="truncate">{label}</span>}
        </button>
      </Tooltip>
    );
  }

  // ── Group (section) ──────────────────────────────────────────────────────────
  function NavGroupSection({ g }: { g: NavGroup }) {
    const isOpen       = openGroups.includes(g.id);
    const hasActive    = groupContainsPage(g, currentPage);

    if (collapsed) {
      // In icon-only mode: show group icon, hovering reveals a flyout panel
      return (
        <div className="relative group/flyout">
          <button
            className={`w-full flex justify-center items-center py-2 rounded-lg transition-colors
              ${hasActive ? 'text-orange-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          >
            <span className="text-base">{g.icon}</span>
          </button>
          {/* Flyout */}
          <div className="pointer-events-none group-hover/flyout:pointer-events-auto
            absolute left-full top-0 ml-2.5 z-[70]
            opacity-0 group-hover/flyout:opacity-100 transition-opacity duration-150">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1.5 min-w-44">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 pb-1">{g.label}</p>
              {g.items.map(it => (
                <button key={it.id}
                  onClick={() => handleNavigate(it.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors
                    ${currentPage === it.id ? 'text-orange-400' : 'text-zinc-300 hover:text-white hover:bg-zinc-700/60'}`}>
                  <span>{it.icon}</span>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Group header */}
        <button
          onClick={() => toggleGroup(g.id)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium
            transition-all duration-150 text-left
            ${hasActive ? 'text-orange-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
        >
          <span className="text-base shrink-0">{g.icon}</span>
          <span className="flex-1 truncate">{g.label}</span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {/* Sub-items */}
        {isOpen && (
          <div className="mt-0.5 space-y-0.5 border-l border-zinc-700/60 ml-4">
            {g.items.map(it => (
              <NavBtn key={it.id} id={it.id} label={it.label} icon={it.icon} indent />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300
          ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        bg-zinc-900 min-h-screen border-r border-zinc-800 flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-52'}
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
          {/* Collapse toggle desktop */}
          <button onClick={toggleCollapsed} title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-zinc-500
              hover:text-white hover:bg-zinc-800 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              }
            </svg>
          </button>
          {/* Close mobile */}
          <button onClick={() => setMenuOpen(false)}
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {entries.map(entry =>
            entry.type === 'group'
              ? <NavGroupSection key={entry.id} g={entry} />
              : <NavBtn key={entry.id} id={entry.id} label={entry.label} icon={entry.icon} />
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-2 border-t border-zinc-800 space-y-1">
          {!collapsed && (
            <div className="px-2 py-2 bg-zinc-800/50 rounded-lg mb-1">
              <p className="text-xs font-semibold text-white truncate">{user?.nome}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{roleLabels[user?.role || ''] || user?.role}</p>
              {user?.loja && <p className="text-[10px] text-orange-400 mt-0.5 truncate">{user.loja.nomeFantasia}</p>}
            </div>
          )}

          {/* Alterar senha */}
          <Tooltip label="Alterar Senha">
            <button
              onClick={() => { setSenhaModal(true); setSenhaErro(''); setSenhaSucesso(''); setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' }); }}
              className={`w-full flex items-center rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors
                ${collapsed ? 'justify-center py-2.5' : 'gap-2 px-2.5 py-2'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {!collapsed && <span>Alterar Senha</span>}
            </button>
          </Tooltip>

          {/* Sair */}
          <Tooltip label="Sair do Sistema">
            <button onClick={logout}
              className={`w-full flex items-center rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors
                ${collapsed ? 'justify-center py-2.5' : 'gap-2 px-2.5 py-2'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!collapsed && <span>Sair do Sistema</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMenuOpen(true)}
            className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-zinc-800 transition-colors">
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
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Modal Alterar Senha */}
      {senhaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSenhaModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Alterar Senha</h2>
            <form onSubmit={handleTrocarSenha} className="space-y-4">
              <Input label="Senha Atual" type="password" value={senhaForm.senhaAtual}
                onChange={e => setSenhaForm({ ...senhaForm, senhaAtual: e.target.value })} required />
              <Input label="Nova Senha" type="password" value={senhaForm.novaSenha}
                onChange={e => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
                hint="Mínimo 8 caracteres" required />
              <Input label="Confirmar Nova Senha" type="password" value={senhaForm.confirmar}
                onChange={e => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required />
              {senhaErro    && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">{senhaErro}</div>}
              {senhaSucesso && <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">{senhaSucesso}</div>}
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
