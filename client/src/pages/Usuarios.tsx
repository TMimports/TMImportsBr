import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  loja?: { nomeFantasia: string };
  grupo?: { nome: string };
}

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Usuario[]>('/usuarios')
      .then(setUsuarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const roleLabels: Record<string, string> = {
    ADMIN_GERAL: 'Admin Geral',
    ADMIN_REDE: 'Admin Rede',
    DONO_LOJA: 'Dono de Loja',
    GERENTE_LOJA: 'Gerente',
    VENDEDOR: 'Vendedor'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button className="btn btn-primary">+ Novo Usuario</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Email</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Perfil</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Loja</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Nenhum usuario encontrado
                </td>
              </tr>
            ) : (
              usuarios.map(usuario => (
                <tr key={usuario.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{usuario.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{usuario.email}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className="badge badge-primary">{roleLabels[usuario.role] || usuario.role}</span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">{usuario.loja?.nomeFantasia || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${usuario.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
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
