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
  key: string;
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
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const loadData = () => {
    setLoading(true);
    api.get<Garantia[]>('/garantias')
      .then(setGarantias)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const calcularDiasRestantes = (dataFim: string): number => {
    const fim = new Date(dataFim);
    const hoje = new Date();
    const diff = fim.getTime() - hoje.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
    if (!g.ativa) return false;
    const dias = calcularDiasRestantes(g.dataFim);
    if (filtro === 'ativas') return dias > 5;
    if (filtro === 'vencendo') return dias > 0 && dias <= 5;
    if (filtro === 'expiradas') return dias <= 0;
    return true;
  });

  const grupos: ClienteGrupo[] = [];
  for (const g of garantiasFiltradas) {
    const key = `${g.cliente?.nome || '-'}_${g.venda?.id || 0}`;
    let grupo = grupos.find(gr => gr.key === key);
    if (!grupo) {
      grupo = {
        key,
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

  const garantiasAtivas = garantias.filter(g => g.ativa);
  const ativas = garantiasAtivas.filter(g => calcularDiasRestantes(g.dataFim) > 5).length;
  const vencendo = garantiasAtivas.filter(g => {
    const dias = calcularDiasRestantes(g.dataFim);
    return dias > 0 && dias <= 5;
  }).length;
  const expiradas = garantiasAtivas.filter(g => calcularDiasRestantes(g.dataFim) <= 0).length;

  const getStatusGrupo = (grupo: ClienteGrupo) => {
    const temExpirada = grupo.garantias.some(g => calcularDiasRestantes(g.dataFim) <= 0);
    const temVencendo = grupo.garantias.some(g => {
      const d = calcularDiasRestantes(g.dataFim);
      return d > 0 && d <= 5;
    });
    if (temExpirada) return 'expirada';
    if (temVencendo) return 'vencendo';
    return 'ativa';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Garantias</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`card cursor-pointer ${filtro === 'todas' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold">{garantiasAtivas.length}</p>
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
        <div className="space-y-3">
          {grupos.map(grupo => {
            const isExpanded = expandidos.has(grupo.key);
            const status = getStatusGrupo(grupo);
            const qtdGarantias = grupo.garantias.length;

            return (
              <div key={grupo.key} className={`card overflow-hidden ${
                status === 'expirada' ? 'border-red-500/30' : 
                status === 'vencendo' ? 'border-yellow-500/30' : ''
              }`}>
                <div 
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleExpandido(grupo.key)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      status === 'expirada' ? 'bg-red-500/20' :
                      status === 'vencendo' ? 'bg-yellow-500/20' :
                      'bg-orange-500/20'
                    }`}>
                      <span className={`font-bold text-base ${
                        status === 'expirada' ? 'text-red-400' :
                        status === 'vencendo' ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {grupo.clienteNome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{grupo.clienteNome}</h3>
                      <p className="text-xs text-gray-400">{grupo.telefone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-white text-sm font-medium">{grupo.produto}</p>
                      <p className="text-xs text-gray-400">Venda #{grupo.vendaId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        status === 'expirada' ? 'bg-red-500/20 text-red-400' :
                        status === 'vencendo' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {qtdGarantias} garantia{qtdGarantias > 1 ? 's' : ''}
                      </span>
                      <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        &#9660;
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm sm:hidden">
                      <div>
                        <p className="text-gray-500 text-xs">Produto</p>
                        <p className="text-white">{grupo.produto}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Venda</p>
                        <p className="text-white">#{grupo.vendaId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Data</p>
                        <p className="text-white">{new Date(grupo.dataInicio).toLocaleDateString('pt-BR')}</p>
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
                                    onClick={(e) => { e.stopPropagation(); marcarRevisao(garantia.id, !garantia.revisaoFeita); }}
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
                                    onClick={(e) => { e.stopPropagation(); excluirGarantia(garantia.id); }}
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

                    <div className="mt-4 pt-3 border-t border-zinc-700">
                      <h4 className="text-xs font-semibold text-gray-400 mb-2">Cronograma de Revisoes (a cada 3 meses)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[90, 180, 270, 360].map((dias, idx) => {
                          const dataRevisao = new Date(grupo.dataInicio);
                          dataRevisao.setDate(dataRevisao.getDate() + dias);
                          const hoje = new Date();
                          const diffMs = dataRevisao.getTime() - hoje.getTime();
                          const diasFaltam = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                          const realizada = diasFaltam < 0;
                          const proxima = !realizada && diasFaltam <= 30;
                          return (
                            <div key={dias} className={`p-2 rounded-lg text-center ${
                              realizada ? 'bg-zinc-800/50' :
                              proxima ? 'bg-yellow-500/10 border border-yellow-500/30' :
                              'bg-zinc-800/30'
                            }`}>
                              <p className="text-xs text-gray-500">{idx + 1}a Revisao ({dias} dias)</p>
                              <p className="text-sm font-semibold text-white mt-0.5">
                                {dataRevisao.toLocaleDateString('pt-BR')}
                              </p>
                              {realizada ? (
                                <p className="text-xs text-gray-500 mt-0.5">Periodo encerrado</p>
                              ) : (
                                <p className={`text-xs font-bold mt-0.5 ${
                                  diasFaltam <= 7 ? 'text-red-400' :
                                  diasFaltam <= 30 ? 'text-yellow-400' :
                                  'text-green-400'
                                }`}>
                                  {diasFaltam} dias restantes
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
