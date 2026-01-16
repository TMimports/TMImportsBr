import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ContaPagar {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  pago: boolean;
  fornecedor?: string;
}

interface ContaReceber {
  id: number;
  valor: number;
  dataVencimento: string;
  pago: boolean;
  venda?: { id: number };
  ordemServico?: { id: number };
}

export function Financeiro() {
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pagar' | 'receber'>('receber');

  useEffect(() => {
    Promise.all([
      api.get<ContaPagar[]>('/financeiro/contas-pagar').catch(() => []),
      api.get<ContaReceber[]>('/financeiro/contas-receber').catch(() => [])
    ])
      .then(([pagar, receber]) => {
        setContasPagar(pagar);
        setContasReceber(receber);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <button className="btn btn-primary">+ Nova Conta</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('receber')}
          className={`btn ${tab === 'receber' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Contas a Receber ({contasReceber.length})
        </button>
        <button
          onClick={() => setTab('pagar')}
          className={`btn ${tab === 'pagar' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Contas a Pagar ({contasPagar.length})
        </button>
      </div>

      {tab === 'receber' ? (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Origem</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vencimento</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {contasReceber.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    Nenhuma conta a receber
                  </td>
                </tr>
              ) : (
                contasReceber.map(conta => (
                  <tr key={conta.id} className="hover:bg-zinc-700">
                    <td className="p-3 border-b border-zinc-700">
                      {conta.venda ? `Venda #${conta.venda.id}` : conta.ordemServico ? `OS #${conta.ordemServico.id}` : '-'}
                    </td>
                    <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                      R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      <span className={`badge ${conta.pago ? 'badge-success' : 'badge-warning'}`}>
                        {conta.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Descricao</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Fornecedor</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vencimento</th>
                <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {contasPagar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhuma conta a pagar
                  </td>
                </tr>
              ) : (
                contasPagar.map(conta => (
                  <tr key={conta.id} className="hover:bg-zinc-700">
                    <td className="p-3 border-b border-zinc-700">{conta.descricao}</td>
                    <td className="p-3 border-b border-zinc-700">{conta.fornecedor || '-'}</td>
                    <td className="p-3 border-b border-zinc-700 font-semibold text-red-400">
                      R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 border-b border-zinc-700">
                      <span className={`badge ${conta.pago ? 'badge-success' : 'badge-warning'}`}>
                        {conta.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
