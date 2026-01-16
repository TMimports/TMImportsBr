import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Grupo {
  id: number;
  nome: string;
  createdAt: string;
  _count?: { lojas: number; users: number };
}

export function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Grupo[]>('/grupos')
      .then(setGrupos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <button className="btn btn-primary">+ Novo Grupo</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Lojas</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Usuarios</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Nenhum grupo encontrado
                </td>
              </tr>
            ) : (
              grupos.map(grupo => (
                <tr key={grupo.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700 font-medium">{grupo.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{grupo._count?.lojas || 0}</td>
                  <td className="p-3 border-b border-zinc-700">{grupo._count?.users || 0}</td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(grupo.createdAt).toLocaleDateString('pt-BR')}
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
