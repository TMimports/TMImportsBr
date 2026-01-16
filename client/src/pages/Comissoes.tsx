import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Comissao {
  id: number;
  valor: number;
  tipo: string;
  pago: boolean;
  createdAt: string;
  usuario: { nome: string };
  venda?: { id: number };
  ordemServico?: { id: number };
}

export function Comissoes() {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Comissao[]>('/comissoes')
      .then(setComissoes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  const totalPendente = comissoes.filter(c => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPago = comissoes.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Comissoes</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Usuario</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Origem</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {comissoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhuma comissao encontrada
                </td>
              </tr>
            ) : (
              comissoes.map(comissao => (
                <tr key={comissao.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{comissao.usuario?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    {comissao.venda ? `Venda #${comissao.venda.id}` : comissao.ordemServico ? `OS #${comissao.ordemServico.id}` : '-'}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className="badge badge-primary">{comissao.tipo}</span>
                  </td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(comissao.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(comissao.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${comissao.pago ? 'badge-success' : 'badge-warning'}`}>
                      {comissao.pago ? 'Pago' : 'Pendente'}
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
