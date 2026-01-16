import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Vendas } from './pages/Vendas';
import { Produtos } from './pages/Produtos';
import { Clientes } from './pages/Clientes';
import { Lojas } from './pages/Lojas';
import { Grupos } from './pages/Grupos';
import { Usuarios } from './pages/Usuarios';
import { Servicos } from './pages/Servicos';
import { Unidades } from './pages/Unidades';
import { Estoque } from './pages/Estoque';
import { OrdensServico } from './pages/OrdensServico';
import { Financeiro } from './pages/Financeiro';
import { Garantias } from './pages/Garantias';
import { Comissoes } from './pages/Comissoes';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <img src="/logo.png" alt="Tecle Motos" className="w-24 h-24 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'vendas':
        return <Vendas />;
      case 'produtos':
        return <Produtos />;
      case 'clientes':
        return <Clientes />;
      case 'lojas':
        return <Lojas />;
      case 'grupos':
        return <Grupos />;
      case 'usuarios':
        return <Usuarios />;
      case 'servicos':
        return <Servicos />;
      case 'unidades':
        return <Unidades />;
      case 'estoque':
        return <Estoque />;
      case 'os':
        return <OrdensServico />;
      case 'financeiro':
        return <Financeiro />;
      case 'garantias':
        return <Garantias />;
      case 'comissoes':
        return <Comissoes />;
      default:
        return (
          <div className="card">
            <h1 className="text-2xl font-bold mb-4">{currentPage}</h1>
            <p className="text-gray-400">Esta pagina esta em construcao.</p>
          </div>
        );
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
