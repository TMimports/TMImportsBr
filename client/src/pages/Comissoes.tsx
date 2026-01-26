import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Comissao {
  id: number;
  usuarioId: number;
  vendaId: number | null;
  ordemServicoId: number | null;
  tipo: string;
  valor: number;
  periodo: string;
  pago: boolean;
  dataPago: string | null;
  createdAt: string;
  usuario: { id: number; nome: string };
  venda?: { id: number };
  ordemServico?: { id: number; numero: string };
}

export function Comissoes() {
  const { user } = useAuth();
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'pagas'>('todas');

  const isAdmin = user?.role === 'ADMIN_GERAL' || user?.role === 'DONO_LOJA' || user?.role === 'GERENTE_LOJA';

  const loadData = () => {
    setLoading(true);
    api.get<Comissao[]>('/financeiro/comissoes')
      .then(setComissoes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const marcarPago = async (id: number) => {
    try {
      await api.put(`/financeiro/comissoes/${id}/pagar`, {});
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao marcar como pago');
    }
  };

  const comissoesFiltradas = comissoes.filter(c => {
    if (filtro === 'pendentes') return !c.pago;
    if (filtro === 'pagas') return c.pago;
    return true;
  });

  const totalPendente = comissoes.filter(c => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPago = comissoes.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Comissoes</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-400 text-sm">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-400">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Total Pago</p>
          <p className="text-2xl font-bold text-green-400">
            R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Filtrar</p>
          <select 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value as any)}
            className="input mt-1"
          >
            <option value="todas">Todas</option>
            <option value="pendentes">Pendentes</option>
            <option value="pagas">Pagas</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left p-3 text-gray-400">Colaborador</th>
              <th className="text-left p-3 text-gray-400">Tipo</th>
              <th className="text-left p-3 text-gray-400">Referencia</th>
              <th className="text-right p-3 text-gray-400">Valor</th>
              <th className="text-left p-3 text-gray-400">Status</th>
              <th className="text-left p-3 text-gray-400">Data</th>
              {isAdmin && <th className="text-left p-3 text-gray-400">Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {comissoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma comissao encontrada
                </td>
              </tr>
            ) : (
              comissoesFiltradas.map(com => (
                <tr key={com.id} className="border-b border-zinc-800 hover:bg-zinc-800">
                  <td className="p-3">{com.usuario?.nome}</td>
                  <td className="p-3">
                    <span className={`badge ${com.tipo === 'vendedor' ? 'badge-success' : 'badge-info'}`}>
                      {com.tipo === 'vendedor' ? 'Vendedor' : 'Tecnico'}
                    </span>
                  </td>
                  <td className="p-3">
                    {com.vendaId ? `Venda #${com.vendaId}` : com.ordemServicoId ? `OS #${com.ordemServico?.numero || com.ordemServicoId}` : '-'}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-400">
                    R$ {Number(com.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${com.pago ? 'badge-success' : 'badge-warning'}`}>
                      {com.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-400">
                    {new Date(com.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  {isAdmin && (
                    <td className="p-3">
                      {!com.pago && (
                        <button 
                          onClick={() => marcarPago(com.id)}
                          className="btn btn-sm btn-success"
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
