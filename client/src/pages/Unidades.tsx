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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Unidades Fisicas (Motos)</h1>
        <div className="flex flex-wrap gap-2">
          <ImportPlanilha tipo="unidades" onSuccess={loadUnidades} />
          {unidades.length > 0 && (
            <button 
              onClick={() => selecionados.length === unidades.length ? setSelecionados([]) : setSelecionados(unidades.map(u => u.id))}
              className="btn btn-secondary text-sm"
            >
              {selecionados.length === unidades.length ? 'Desmarcar' : 'Selecionar todos'}
            </button>
          )}
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
        </div>
      </div>

      {unidades.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Nenhuma unidade encontrada
        </div>
      ) : (
        <div className="space-y-3">
          {unidades.map(unidade => (
            <div key={unidade.id} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(unidade.id)}
                  onChange={() => toggleSelecao(unidade.id)}
                  className="rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{unidade.produto?.nome}</h3>
                      <p className="text-sm text-orange-400 font-mono">{unidade.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusColors[unidade.status] || 'badge-primary'}`}>
                        {statusLabels[unidade.status] || unidade.status}
                      </span>
                      <button onClick={() => handleExcluir(unidade.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Chassi: </span>
                      <span className="text-gray-300 font-mono text-xs">{unidade.chassi || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Motor: </span>
                      <span className="text-gray-300 font-mono text-xs">{unidade.codigoMotor || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cor: </span>
                      <span className="text-gray-300">{unidade.cor || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ano: </span>
                      <span className="text-gray-300">{unidade.ano || '-'}</span>
                    </div>
                  </div>
                  {unidade.loja?.nomeFantasia && (
                    <p className="text-xs text-gray-500 mt-2">Loja: {unidade.loja.nomeFantasia}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
