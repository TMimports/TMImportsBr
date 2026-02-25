import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { buscarCNPJ, formatCNPJ } from '../services/cnpj';
import { CustomSelect } from '../components/CustomSelect';

interface Grupo {
  id: number;
  nome: string;
}

interface Loja {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  telefone: string;
  email: string;
  ativo: boolean;
  grupoId: number;
  grupo?: Grupo;
}

const initialForm = {
  id: 0,
  cnpj: '',
  razaoSocial: '',
  nomeFantasia: '',
  endereco: '',
  cep: '',
  bairro: '',
  cidade: '',
  uf: '',
  telefone: '',
  email: '',
  grupoId: 0
};

export function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const loadGrupos = async () => {
    try {
      const data = await api.get<Grupo[]>('/grupos');
      setGrupos(data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  };

  const loadLojas = () => {
    setLoading(true);
    api.get<Loja[]>('/lojas')
      .then(setLojas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLojas();
    loadGrupos();
  }, []);

  const handleBuscarCNPJ = async () => {
    if (!form.cnpj || form.cnpj.replace(/\D/g, '').length !== 14) {
      alert('Digite um CNPJ valido com 14 digitos');
      return;
    }
    
    setBuscando(true);
    const dados = await buscarCNPJ(form.cnpj);
    setBuscando(false);
    
    if (dados) {
      setForm({
        ...form,
        cnpj: dados.cnpj,
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia,
        endereco: dados.endereco,
        cep: dados.cep,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        telefone: dados.telefone,
        email: dados.email
      });
    } else {
      alert('CNPJ nao encontrado na Receita Federal');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const enderecoCompleto = [form.endereco, form.bairro, form.cidade, form.uf, form.cep].filter(Boolean).join(', ');
      const dados = {
        ...form,
        endereco: enderecoCompleto
      };
      
      if (editando && form.id) {
        await api.put(`/lojas/${form.id}`, dados);
      } else {
        await api.post('/lojas', dados);
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(false);
      loadLojas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (loja: Loja) => {
    setForm({
      id: loja.id,
      cnpj: loja.cnpj,
      razaoSocial: loja.razaoSocial,
      nomeFantasia: loja.nomeFantasia || '',
      endereco: loja.endereco || '',
      cep: '',
      bairro: '',
      cidade: '',
      uf: '',
      telefone: loja.telefone || '',
      email: loja.email || '',
      grupoId: loja.grupoId
    });
    setEditando(true);
    setModalOpen(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta loja?')) return;
    try {
      await api.delete(`/lojas/${id}`);
      loadLojas();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} loja(s)?`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/lojas/${id}`)));
      setSelecionados([]);
      loadLojas();
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
        <h1 className="text-2xl font-bold">Lojas</h1>
        <div className="flex flex-wrap gap-2">
          <ImportExport entity="lojas" onImportSuccess={loadLojas} />
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Nova Loja</button>
        </div>
      </div>

      {lojas.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">Nenhuma loja encontrada</div>
      ) : (
        <div className="space-y-3">
          {lojas.map(loja => (
            <div key={loja.id} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(loja.id)}
                  onChange={() => toggleSelecao(loja.id)}
                  className="rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{loja.nomeFantasia || loja.razaoSocial}</h3>
                      <p className="text-xs text-orange-400">{loja.grupo?.nome || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${loja.ativo ? 'badge-success' : 'badge-danger'}`}>
                        {loja.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                      <button onClick={() => handleEditar(loja)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(loja.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                    <div>
                      <span className="text-gray-500">CNPJ: </span>
                      <span className="text-gray-300 font-mono text-xs">{formatCNPJ(loja.cnpj)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tel: </span>
                      <span className="text-gray-300">{loja.telefone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Loja' : 'Nova Loja'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">CNPJ *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="input"
                placeholder="00.000.000/0000-00"
                required
              />
              <button
                type="button"
                onClick={handleBuscarCNPJ}
                disabled={buscando}
                className="btn btn-secondary whitespace-nowrap"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Clique em Buscar para preencher automaticamente</p>
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
            <CustomSelect
              label="Grupo"
              required
              value={String(form.grupoId || '')}
              onChange={(val) => setForm({ ...form, grupoId: Number(val) })}
              options={grupos.map(g => ({ value: String(g.id), label: g.nome }))}
            />
            <p className="text-xs text-gray-500 mt-1">As lojas do mesmo grupo compartilham estoque</p>
          </div>
          <div>
            <label className="label">Endereco</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="input"
              placeholder="Rua, numero, complemento"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">CEP</label>
              <input
                type="text"
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                className="input"
                placeholder="00000-000"
              />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">UF</label>
                <input
                  type="text"
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  className="input"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="input"
                placeholder="(00) 0000-0000"
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
