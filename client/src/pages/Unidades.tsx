import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ImportPlanilha } from '../components/ImportPlanilha';

interface Unidade {
  id: number;
  codigo: string;
  chassi: string;
  codigoMotor: string;
  cor: string;
  ano: number;
  status: string;
  produto: { nome: string };
  loja?: { nomeFantasia: string };
}

export function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const loadUnidades = () => {
    setLoading(true);
    api.get<Unidade[]>('/unidades')
      .then(setUnidades)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUnidades();
  }, []);

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta unidade?')) return;
    try {
      await api.delete(`/unidades/${id}`);
      loadUnidades();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} unidade(s)?`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/unidades/${id}`)));
      setSelecionados([]);
      loadUnidades();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelecao = (id: number) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (selecionados.length === unidades.length) {
      setSelecionados([]);
    } else {
      setSelecionados(unidades.map(u => u.id));
    }
  };

  const statusLabels: Record<string, string> = {
    ESTOQUE: 'Em Estoque',
    RESERVADA: 'Reservada',
    VENDIDA: 'Vendida',
    EM_TRANSITO: 'Em Transito'
  };

  const statusColors: Record<string, string> = {
    ESTOQUE: 'badge-success',
    RESERVADA: 'badge-warning',
    VENDIDA: 'badge-primary',
    EM_TRANSITO: 'badge-danger'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Unidades Fisicas (Motos)</h1>
        <div className="flex gap-2">
          <ImportPlanilha tipo="unidades" onSuccess={loadUnidades} />
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button className="btn btn-primary">+ Nova Unidade</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700">
                <input
                  type="checkbox"
                  checked={selecionados.length === unidades.length && unidades.length > 0}
                  onChange={toggleTodos}
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Codigo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Chassi</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Motor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Modelo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Ano</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Loja</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {unidades.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-500">
                  Nenhuma unidade encontrada
                </td>
              </tr>
            ) : (
              unidades.map(unidade => (
                <tr key={unidade.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(unidade.id)}
                      onChange={() => toggleSelecao(unidade.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm text-orange-400">{unidade.codigo}</td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{unidade.chassi || '-'}</td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{unidade.codigoMotor || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.produto?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.cor || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.ano || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">{unidade.loja?.nomeFantasia || '-'}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${statusColors[unidade.status] || 'badge-primary'}`}>
                      {statusLabels[unidade.status] || unidade.status}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <button onClick={() => handleExcluir(unidade.id)} className="btn btn-sm btn-danger">
                      Excluir
                    </button>
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
