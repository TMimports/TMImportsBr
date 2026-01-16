import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardData {
  vendasMes: { total: number; quantidade: number };
  osMes: { total: number; quantidade: number };
  alertasEstoque: number;
  contasVencer: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-400 mb-8">Bem-vindo, {user?.nome}!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <p className="text-gray-400 text-sm">Vendas do Mês</p>
              <p className="text-2xl font-bold">R$ {Number(data?.vendasMes?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-500">{data?.vendasMes?.quantidade || 0} vendas</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
              🔧
            </div>
            <div>
              <p className="text-gray-400 text-sm">OS do Mês</p>
              <p className="text-2xl font-bold">R$ {Number(data?.osMes?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-500">{data?.osMes?.quantidade || 0} ordens</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-gray-400 text-sm">Alertas de Estoque</p>
              <p className="text-2xl font-bold">{data?.alertasEstoque || 0}</p>
              <p className="text-sm text-gray-500">itens abaixo do mínimo</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-2xl">
              📅
            </div>
            <div>
              <p className="text-gray-400 text-sm">Contas a Vencer</p>
              <p className="text-2xl font-bold">{data?.contasVencer || 0}</p>
              <p className="text-sm text-gray-500">próximos 5 dias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
