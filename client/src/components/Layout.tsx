import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = {
  ADMIN_GERAL: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
    { id: 'lojas', label: 'Lojas', icon: '🏪' },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
    { id: 'produtos', label: 'Produtos', icon: '📦' },
    { id: 'servicos', label: 'Servicos', icon: '🔧' },
    { id: 'unidades', label: 'Unidades (Motos)', icon: '🏍️' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Financeiro', icon: '💵' },
    { id: 'garantias', label: 'Garantias', icon: '📜' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
  ],
  ADMIN_REDE: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'lojas', label: 'Lojas', icon: '🏪' },
    { id: 'usuarios', label: 'Usuarios', icon: '👥' },
  ],
  DONO_LOJA: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'estoque', label: 'Estoque', icon: '📋' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Financeiro', icon: '💵' },
    { id: 'comissoes', label: 'Comissoes', icon: '💸' },
  ],
  GERENTE_LOJA: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Servico', icon: '🔩' },
    { id: 'financeiro', label: 'Financeiro', icon: '💵' },
  ],
  VENDEDOR: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Minhas Vendas', icon: '💰' },
    { id: 'os', label: 'Minhas OS', icon: '🔩' },
    { id: 'comissoes', label: 'Minhas Comissoes', icon: '💸' },
  ],
};

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Admin Geral',
  ADMIN_REDE: 'Admin Rede',
  DONO_LOJA: 'Dono de Loja',
  GERENTE_LOJA: 'Gerente',
  VENDEDOR: 'Vendedor'
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const items = menuItems[user?.role as keyof typeof menuItems] || menuItems.VENDEDOR;

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-zinc-900 min-h-screen border-r border-zinc-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-16 px-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Tecle Motos" className="w-10 h-10" />
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white">Tecle Motos</p>
              <p className="text-xs text-orange-500">Sistema ERP</p>
            </div>
          </div>
          <button 
            onClick={() => setMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 text-left
                ${currentPage === item.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'text-gray-400 hover:bg-zinc-800 hover:text-white'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <div className="p-3 bg-zinc-800/50 rounded-lg mb-3">
            <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
            <p className="text-xs text-gray-500 mt-0.5">{roleLabels[user?.role || ''] || user?.role}</p>
            {user?.loja && (
              <p className="text-xs text-orange-400 mt-1 truncate">{user.loja.nomeFantasia}</p>
            )}
          </div>
          <Button variant="danger" size="sm" fullWidth onClick={logout}>
            Sair do Sistema
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
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

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
