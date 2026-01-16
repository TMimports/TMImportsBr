import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { ImportPlanilha } from '../components/ImportPlanilha';

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number | null;
}

const initialForm = {
  id: 0,
  nome: '',
  preco: '',
  duracao: ''
};

export function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const loadServicos = () => {
    setLoading(true);
    api.get<Servico[]>('/servicos')
      .then(setServicos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadServicos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dados = {
        nome: form.nome,
        preco: parseFloat(form.preco),
        duracao: form.duracao ? parseInt(form.duracao) : null
      };
      
      if (editando && form.id) {
        await api.put(`/servicos/${form.id}`, dados);
      } else {
        await api.post('/servicos', dados);
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(false);
      loadServicos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (servico: Servico) => {
    setForm({
      id: servico.id,
      nome: servico.nome,
      preco: String(servico.preco),
      duracao: servico.duracao ? String(servico.duracao) : ''
    });
    setEditando(true);
    setModalOpen(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este servico?')) return;
    try {
      await api.delete(`/servicos/${id}`);
      loadServicos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} servico(s)?`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/servicos/${id}`)));
      setSelecionados([]);
      loadServicos();
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
    if (selecionados.length === servicos.length) {
      setSelecionados([]);
    } else {
      setSelecionados(servicos.map(s => s.id));
    }
  };

  const abrirNovo = () => {
    setForm(initialForm);
    setEditando(false);
    setModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servicos</h1>
        <div className="flex gap-2">
          <ImportPlanilha tipo="servicos" onSuccess={loadServicos} />
          <ImportExport entity="servicos" onImportSuccess={loadServicos} />
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Novo Servico</button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <h3 className="font-medium mb-2">Tabela de Mao de Obra (Tempo)</h3>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="p-2 bg-zinc-700 rounded">15 min = R$ 70</div>
          <div className="p-2 bg-zinc-700 rounded">30 min = R$ 140</div>
          <div className="p-2 bg-zinc-700 rounded">45 min = R$ 270</div>
          <div className="p-2 bg-zinc-700 rounded">60 min = R$ 330</div>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700">
                <input
                  type="checkbox"
                  checked={selecionados.length === servicos.length && servicos.length > 0}
                  onChange={toggleTodos}
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Duracao</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Preco</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {servicos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Nenhum servico encontrado
                </td>
              </tr>
            ) : (
              servicos.map(servico => (
                <tr key={servico.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(servico.id)}
                      onChange={() => toggleSelecao(servico.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 border-b border-zinc-700">{servico.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    {servico.duracao ? (
                      <span className="badge badge-primary">{servico.duracao} min</span>
                    ) : (
                      <span className="badge badge-success">Fixo</span>
                    )}
                  </td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <div className="table-actions">
                      <button onClick={() => handleEditar(servico)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(servico.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Servico' : 'Novo Servico'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input"
              placeholder="Ex: Mao de Obra, Revisao, Manutencao Motor..."
              required
            />
          </div>
          <div>
            <label className="label">Preco (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Duracao (minutos)</label>
            <input
              type="number"
              value={form.duracao}
              onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              className="input"
              placeholder="Deixe vazio para servico fixo"
            />
            <p className="text-xs text-gray-500 mt-1">
              Servicos por tempo: 15, 30, 45, 60 min. Servicos fixos nao tem duracao.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
