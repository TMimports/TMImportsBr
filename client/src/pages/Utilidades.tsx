import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

interface DetalheEstoque {
  produtoNome: string;
  quantidade: number;
}

interface EstoqueLoja {
  lojaId: number;
  lojaNome: string;
  motos: number;
  pecas: number;
  detalhesMotos: DetalheEstoque[];
  detalhesPecas: DetalheEstoque[];
  ultimaAtualizacao: string;
}

export function Utilidades() {
  const [estoques, setEstoques] = useState<EstoqueLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [expandedLoja, setExpandedLoja] = useState<number | null>(null);

  const loadData = useCallback(() => {
    api.get<EstoqueLoja[]>('/estoque/grupo')
      .then(data => {
        setEstoques(data);
        setUltimaAtualizacao(new Date());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const totalMotos = estoques.reduce((acc, e) => acc + e.motos, 0);
  const totalPecas = estoques.reduce((acc, e) => acc + e.pecas, 0);

  const toggleExpand = (lojaId: number) => {
    setExpandedLoja(expandedLoja === lojaId ? null : lojaId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Utilidades - Estoque do Grupo</h1>
        <div className="text-sm text-gray-400">
          Atualizado: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
          <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-orange-500/10 border border-orange-500/30">
          <p className="text-gray-400 text-sm">Total de Motos</p>
          <p className="text-3xl font-bold text-orange-400">{totalMotos}</p>
        </div>
        <div className="card bg-blue-500/10 border border-blue-500/30">
          <p className="text-gray-400 text-sm">Total de Pecas</p>
          <p className="text-3xl font-bold text-blue-400">{totalPecas}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Estoque por Loja</h2>
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : estoques.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Nenhuma loja encontrada no grupo
            </div>
          ) : (
            estoques.map(estoque => (
              <div key={estoque.lojaId} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(estoque.lojaId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <span className="text-white font-medium">{estoque.lojaNome}</span>
                  <div className="flex items-center gap-6">
                    <div className="text-sm">
                      <span className="text-gray-400 mr-1">Motos:</span>
                      <span className={`font-bold ${estoque.motos > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                        {estoque.motos}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400 mr-1">Pecas:</span>
                      <span className={`font-bold ${estoque.pecas > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {estoque.pecas}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedLoja === estoque.lojaId ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedLoja === estoque.lojaId && (
                  <div className="px-4 pb-4 border-t border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {estoque.detalhesMotos && estoque.detalhesMotos.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-orange-400 mb-2">Motos em Estoque</h4>
                          <div className="space-y-1">
                            {estoque.detalhesMotos.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 px-2 rounded bg-zinc-800/50">
                                <span className="text-gray-300">{item.produtoNome}</span>
                                <span className="text-white font-medium">{item.quantidade}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {estoque.detalhesPecas && estoque.detalhesPecas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Pecas em Estoque</h4>
                          <div className="space-y-1">
                            {estoque.detalhesPecas.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 px-2 rounded bg-zinc-800/50">
                                <span className="text-gray-300">{item.produtoNome}</span>
                                <span className="text-white font-medium">{item.quantidade}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!estoque.detalhesMotos || estoque.detalhesMotos.length === 0) && (!estoque.detalhesPecas || estoque.detalhesPecas.length === 0) && (
                        <div className="text-sm text-gray-500 col-span-2">Nenhum item em estoque nesta loja</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        A atualizacao e feita automaticamente a cada 30 segundos
      </div>
    </div>
  );
}
