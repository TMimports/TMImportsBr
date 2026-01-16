import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    endereco: '',
    telefone: '',
    email: ''
  });

  const loadLojas = () => {
    api.get<Loja[]>('/lojas')
      .then(setLojas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLojas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lojas', form);
      setModalOpen(false);
      setForm({ cnpj: '', razaoSocial: '', nomeFantasia: '', endereco: '', telefone: '', email: '' });
      loadLojas();
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
        <h1 className="text-2xl font-bold">Lojas</h1>
        <div className="flex gap-2">
          <ImportExport entity="lojas" onImportSuccess={loadLojas} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Nova Loja</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome Fantasia</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">CNPJ</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Telefone</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {lojas.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Nenhuma loja encontrada
                </td>
              </tr>
            ) : (
              lojas.map(loja => (
                <tr key={loja.id} className="hover:bg-zinc-700 cursor-pointer">
                  <td className="p-3 border-b border-zinc-700">{loja.nomeFantasia || loja.razaoSocial}</td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{loja.cnpj}</td>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova Loja">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">CNPJ *</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              className="input"
              placeholder="00.000.000/0000-00"
              required
            />
          </div>
          <div>
            <label className="label">Razao Social *</label>
            <input
              type="text"
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Nome Fantasia</label>
            <input
              type="text"
              value={form.nomeFantasia}
              onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Endereco</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
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
