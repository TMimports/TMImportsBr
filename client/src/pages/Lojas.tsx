import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Loja {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  telefone: string;
  ativo: boolean;
  grupo: { nome: string };
}

export function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Loja[]>('/lojas')
      .then(setLojas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lojas</h1>
        <button className="btn btn-primary">+ Nova Loja</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome Fantasia</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">CNPJ</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Grupo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Telefone</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {lojas.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Nenhuma loja encontrada
                </td>
              </tr>
            ) : (
              lojas.map(loja => (
                <tr key={loja.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{loja.nomeFantasia || loja.razaoSocial}</td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{loja.cnpj}</td>
                  <td className="p-3 border-b border-zinc-700">{loja.grupo?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{loja.telefone || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${loja.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {loja.ativo ? 'Ativa' : 'Inativa'}
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
