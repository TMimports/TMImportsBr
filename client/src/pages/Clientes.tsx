import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', cpfCnpj: '', telefone: '', email: '', endereco: '' });

  const loadClientes = () => {
    api.get<Cliente[]>('/clientes')
      .then(setClientes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/clientes', form);
      setModalOpen(false);
      setForm({ nome: '', cpfCnpj: '', telefone: '', email: '', endereco: '' });
      loadClientes();
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
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <ImportExport entity="clientes" onImportSuccess={loadClientes} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Novo Cliente</button>
        </div>
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
                <tr key={cliente.id} className="hover:bg-zinc-700 cursor-pointer">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Cliente">
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
            <label className="label">CPF/CNPJ</label>
            <input
              type="text"
              value={form.cpfCnpj}
              onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
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
          <div>
            <label className="label">Endereco</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
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
