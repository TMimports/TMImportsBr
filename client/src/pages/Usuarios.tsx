import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

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
  lojaId: '',
  cpf: '',
  telefone: '',
  banco: '',
  agencia: '',
  conta: '',
  tipoConta: 'CORRENTE',
  chavePix: ''
};

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Administrador Geral',
  ADMIN_REDE: 'Administrador de Rede',
  DONO_LOJA: 'Dono da Loja',
  GERENTE_LOJA: 'Gerente da Loja',
  VENDEDOR: 'Vendedor',
  TECNICO: 'Tecnico'
};

const roleDescriptions: Record<string, string> = {
  ADMIN_GERAL: 'Define produtos, servicos, precos, margens, regras, comissoes. Ve tudo.',
  ADMIN_REDE: 'Cria grupos, lojas, usuarios. Vincula lojas a donos. Nao mexe em preco.',
  DONO_LOJA: 'Ve sua loja: estoque, vendas, OS, financeiro, comissoes da equipe.',
  GERENTE_LOJA: 'Opera vendas, OS, clientes. Confirma pagamentos. Nao altera precos.',
  VENDEDOR: 'Cria vendas, OS, orcamentos. Atende clientes. Ve apenas suas comissoes.',
  TECNICO: 'Apenas cadastro para vincular em OS. Nao possui acesso ao sistema.'
};

export function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const rolesDisponiveis = user?.role === 'DONO_LOJA' 
    ? ['VENDEDOR', 'GERENTE_LOJA', 'TECNICO']
    : ['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA', 'GERENTE_LOJA', 'VENDEDOR', 'TECNICO'];

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
        lojaId: form.lojaId ? parseInt(form.lojaId) : null,
        cpf: form.cpf || null,
        telefone: form.telefone || null,
        banco: form.banco || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
        tipoConta: form.tipoConta || null,
        chavePix: form.chavePix || null
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

  const handleEditar = (usuario: any) => {
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      role: usuario.role,
      lojaId: usuario.lojaId ? String(usuario.lojaId) : '',
      cpf: usuario.cpf || '',
      telefone: usuario.telefone || '',
      banco: usuario.banco || '',
      agencia: usuario.agencia || '',
      conta: usuario.conta || '',
      tipoConta: usuario.tipoConta || 'CORRENTE',
      chavePix: usuario.chavePix || ''
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
              {rolesDisponiveis.map(role => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
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

          {(form.role === 'VENDEDOR' || form.role === 'GERENTE_LOJA' || form.role === 'TECNICO') && (
            <>
              <div className="border-t border-zinc-700 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-white mb-3">Dados Pessoais</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="input"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="input"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-700 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-white mb-3">Dados Bancarios</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Banco</label>
                  <input
                    type="text"
                    value={form.banco}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                    className="input"
                    placeholder="Ex: Nubank, Bradesco"
                  />
                </div>
                <div>
                  <label className="label">Tipo de Conta</label>
                  <select
                    value={form.tipoConta}
                    onChange={(e) => setForm({ ...form, tipoConta: e.target.value })}
                    className="input"
                  >
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupanca</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Agencia</label>
                  <input
                    type="text"
                    value={form.agencia}
                    onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                    className="input"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="label">Conta</label>
                  <input
                    type="text"
                    value={form.conta}
                    onChange={(e) => setForm({ ...form, conta: e.target.value })}
                    className="input"
                    placeholder="00000-0"
                  />
                </div>
              </div>
              <div>
                <label className="label">Chave PIX</label>
                <input
                  type="text"
                  value={form.chavePix}
                  onChange={(e) => setForm({ ...form, chavePix: e.target.value })}
                  className="input"
                  placeholder="CPF, Email, Telefone ou Chave Aleatoria"
                />
              </div>
            </>
          )}

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
