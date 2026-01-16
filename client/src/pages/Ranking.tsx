import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface RankingProduto {
  posicao: number;
  produtoId: number;
  codigo: string;
  nome: string;
  tipo: string;
  quantidadeVendida: number;
  totalVendas: number;
  faturamento: number;
}

interface RankingServico {
  posicao: number;
  servicoId: number;
  nome: string;
  duracao: number | null;
  quantidadeExecutada: number;
  totalOS: number;
  faturamento: number;
}

interface Resumo {
  periodo: number;
  produtos: {
    maisVendido: { nome: string; codigo: string; quantidade: number } | null;
    menosVendido: { nome: string; codigo: string; quantidade: number } | null;
    totalVendido: number;
  };
  servicos: {
    maisExecutado: { nome: string; quantidade: number } | null;
    menosExecutado: { nome: string; quantidade: number } | null;
    totalExecutado: number;
  };
}

export function Ranking() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30');
  const [ordem, setOrdem] = useState<'desc' | 'asc'>('desc');
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [rankingProdutos, setRankingProdutos] = useState<RankingProduto[]>([]);
  const [rankingServicos, setRankingServicos] = useState<RankingServico[]>([]);
  const [tabAtiva, setTabAtiva] = useState<'produtos' | 'servicos'>('produtos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resumoData, produtosData, servicosData] = await Promise.all([
        api.get<Resumo>(`/ranking/resumo?periodo=${periodo}`),
        api.get<RankingProduto[]>(`/ranking/produtos?periodo=${periodo}&limite=20&ordem=${ordem}`),
        api.get<RankingServico[]>(`/ranking/servicos?periodo=${periodo}&limite=20&ordem=${ordem}`)
      ]);
      setResumo(resumoData);
      setRankingProdutos(produtosData);
      setRankingServicos(servicosData);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodo, ordem]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ranking de Vendas</h1>
        <div className="flex gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="input w-40"
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
            <option value="365">Ultimo ano</option>
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as 'desc' | 'asc')}
            className="input w-40"
          >
            <option value="desc">Mais vendidos</option>
            <option value="asc">Menos vendidos</option>
          </select>
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-400">Produto Mais Vendido</p>
            <p className="text-lg font-bold text-green-400">
              {resumo.produtos.maisVendido?.nome || 'Nenhum'}
            </p>
            {resumo.produtos.maisVendido && (
              <p className="text-xs text-gray-500">
                {resumo.produtos.maisVendido.quantidade} vendas
              </p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Produto Menos Vendido</p>
            <p className="text-lg font-bold text-red-400">
              {resumo.produtos.menosVendido?.nome || 'Nenhum'}
            </p>
            {resumo.produtos.menosVendido && (
              <p className="text-xs text-gray-500">
                {resumo.produtos.menosVendido.quantidade} vendas
              </p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Servico Mais Executado</p>
            <p className="text-lg font-bold text-green-400">
              {resumo.servicos.maisExecutado?.nome || 'Nenhum'}
            </p>
            {resumo.servicos.maisExecutado && (
              <p className="text-xs text-gray-500">
                {resumo.servicos.maisExecutado.quantidade} execucoes
              </p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Servico Menos Executado</p>
            <p className="text-lg font-bold text-red-400">
              {resumo.servicos.menosExecutado?.nome || 'Nenhum'}
            </p>
            {resumo.servicos.menosExecutado && (
              <p className="text-xs text-gray-500">
                {resumo.servicos.menosExecutado.quantidade} execucoes
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTabAtiva('produtos')}
          className={`btn ${tabAtiva === 'produtos' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Produtos
        </button>
        <button
          onClick={() => setTabAtiva('servicos')}
          className={`btn ${tabAtiva === 'servicos' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Servicos
        </button>
      </div>

      {tabAtiva === 'produtos' && (
        <div className="card">
          <h3 className="text-lg font-medium mb-4">
            {ordem === 'desc' ? 'Top 20 Produtos Mais Vendidos' : 'Top 20 Produtos Menos Vendidos'}
          </h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Codigo</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Produto</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Qtd Vendida</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vendas</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {rankingProdutos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    Nenhum produto vendido no periodo
                  </td>
                </tr>
              ) : (
                rankingProdutos.map(item => (
                  <tr key={item.produtoId} className="hover:bg-zinc-700">
                    <td className="p-3 border-b border-zinc-700">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                        ${item.posicao === 1 ? 'bg-yellow-500 text-black' : ''}
                        ${item.posicao === 2 ? 'bg-gray-400 text-black' : ''}
                        ${item.posicao === 3 ? 'bg-orange-600 text-white' : ''}
                        ${item.posicao > 3 ? 'bg-zinc-700 text-white' : ''}
                      `}>
                        {item.posicao}
                      </span>
                    </td>
                    <td className="p-3 border-b border-zinc-700 font-mono text-sm">{item.codigo}</td>
                    <td className="p-3 border-b border-zinc-700">{item.nome}</td>
                    <td className="p-3 border-b border-zinc-700">
                      <span className={`badge ${item.tipo === 'MOTO' ? 'badge-primary' : 'badge-success'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="p-3 border-b border-zinc-700 font-semibold">{item.quantidadeVendida}</td>
                    <td className="p-3 border-b border-zinc-700">{item.totalVendas}</td>
                    <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                      R$ {Number(item.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tabAtiva === 'servicos' && (
        <div className="card">
          <h3 className="text-lg font-medium mb-4">
            {ordem === 'desc' ? 'Top 20 Servicos Mais Executados' : 'Top 20 Servicos Menos Executados'}
          </h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Servico</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Duracao</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Qtd Executada</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Total OS</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {rankingServicos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Nenhum servico executado no periodo
                  </td>
                </tr>
              ) : (
                rankingServicos.map(item => (
                  <tr key={item.servicoId} className="hover:bg-zinc-700">
                    <td className="p-3 border-b border-zinc-700">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                        ${item.posicao === 1 ? 'bg-yellow-500 text-black' : ''}
                        ${item.posicao === 2 ? 'bg-gray-400 text-black' : ''}
                        ${item.posicao === 3 ? 'bg-orange-600 text-white' : ''}
                        ${item.posicao > 3 ? 'bg-zinc-700 text-white' : ''}
                      `}>
                        {item.posicao}
                      </span>
                    </td>
                    <td className="p-3 border-b border-zinc-700">{item.nome}</td>
                    <td className="p-3 border-b border-zinc-700">
                      {item.duracao ? (
                        <span className="badge badge-primary">{item.duracao} min</span>
                      ) : (
                        <span className="badge badge-success">Fixo</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-zinc-700 font-semibold">{item.quantidadeExecutada}</td>
                    <td className="p-3 border-b border-zinc-700">{item.totalOS}</td>
                    <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                      R$ {Number(item.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
