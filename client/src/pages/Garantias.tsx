import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Garantia {
  id: number;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  revisaoFeita: boolean;
  unidade?: { chassi: string; produto: { nome: string } };
  cliente?: { nome: string; telefone?: string };
  venda?: { id: number; createdAt: string };
}

export function Garantias() {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'vencendo' | 'expiradas'>('todas');

  const loadData = () => {
    setLoading(true);
    api.get<Garantia[]>('/garantias')
      .then(setGarantias)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const calcularDiasRestantes = (dataFim: string): number => {
    const fim = new Date(dataFim);
    const hoje = new Date();
    const diff = fim.getTime() - hoje.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const marcarRevisao = async (id: number, feita: boolean) => {
    try {
      await api.put(`/garantias/${id}/revisao`, { revisaoFeita: feita });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar');
    }
  };

  const garantiasFiltradas = garantias.filter(g => {
    const dias = calcularDiasRestantes(g.dataFim);
    if (filtro === 'ativas') return dias > 5;
    if (filtro === 'vencendo') return dias > 0 && dias <= 5;
    if (filtro === 'expiradas') return dias <= 0;
    return true;
  });

  const ativas = garantias.filter(g => calcularDiasRestantes(g.dataFim) > 5).length;
  const vencendo = garantias.filter(g => {
    const dias = calcularDiasRestantes(g.dataFim);
    return dias > 0 && dias <= 5;
  }).length;
  const expiradas = garantias.filter(g => calcularDiasRestantes(g.dataFim) <= 0).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Garantias</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`card cursor-pointer ${filtro === 'todas' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold">{garantias.length}</p>
        </div>
        <div 
          className={`card cursor-pointer ${filtro === 'ativas' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFiltro('ativas')}
        >
          <p className="text-gray-400 text-sm">Ativas</p>
          <p className="text-2xl font-bold text-green-400">{ativas}</p>
        </div>
        <div 
          className={`card cursor-pointer ${filtro === 'vencendo' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFiltro('vencendo')}
        >
          <p className="text-gray-400 text-sm">Vencendo em 5 dias</p>
          <p className="text-2xl font-bold text-yellow-400">{vencendo}</p>
        </div>
        <div 
          className={`card cursor-pointer ${filtro === 'expiradas' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFiltro('expiradas')}
        >
          <p className="text-gray-400 text-sm">Expiradas</p>
          <p className="text-2xl font-bold text-red-400">{expiradas}</p>
        </div>
      </div>

      {vencendo > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 font-semibold">
            Atencao! {vencendo} garantia(s) vencem nos proximos 5 dias. O cliente precisa fazer a revisao para manter a garantia.
          </p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Unidade</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Telefone</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Inicio</th>
              <th className="text-center p-3 border-b border-zinc-700 text-gray-400">Dias Restantes</th>
              <th className="text-center p-3 border-b border-zinc-700 text-gray-400">Revisao Feita</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {garantiasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Nenhuma garantia encontrada
                </td>
              </tr>
            ) : (
              garantiasFiltradas.map(garantia => {
                const diasRestantes = calcularDiasRestantes(garantia.dataFim);
                const vencendo = diasRestantes > 0 && diasRestantes <= 5;
                const expirada = diasRestantes <= 0;
                
                return (
                  <tr key={garantia.id} className={`hover:bg-zinc-700 ${vencendo ? 'bg-yellow-500/10' : ''}`}>
                    <td className="p-3 border-b border-zinc-700">
                      {garantia.unidade?.produto?.nome} - {garantia.unidade?.chassi?.slice(-6)}
                    </td>
                    <td className="p-3 border-b border-zinc-700">{garantia.cliente?.nome}</td>
                    <td className="p-3 border-b border-zinc-700">{garantia.cliente?.telefone || '-'}</td>
                    <td className="p-3 border-b border-zinc-700">
                      <span className="badge badge-primary">{garantia.tipo}</span>
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      {new Date(garantia.dataInicio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 border-b border-zinc-700 text-center">
                      <span className={`text-xl font-bold ${
                        expirada ? 'text-red-400' : 
                        vencendo ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        {expirada ? '0' : diasRestantes}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">dias</span>
                    </td>
                    <td className="p-3 border-b border-zinc-700 text-center">
                      <button
                        onClick={() => marcarRevisao(garantia.id, !garantia.revisaoFeita)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                          garantia.revisaoFeita 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-zinc-700 text-gray-400 hover:bg-zinc-600'
                        }`}
                      >
                        {garantia.revisaoFeita ? 'Sim' : 'Nao'}
                      </button>
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      {expirada ? (
                        <span className="badge badge-danger">Expirada</span>
                      ) : !garantia.revisaoFeita && vencendo ? (
                        <span className="badge badge-warning">Vencendo!</span>
                      ) : (
                        <span className="badge badge-success">Ativa</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
