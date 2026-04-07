import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { CustomSelect } from '../components/CustomSelect';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  telefone?: string | null;
  loja?: { nomeFantasia: string };
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

interface Grupo {
  id: number;
  nome: string;
}

const ROLES_COM_LOJA = ['VENDEDOR', 'GERENTE_LOJA', 'TECNICO'];
const ROLES_COM_GRUPO = ['DONO_LOJA', 'ADMIN_REDE'];
const ROLES_SEM_VINCULO = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'];

const initialForm = {
  id: 0,
  nome: '',
  email: '',
  senha: '',
  role: 'VENDEDOR',
  lojaId: '',
  grupoId: '',
  cpf: '',
  telefone: '',
  banco: '',
  agencia: '',
  conta: '',
  tipoConta: 'CORRENTE',
  chavePix: ''
};

const BANCOS_BRASIL = [
  { value: '', label: 'Selecione o banco' },
  { value: 'Nubank', label: 'Nubank' },
  { value: 'Inter', label: 'Banco Inter' },
  { value: 'C6 Bank', label: 'C6 Bank' },
  { value: 'PicPay', label: 'PicPay' },
  { value: 'Mercado Pago', label: 'Mercado Pago' },
  { value: 'PagBank', label: 'PagBank (PagSeguro)' },
  { value: 'Neon', label: 'Neon' },
  { value: 'Next', label: 'Next (Bradesco)' },
  { value: 'Will Bank', label: 'Will Bank' },
  { value: 'Agibank', label: 'Agibank' },
  { value: 'Ame Digital', label: 'Ame Digital' },
  { value: 'RecargaPay', label: 'RecargaPay' },
  { value: 'Banco Original', label: 'Banco Original' },
  { value: 'Banco do Brasil', label: 'Banco do Brasil (BB)' },
  { value: 'Caixa Econômica', label: 'Caixa Econômica Federal (CEF)' },
  { value: 'Bradesco', label: 'Bradesco' },
  { value: 'Itaú', label: 'Itaú' },
  { value: 'Santander', label: 'Santander' },
  { value: 'BTG Pactual', label: 'BTG Pactual' },
  { value: 'XP Investimentos', label: 'XP Investimentos' },
  { value: 'Sicoob', label: 'Sicoob' },
  { value: 'Sicredi', label: 'Sicredi' },
  { value: 'Banrisul', label: 'Banrisul' },
  { value: 'BRB', label: 'BRB – Banco de Brasília' },
  { value: 'Banco Pan', label: 'Banco Pan' },
  { value: 'BMG', label: 'Banco BMG' },
  { value: 'Safra', label: 'Banco Safra' },
  { value: 'Rendimento', label: 'Banco Rendimento' },
  { value: 'Stone', label: 'Stone' },
  { value: 'Outro', label: 'Outro' },
];

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Administrador Geral',
  ADMIN_FINANCEIRO: 'Administrador Financeiro',
  DONO_LOJA: 'Dono da Loja',
  VENDEDOR: 'Vendedor',
  ADMIN_REDE: 'Administrador de Rede',
  GERENTE_LOJA: 'Gerente da Loja',
  TECNICO: 'Técnico'
};

const roleDescriptions: Record<string, string> = {
  ADMIN_GERAL:      'Acesso total ao sistema: produtos, precos, estoque, usuarios, financeiro, todas as lojas e franquias.',
  ADMIN_FINANCEIRO: 'Acesso completo a toda a area financeira de todas as lojas. Visualiza vendas e clientes para contexto.',
  ADMIN_REDE:       'Gerencia a rede de franquias: cadastra lojas, usuarios e acompanha relatorios de toda a rede.',
  DONO_LOJA:        'Gerencia seu grupo de lojas: cadastra funcionarios, ve estoque, vendas, OS e financeiro do grupo.',
  GERENTE_LOJA:     'Gerencia a loja: supervisiona vendas, estoque, OS, comissoes e financeiro da unidade.',
  VENDEDOR:         'Cria vendas e orcamentos, atende clientes. Ve apenas suas proprias comissoes.',
  TECNICO:          'Executa ordens de servico, registra pecas utilizadas e acompanha suas proprias comissoes.',
};

export function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const rolesDisponiveis = user?.role === 'DONO_LOJA'
    ? ['VENDEDOR', 'GERENTE_LOJA', 'TECNICO']
    : ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'ADMIN_REDE', 'DONO_LOJA', 'GERENTE_LOJA', 'VENDEDOR', 'TECNICO'];

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<Usuario[]>('/usuarios'),
      api.get<Loja[]>('/lojas'),
      api.get<Grupo[]>('/grupos')
    ])
      .then(([usuariosData, lojasData, gruposData]) => {
        setUsuarios(usuariosData);
        setLojas(lojasData);
        setGrupos(gruposData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando && form.senha.length < 8) {
      alert('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (editando && form.senha && form.senha.length < 8) {
      alert('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const dados = {
        nome: form.nome,
        email: form.email,
        senha: form.senha || undefined,
        role: form.role,
        lojaId: ROLES_COM_LOJA.includes(form.role) && form.lojaId ? parseInt(form.lojaId) : null,
        grupoId: ROLES_COM_GRUPO.includes(form.role) && form.grupoId ? parseInt(form.grupoId) : null,
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
      grupoId: usuario.grupoId ? String(usuario.grupoId) : '',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <div className="flex flex-wrap gap-2">
          {usuarios.length > 0 && (
            <button 
              onClick={() => selecionados.length === usuarios.length ? setSelecionados([]) : setSelecionados(usuarios.map(u => u.id))}
              className="btn btn-secondary text-sm"
            >
              {selecionados.length === usuarios.length ? 'Desmarcar' : 'Selecionar todos'}
            </button>
          )}
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Novo Usuario</button>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Nenhum usuario encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map(usuario => (
            <div key={usuario.id} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(usuario.id)}
                  onChange={() => toggleSelecao(usuario.id)}
                  className="rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{usuario.nome}</h3>
                      <p className="text-sm text-gray-400">{usuario.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${usuario.ativo ? 'badge-success' : 'badge-danger'}`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {usuario.role === 'VENDEDOR' && usuario.telefone && (
                        <a
                          href={`https://wa.me/55${usuario.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bom dia, ${usuario.nome.split(' ')[0]}! 🚀 Nova semana, novas oportunidades! Vamos com tudo hoje! 💪 — Equipe TM Imports`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{ backgroundColor: '#16a34a', color: 'white' }}
                          title="Enviar motivação por WhatsApp"
                        >
                          💬
                        </a>
                      )}
                      <button onClick={() => handleEditar(usuario)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(usuario.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Perfil: </span>
                      <span className="badge badge-primary">{roleLabels[usuario.role] || usuario.role}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Loja: </span>
                      <span className="text-gray-300">{usuario.loja?.nomeFantasia || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo de 8 caracteres</p>
          </div>
          <div>
            <CustomSelect
              label="Perfil"
              required
              value={form.role}
              onChange={(val) => setForm({ ...form, role: val })}
              options={rolesDisponiveis.map(role => ({ value: role, label: roleLabels[role] }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              {roleDescriptions[form.role]}
            </p>
          </div>
          {ROLES_COM_LOJA.includes(form.role) && (
            <CustomSelect
              label="Loja *"
              value={form.lojaId}
              onChange={(val) => setForm({ ...form, lojaId: val })}
              options={[
                { value: '', label: 'Selecione a loja' },
                ...lojas.map(l => ({ value: String(l.id), label: l.nomeFantasia }))
              ]}
            />
          )}
          {ROLES_COM_GRUPO.includes(form.role) && (
            <CustomSelect
              label="Grupo (Franquia) *"
              value={form.grupoId}
              onChange={(val) => setForm({ ...form, grupoId: val })}
              options={[
                { value: '', label: 'Selecione o grupo' },
                ...grupos.map(g => ({ value: String(g.id), label: g.nome }))
              ]}
            />
          )}
          {ROLES_SEM_VINCULO.includes(form.role) && (
            <p className="text-xs text-gray-500 bg-zinc-800 rounded p-2">
              Este perfil tem acesso global — não precisa de loja ou grupo.
            </p>
          )}

          {form.role === 'VENDEDOR' && (
            <>
              <div className="border-t border-zinc-700 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-white mb-3">Dados Pessoais</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <CustomSelect
                    label="Banco"
                    value={form.banco}
                    onChange={(val) => setForm({ ...form, banco: val })}
                    options={BANCOS_BRASIL}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Tipo de Conta"
                    value={form.tipoConta}
                    onChange={(val) => setForm({ ...form, tipoConta: val })}
                    options={[
                      { value: 'CORRENTE', label: 'Corrente' },
                      { value: 'POUPANCA', label: 'Poupança' }
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
