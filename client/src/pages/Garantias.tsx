import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Garantia {
  id: number;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  revisaoFeita: boolean;
  unidade?: { chassi: string; produto: { nome: string }; loja?: { nomeFantasia: string } } | null;
  cliente?: { nome: string; telefone?: string };
  venda?: { id: number; createdAt: string; itens?: { produto?: { nome: string; tipo: string } }[]; loja?: { nomeFantasia: string } };
}

interface ClienteGrupo {
  clienteNome: string;
  telefone: string;
  produto: string;
  vendaId: number;
  dataInicio: string;
  garantias: Garantia[];
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

  const excluirGarantia = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta garantia?')) return;
    try {
      await api.delete(`/garantias/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const garantiasFiltradas = garantias.filter(g => {
    const dias = calcularDiasRestantes(g.dataFim);
    if (filtro === 'ativas') return dias > 5;
    if (filtro === 'vencendo') return dias > 0 && dias <= 5;
    if (filtro === 'expiradas') return dias <= 0;
    return true;
  });

  const grupos: ClienteGrupo[] = [];
  for (const g of garantiasFiltradas) {
    const key = `${g.cliente?.nome || '-'}_${g.venda?.id || 0}`;
    let grupo = grupos.find(gr => `${gr.clienteNome}_${gr.vendaId}` === key);
    if (!grupo) {
      grupo = {
        clienteNome: g.cliente?.nome || '-',
        telefone: g.cliente?.telefone || '-',
        produto: g.unidade?.produto?.nome || g.venda?.itens?.find(i => i.produto?.tipo === 'MOTO')?.produto?.nome || 'Produto',
        vendaId: g.venda?.id || 0,
        dataInicio: g.dataInicio,
        garantias: []
      };
      grupos.push(grupo);
    }
    grupo.garantias.push(g);
  }

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

      {grupos.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Nenhuma garantia encontrada
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(grupo => (
            <div key={`${grupo.clienteNome}_${grupo.vendaId}`} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-400 font-bold text-lg">
                      {grupo.clienteNome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{grupo.clienteNome}</h3>
                    <p className="text-sm text-gray-400">{grupo.telefone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{grupo.produto}</p>
                  <p className="text-sm text-gray-400">Venda #{grupo.vendaId} - {new Date(grupo.dataInicio).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-zinc-800">
                      <th className="text-left py-2 px-2">Tipo</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Inicio</th>
                      <th className="text-left py-2 px-2">Vencimento</th>
                      <th className="text-center py-2 px-2">Dias Restantes</th>
                      <th className="text-center py-2 px-2">Revisao</th>
                      <th className="text-right py-2 px-2">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.garantias.map(garantia => {
                      const diasRestantes = calcularDiasRestantes(garantia.dataFim);
                      const isVencendo = diasRestantes > 0 && diasRestantes <= 5;
                      const isExpirada = diasRestantes <= 0;

                      return (
                        <tr key={garantia.id} className="border-b border-zinc-800/50 last:border-0">
                          <td className="py-2.5 px-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              garantia.tipo === 'geral' ? 'bg-blue-500/20 text-blue-400' :
                              garantia.tipo === 'motor' ? 'bg-purple-500/20 text-purple-400' :
                              garantia.tipo === 'modulo' ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {garantia.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            {isExpirada ? (
                              <span className="text-red-400 text-xs font-semibold">Expirada</span>
                            ) : isVencendo ? (
                              <span className="text-yellow-400 text-xs font-semibold">Vencendo</span>
                            ) : (
                              <span className="text-green-400 text-xs font-semibold">Ativa</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-white">
                            {new Date(garantia.dataInicio).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-2 text-white">
                            {new Date(garantia.dataFim).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`font-bold text-lg ${
                              isExpirada ? 'text-red-400' : isVencendo ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {isExpirada ? '0' : diasRestantes}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => marcarRevisao(garantia.id, !garantia.revisaoFeita)}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                garantia.revisaoFeita 
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                  : 'bg-zinc-700 text-gray-400 hover:bg-zinc-600'
                              }`}
                            >
                              {garantia.revisaoFeita ? 'Sim' : 'Nao'}
                            </button>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => excluirGarantia(garantia.id)}
                              className="px-3 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
