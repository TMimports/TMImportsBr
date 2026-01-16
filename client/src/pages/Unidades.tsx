import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Unidade {
  id: number;
  chassi: string;
  motor: string;
  cor: string;
  anoFabricacao: number;
  status: string;
  produto: { nome: string };
  loja?: { nomeFantasia: string };
}

export function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Unidade[]>('/unidades')
      .then(setUnidades)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusLabels: Record<string, string> = {
    DISPONIVEL: 'Disponivel',
    RESERVADA: 'Reservada',
    VENDIDA: 'Vendida',
    EM_TRANSITO: 'Em Transito'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Unidades Fisicas (Motos)</h1>
        <button className="btn btn-primary">+ Nova Unidade</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Chassi</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Motor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Modelo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Ano</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Loja</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {unidades.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma unidade encontrada
                </td>
              </tr>
            ) : (
              unidades.map(unidade => (
                <tr key={unidade.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{unidade.chassi}</td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{unidade.motor}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.produto?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.cor}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.anoFabricacao}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.loja?.nomeFantasia || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${unidade.status === 'DISPONIVEL' ? 'badge-success' : 'badge-warning'}`}>
                      {statusLabels[unidade.status] || unidade.status}
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
