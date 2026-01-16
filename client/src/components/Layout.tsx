import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  
  const items = menuItems[user?.role as keyof typeof menuItems] || menuItems.VENDEDOR;

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <aside className="w-64 bg-zinc-800 min-h-screen border-r border-zinc-700 flex flex-col">
        <div className="p-4 text-center border-b border-zinc-700">
          <img src="/logo.png" alt="Tecle Motos" className="w-16 h-16 mx-auto" />
        </div>
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-700">
          <div className="p-3 bg-zinc-700 rounded-lg mb-2">
            <p className="text-sm font-medium truncate">{user?.nome}</p>
            <p className="text-xs text-gray-400">{roleLabels[user?.role || ''] || user?.role}</p>
            {user?.loja && <p className="text-xs text-orange-400 truncate">{user.loja.nomeFantasia}</p>}
          </div>
          <button onClick={logout} className="btn btn-danger w-full text-sm">
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
