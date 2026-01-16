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
    { id: 'os', label: 'Ordens de Serviço', icon: '🔩' },
    { id: 'financeiro', label: 'Financeiro', icon: '💵' },
    { id: 'comissoes', label: 'Comissões', icon: '💸' },
  ],
  GERENTE_LOJA: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Vendas', icon: '💰' },
    { id: 'os', label: 'Ordens de Serviço', icon: '🔩' },
    { id: 'financeiro', label: 'Financeiro', icon: '💵' },
  ],
  VENDEDOR: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👤' },
    { id: 'vendas', label: 'Minhas Vendas', icon: '💰' },
    { id: 'os', label: 'Minhas OS', icon: '🔩' },
    { id: 'comissoes', label: 'Minhas Comissões', icon: '💸' },
  ],
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  
  const items = menuItems[user?.role as keyof typeof menuItems] || menuItems.VENDEDOR;

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <aside className="sidebar">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Tecle Motos" className="w-20 h-20 mx-auto" />
        </div>
        
        <nav className="space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-zinc-700 rounded-lg mb-2">
            <p className="text-sm font-medium">{user?.nome}</p>
            <p className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</p>
            {user?.loja && <p className="text-xs text-orange-400">{user.loja.nomeFantasia}</p>}
          </div>
          <button onClick={logout} className="btn btn-danger w-full">
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
