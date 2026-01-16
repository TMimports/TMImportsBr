import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Garantia {
  id: number;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  unidade?: { chassi: string; produto: { nome: string } };
  cliente?: { nome: string };
}

export function Garantias() {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Garantia[]>('/garantias')
      .then(setGarantias)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Garantias</h1>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Unidade</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Inicio</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Fim</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {garantias.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhuma garantia encontrada
                </td>
              </tr>
            ) : (
              garantias.map(garantia => (
                <tr key={garantia.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">
                    {garantia.unidade?.produto?.nome} - {garantia.unidade?.chassi?.slice(-6)}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{garantia.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className="badge badge-primary">{garantia.tipo}</span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(garantia.dataInicio).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(garantia.dataFim).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${garantia.ativa ? 'badge-success' : 'badge-danger'}`}>
                      {garantia.ativa ? 'Ativa' : 'Expirada'}
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
