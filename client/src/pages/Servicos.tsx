import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number | null;
}

export function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Servico[]>('/servicos')
      .then(setServicos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servicos</h1>
        <button className="btn btn-primary">+ Novo Servico</button>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Duracao</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Preco</th>
            </tr>
          </thead>
          <tbody>
            {servicos.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  Nenhum servico encontrado
                </td>
              </tr>
            ) : (
              servicos.map(servico => (
                <tr key={servico.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{servico.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    {servico.duracao ? `${servico.duracao} min` : 'Fixo'}
                  </td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
