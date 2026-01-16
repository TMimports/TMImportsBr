import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  loja?: { nomeFantasia: string };
  grupo?: { nome: string };
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'VENDEDOR',
    lojaId: ''
  });

  const loadData = () => {
    Promise.all([
      api.get<Usuario[]>('/usuarios'),
      api.get<Loja[]>('/lojas')
    ])
      .then(([usuariosData, lojasData]) => {
        setUsuarios(usuariosData);
        setLojas(lojasData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/usuarios', {
        ...form,
        lojaId: form.lojaId ? parseInt(form.lojaId) : null
      });
      setModalOpen(false);
      setForm({ nome: '', email: '', senha: '', role: 'VENDEDOR', lojaId: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

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
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Novo Usuario</button>
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
                <tr key={usuario.id} className="hover:bg-zinc-700 cursor-pointer">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Usuario">
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
            <label className="label">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Senha *</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Perfil *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input"
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="GERENTE_LOJA">Gerente</option>
              <option value="DONO_LOJA">Dono de Loja</option>
              <option value="ADMIN_REDE">Admin Rede</option>
              <option value="ADMIN_GERAL">Admin Geral</option>
            </select>
          </div>
          <div>
            <label className="label">Loja</label>
            <select
              value={form.lojaId}
              onChange={(e) => setForm({ ...form, lojaId: e.target.value })}
              className="input"
            >
              <option value="">Nenhuma (Admin)</option>
              {lojas.map(l => (
                <option key={l.id} value={l.id}>{l.nomeFantasia}</option>
              ))}
            </select>
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
