import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number | null;
}

export function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', preco: '', duracao: '' });

  const loadServicos = () => {
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
      await api.post('/servicos', {
        nome: form.nome,
        preco: parseFloat(form.preco),
        duracao: form.duracao ? parseInt(form.duracao) : null
      });
      setModalOpen(false);
      setForm({ nome: '', preco: '', duracao: '' });
      loadServicos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servicos</h1>
        <div className="flex gap-2">
          <ImportExport entity="servicos" onImportSuccess={loadServicos} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Novo Servico</button>
        </div>
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
                <tr key={servico.id} className="hover:bg-zinc-700 cursor-pointer">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Servico">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input"
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
