import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ItemEstoque {
  id: number;
  quantidade: number;
  estoqueMinimo: number;
  produto: { nome: string; tipo: string };
  loja: { nomeFantasia: string };
}

export function Estoque() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ItemEstoque[]>('/estoque')
      .then(setEstoque)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <button className="btn btn-primary">+ Adicionar ao Estoque</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Produto</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Loja</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Quantidade</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Minimo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {estoque.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhum item no estoque
                </td>
              </tr>
            ) : (
              estoque.map(item => (
                <tr key={item.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{item.produto?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${item.produto?.tipo === 'MOTO' ? 'badge-primary' : 'badge-success'}`}>
                      {item.produto?.tipo}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">{item.loja?.nomeFantasia}</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold">{item.quantidade}</td>
                  <td className="p-3 border-b border-zinc-700">{item.estoqueMinimo}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${item.quantidade <= item.estoqueMinimo ? 'badge-danger' : 'badge-success'}`}>
                      {item.quantidade <= item.estoqueMinimo ? 'Baixo' : 'OK'}
                    </span>
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
