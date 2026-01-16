import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface OrdemServico {
  id: number;
  tipo: string;
  status: string;
  valorTotal: number;
  cliente: { nome: string };
  tecnico?: { nome: string };
  createdAt: string;
}

export function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OrdemServico[]>('/os')
      .then(setOrdens)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusLabels: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANDAMENTO: 'Em Andamento',
    AGUARDANDO_PECA: 'Aguardando Peca',
    CONCLUIDA: 'Concluida',
    ENTREGUE: 'Entregue',
    CANCELADA: 'Cancelada'
  };

  const statusColors: Record<string, string> = {
    ABERTA: 'badge-primary',
    EM_ANDAMENTO: 'badge-warning',
    AGUARDANDO_PECA: 'badge-danger',
    CONCLUIDA: 'badge-success',
    ENTREGUE: 'badge-success',
    CANCELADA: 'badge-danger'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ordens de Servico</h1>
        <button className="btn btn-primary">+ Nova OS</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tecnico</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma OS encontrada
                </td>
              </tr>
            ) : (
              ordens.map(os => (
                <tr key={os.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{os.id}</td>
                  <td className="p-3 border-b border-zinc-700">{os.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{os.tipo}</td>
                  <td className="p-3 border-b border-zinc-700">{os.tecnico?.nome || '-'}</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${statusColors[os.status] || 'badge-primary'}`}>
                      {statusLabels[os.status] || os.status}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(os.createdAt).toLocaleDateString('pt-BR')}
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
