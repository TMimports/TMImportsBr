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
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

const initialForm = {
  id: 0,
  nome: '',
  email: '',
  senha: '',
  role: 'VENDEDOR',
  lojaId: ''
};

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Administrador Geral',
  ADMIN_REDE: 'Administrador de Rede',
  DONO_LOJA: 'Dono da Loja',
  GERENTE_LOJA: 'Gerente da Loja',
  VENDEDOR: 'Vendedor'
};

const roleDescriptions: Record<string, string> = {
  ADMIN_GERAL: 'Define produtos, servicos, precos, margens, regras, comissoes. Ve tudo.',
  ADMIN_REDE: 'Cria grupos, lojas, usuarios. Vincula lojas a donos. Nao mexe em preco.',
  DONO_LOJA: 'Ve sua loja: estoque, vendas, OS, financeiro, comissoes da equipe.',
  GERENTE_LOJA: 'Opera vendas, OS, clientes. Confirma pagamentos. Nao altera precos.',
  VENDEDOR: 'Cria vendas, OS, orcamentos. Atende clientes. Ve apenas suas comissoes.'
};

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const loadData = () => {
    setLoading(true);
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
      const dados = {
        nome: form.nome,
        email: form.email,
        senha: form.senha || undefined,
        role: form.role,
        lojaId: form.lojaId ? parseInt(form.lojaId) : null
      };
      
      if (editando && form.id) {
        await api.put(`/usuarios/${form.id}`, dados);
      } else {
        await api.post('/usuarios', dados);
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (usuario: Usuario) => {
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      role: usuario.role,
      lojaId: ''
    });
    setEditando(true);
    setModalOpen(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} usuario(s)?`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/usuarios/${id}`)));
      setSelecionados([]);
      loadData();
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
    if (selecionados.length === usuarios.length) {
      setSelecionados([]);
    } else {
      setSelecionados(usuarios.map(u => u.id));
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
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <div className="flex gap-2">
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Novo Usuario</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700">
                <input
                  type="checkbox"
                  checked={selecionados.length === usuarios.length && usuarios.length > 0}
                  onChange={toggleTodos}
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Email</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Perfil</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Loja</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhum usuario encontrado
                </td>
              </tr>
            ) : (
              usuarios.map(usuario => (
                <tr key={usuario.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(usuario.id)}
                      onChange={() => toggleSelecao(usuario.id)}
                      className="rounded"
                    />
                  </td>
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
                  <td className="p-3 border-b border-zinc-700">
                    <div className="table-actions">
                      <button onClick={() => handleEditar(usuario)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(usuario.id)} className="btn btn-sm btn-danger">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Usuario' : 'Novo Usuario'}>
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
            <label className="label">{editando ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="input"
              required={!editando}
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
              <option value="GERENTE_LOJA">Gerente da Loja</option>
              <option value="DONO_LOJA">Dono da Loja</option>
              <option value="ADMIN_REDE">Administrador de Rede</option>
              <option value="ADMIN_GERAL">Administrador Geral</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {roleDescriptions[form.role]}
            </p>
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
