import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DashboardData {
  vendasMes: { total: number; quantidade: number };
  osMes: { total: number; quantidade: number };
  alertasEstoque: number;
  contasVencer: { hoje: number; em3dias: number; em7dias: number };
  fluxoCaixa: { entradas: number; saidas: number; saldo: number };
  comissoesPendentes?: number;
}

interface LojaComparativo {
  lojaId: number;
  lojaNome: string;
  grupoNome: string;
  vendas: { total: number; quantidade: number };
  os: { total: number; quantidade: number };
  faturamento: number;
  fluxo: { entradas: number; saidas: number; saldo: number };
}

interface Loja {
  id: number;
  nome: string;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaFiltro, setLojaFiltro] = useState<string>('');
  const [comparativo, setComparativo] = useState<LojaComparativo[]>([]);
  const [showComparativo, setShowComparativo] = useState(false);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);

  const isAdminGlobal = user?.role === 'ADMIN_GERAL';
  const isAdminRede = user?.role === 'ADMIN_REDE';
  const isDonoLoja = user?.role === 'DONO_LOJA';
  const canCompare = isAdminGlobal || isAdminRede || isDonoLoja;

  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      const event = new CustomEvent('navigate', { detail: page });
      window.dispatchEvent(event);
    }
  };

  useEffect(() => {
    if (canCompare) {
      api.get<Loja[]>('/lojas').then(setLojas).catch(console.error);
    }
  }, [canCompare]);

  useEffect(() => {
    setLoading(true);
    const params = lojaFiltro ? `?lojaId=${lojaFiltro}` : '';
    
    Promise.all([
      api.get<DashboardData>(`/dashboard${params}`),
      api.get<any[]>('/financeiro/comissoes')
    ]).then(([dashData, comissoes]) => {
      setData(dashData);
      const pendentes = comissoes.filter(c => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0);
      setComissoesPendentes(pendentes);
    }).catch(console.error).finally(() => setLoading(false));
  }, [lojaFiltro]);

  const loadComparativo = async () => {
    try {
      const dados = await api.get<LojaComparativo[]>('/dashboard/comparativo-lojas');
      setComparativo(dados);
      setShowComparativo(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Bem-vindo, {user?.nome}!</p>
        </div>
        {canCompare && (
          <div className="flex gap-3 items-center">
            <select
              value={lojaFiltro}
              onChange={(e) => setLojaFiltro(e.target.value)}
              className="input w-48"
            >
              <option value="">Todas as lojas</option>
              {lojas.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
            <button onClick={loadComparativo} className="btn btn-secondary">
              Comparar Lojas
            </button>
          </div>
        )}
      </div>

      {(data?.contasVencer?.hoje || 0) > 0 && (
        <div 
          onClick={() => navigateTo('financeiro')}
          className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3 cursor-pointer hover:bg-red-900/50 transition"
        >
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-bold text-red-400">Atencao! {data?.contasVencer?.hoje} conta(s) vencendo HOJE!</p>
            <p className="text-sm text-gray-400">Clique para acessar o financeiro</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => navigateTo('vendas')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <p className="text-gray-400 text-sm">Vendas do Mes</p>
              <p className="text-2xl font-bold">R$ {Number(data?.vendasMes?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-500">{data?.vendasMes?.quantidade || 0} vendas</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('os')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
              🔧
            </div>
            <div>
              <p className="text-gray-400 text-sm">OS do Mes</p>
              <p className="text-2xl font-bold">R$ {Number(data?.osMes?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-gray-500">{data?.osMes?.quantidade || 0} ordens</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('estoque')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-gray-400 text-sm">Alertas de Estoque</p>
              <p className="text-2xl font-bold">{data?.alertasEstoque || 0}</p>
              <p className="text-sm text-gray-500">itens abaixo do minimo</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('financeiro')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-2xl">
              📅
            </div>
            <div>
              <p className="text-gray-400 text-sm">Contas a Vencer</p>
              <div className="flex gap-3 mt-1">
                <span className={`text-xs px-2 py-1 rounded ${(data?.contasVencer?.hoje || 0) > 0 ? 'bg-red-500' : 'bg-zinc-700'}`}>
                  Hoje: {data?.contasVencer?.hoje || 0}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${(data?.contasVencer?.em3dias || 0) > 0 ? 'bg-yellow-600' : 'bg-zinc-700'}`}>
                  3d: {data?.contasVencer?.em3dias || 0}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-zinc-700">
                  7d: {data?.contasVencer?.em7dias || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div 
          onClick={() => navigateTo('comissoes')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
              💸
            </div>
            <div>
              <p className="text-gray-400 text-sm">Comissoes a Pagar</p>
              <p className="text-2xl font-bold text-purple-400">
                R$ {comissoesPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500">Clique para ver detalhes</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('contas-receber')}
          className="card cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-2xl">
              💳
            </div>
            <div>
              <p className="text-gray-400 text-sm">Contas a Receber</p>
              <p className="text-sm text-gray-500">Clique para acessar</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Fluxo de Caixa do Mes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
              ↗️
            </div>
            <div>
              <p className="text-gray-400 text-sm">Entradas</p>
              <p className="text-2xl font-bold text-green-400">
                R$ {Number(data?.fluxoCaixa?.entradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-2xl">
              ↘️
            </div>
            <div>
              <p className="text-gray-400 text-sm">Saidas</p>
              <p className="text-2xl font-bold text-red-400">
                R$ {Number(data?.fluxoCaixa?.saidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-gray-400 text-sm">Saldo</p>
              <p className={`text-2xl font-bold ${(data?.fluxoCaixa?.saldo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {Number(data?.fluxoCaixa?.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showComparativo && comparativo.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Comparativo entre Lojas</h2>
            <button onClick={() => setShowComparativo(false)} className="text-gray-400 hover:text-white">
              Fechar
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-3 text-gray-400">Loja</th>
                  <th className="text-right p-3 text-gray-400">Vendas</th>
                  <th className="text-right p-3 text-gray-400">OS</th>
                  <th className="text-right p-3 text-gray-400">Faturamento</th>
                  <th className="text-right p-3 text-gray-400">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map(loja => (
                  <tr key={loja.lojaId} className="border-b border-zinc-800">
                    <td className="p-3">
                      <p className="font-semibold">{loja.lojaNome}</p>
                      <p className="text-xs text-gray-500">{loja.grupoNome}</p>
                    </td>
                    <td className="p-3 text-right">
                      <p className="font-semibold">R$ {Number(loja.vendas.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">{loja.vendas.quantidade} vendas</p>
                    </td>
                    <td className="p-3 text-right">
                      <p className="font-semibold">R$ {Number(loja.os.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">{loja.os.quantidade} OS</p>
                    </td>
                    <td className="p-3 text-right text-green-400 font-semibold">
                      R$ {Number(loja.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-3 text-right font-semibold ${loja.fluxo.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {Number(loja.fluxo.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
