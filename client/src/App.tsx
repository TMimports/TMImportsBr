import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { TrocarSenha } from './pages/TrocarSenha';
import { Dashboard } from './pages/Dashboard';
import { Vendas } from './pages/Vendas';
import { Produtos } from './pages/Produtos';
import { Clientes } from './pages/Clientes';
import { Lojas } from './pages/Lojas';
import { Grupos } from './pages/Grupos';
import { Usuarios } from './pages/Usuarios';
import { Servicos } from './pages/Servicos';

import { Estoque } from './pages/Estoque';
import { OrdensServico } from './pages/OrdensServico';
import { Financeiro } from './pages/Financeiro';
import { Garantias } from './pages/Garantias';
import { Comissoes } from './pages/Comissoes';
import { Ranking } from './pages/Ranking';
import { ContasReceber } from './pages/ContasReceber';
import { Configuracoes } from './pages/Configuracoes';
import { Utilidades } from './pages/Utilidades';
import { PedidosCompra } from './pages/PedidosCompra';
import { CategoriasDepartamentos } from './pages/CategoriasDepartamentos';
import { Fornecedores } from './pages/Fornecedores';
import { NotasFiscais } from './pages/NotasFiscais';
import { DashboardEmpresa } from './pages/DashboardEmpresa';
import { InstallBanner } from './components/InstallBanner';

function AppContent() {
  const { user, loading, mustChangePassword, refreshUser } = useAuth();
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

  if (mustChangePassword) {
    return <TrocarSenha onSuccess={refreshUser} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'ranking':
        return <Ranking />;
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
        return <div className="card p-8 text-center text-gray-500">Módulo descontinuado. Utilize o Estoque.</div>;
      case 'estoque':
        return <Estoque />;
      case 'pedidos-compra':
        return <PedidosCompra />;
      case 'os':
        return <OrdensServico />;
      case 'financeiro':
        return <Financeiro />;
      case 'garantias':
        return <Garantias />;
      case 'comissoes':
        return <Comissoes />;
      case 'contas-receber':
        return <ContasReceber />;
      case 'plano-contas':
        return <CategoriasDepartamentos />;
      case 'fornecedores':
        return <Fornecedores />;
      case 'notas-fiscais':
        return <NotasFiscais />;
      case 'dashboard-empresa':
        return <DashboardEmpresa />;
      case 'configuracoes':
        return <Configuracoes />;
      case 'utilidades':
        return <Utilidades />;
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
      <InstallBanner />
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
