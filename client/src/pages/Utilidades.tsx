import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

interface EstoqueLoja {
  lojaId: number;
  lojaNome: string;
  motos: number;
  pecas: number;
  ultimaAtualizacao: string;
}

export function Utilidades() {
  const [estoques, setEstoques] = useState<EstoqueLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">Loja</th>
                <th className="pb-3 font-medium text-center">Motos</th>
                <th className="pb-3 font-medium text-center">Pecas</th>
                <th className="pb-3 font-medium text-right">Ultima Atualizacao</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : estoques.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Nenhuma loja encontrada no grupo
                  </td>
                </tr>
              ) : (
                estoques.map(estoque => (
                  <tr key={estoque.lojaId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-4 text-white font-medium">{estoque.lojaNome}</td>
                    <td className="py-4 text-center">
                      <span className={`text-lg font-bold ${estoque.motos > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                        {estoque.motos}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`text-lg font-bold ${estoque.pecas > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {estoque.pecas}
                      </span>
                    </td>
                    <td className="py-4 text-right text-gray-400">
                      {new Date(estoque.ultimaAtualizacao).toLocaleTimeString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        A atualizacao e feita automaticamente a cada 30 segundos
      </div>
    </div>
  );
}
