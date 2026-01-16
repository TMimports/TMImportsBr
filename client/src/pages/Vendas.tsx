import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Venda {
  id: number;
  tipo: string;
  cliente: { nome: string };
  vendedor: { nome: string };
  valorTotal: number;
  formaPagamento: string;
  confirmadaFinanceiro: boolean;
  createdAt: string;
}

export function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Venda[]>('/vendas')
      .then(setVendas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <button className="btn btn-primary">+ Nova Venda</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vendedor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Pagamento</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma venda encontrada
                </td>
              </tr>
            ) : (
              vendas.map(venda => (
                <tr key={venda.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{venda.id}</td>
                  <td className="p-3 border-b border-zinc-700">{venda.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{venda.vendedor?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    R$ {Number(venda.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{venda.formaPagamento}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${venda.confirmadaFinanceiro ? 'badge-success' : 'badge-warning'}`}>
                      {venda.confirmadaFinanceiro ? 'Confirmada' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
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
