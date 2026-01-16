import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  custo: number;
  percentualLucro: number;
  preco: number;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Produto[]>('/produtos')
      .then(setProdutos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button className="btn btn-primary">+ Novo Produto</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Código</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Custo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Lucro %</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Preço</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              produtos.map(produto => (
                <tr key={produto.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{produto.codigo}</td>
                  <td className="p-3 border-b border-zinc-700">{produto.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${produto.tipo === 'MOTO' ? 'badge-primary' : 'badge-success'}`}>
                      {produto.tipo}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    R$ {Number(produto.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{Number(produto.percentualLucro).toFixed(2)}%</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
