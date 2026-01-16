import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Cliente {
  id: number;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Cliente[]>('/clientes')
      .then(setClientes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button className="btn btn-primary">+ Novo Cliente</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">CPF/CNPJ</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Telefone</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Email</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              clientes.map(cliente => (
                <tr key={cliente.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{cliente.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{cliente.cpfCnpj || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">{cliente.telefone || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">{cliente.email || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
