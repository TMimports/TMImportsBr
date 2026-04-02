import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { Button, Input, Select } from '../components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Categoria {
  id: number;
  nome: string;
  natureza: 'RECEITA' | 'DESPESA' | 'AMBOS';
  descricao: string | null;
  ativo: boolean;
}

interface Departamento {
  id: number;
  nome: string;
  natureza: 'RECEITA' | 'DESPESA' | 'AMBOS';
  descricao: string | null;
  ativo: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const naturezas = [
  { value: 'DESPESA', label: 'Despesa' },
  { value: 'RECEITA', label: 'Receita' },
  { value: 'AMBOS', label: 'Ambos' }
];

function naturezaBadge(natureza: string) {
  const classes: Record<string, string> = {
    RECEITA: 'bg-green-500/20 text-green-400',
    DESPESA: 'bg-red-500/20 text-red-400',
    AMBOS: 'bg-blue-500/20 text-blue-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes[natureza] || 'bg-zinc-700 text-gray-300'}`}>
      {natureza}
    </span>
  );
}

// ── Categoria Section ─────────────────────────────────────────────────────────

function SecaoCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', natureza: 'DESPESA', descricao: '' });
  const [filtroNatureza, setFiltroNatureza] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Categoria[]>('/categorias-financeiras')
      .then(setCategorias)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/categorias-financeiras/${editando.id}`, form);
      } else {
        await api.post('/categorias-financeiras', form);
      }
      setModalOpen(false);
      setEditando(null);
      setForm({ nome: '', natureza: 'DESPESA', descricao: '' });
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (cat: Categoria) => {
    setEditando(cat);
    setForm({ nome: cat.nome, natureza: cat.natureza, descricao: cat.descricao || '' });
    setModalOpen(true);
  };

  const handleToggle = async (cat: Categoria) => {
    try {
      await api.put(`/categorias-financeiras/${cat.id}`, { ativo: !cat.ativo });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir categoria? Isso só é possível se não houver lançamentos vinculados.')) return;
    try {
      await api.delete(`/categorias-financeiras/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtradas = categorias.filter(c => !filtroNatureza || c.natureza === filtroNatureza);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Categorias Financeiras</h2>
          <p className="text-gray-400 text-sm">Clasifique receitas e despesas por categoria</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filtroNatureza}
            onChange={e => setFiltroNatureza(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2"
          >
            <option value="">Todas</option>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
            <option value="AMBOS">Ambos</option>
          </select>
          <Button variant="primary" size="sm" onClick={() => { setEditando(null); setForm({ nome: '', natureza: 'DESPESA', descricao: '' }); setModalOpen(true); }}>
            + Categoria
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-zinc-800">
              <th className="pb-3 pr-4 font-medium">Nome</th>
              <th className="pb-3 pr-4 font-medium">Natureza</th>
              <th className="pb-3 pr-4 font-medium">Descrição</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Carregando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Nenhuma categoria encontrada</td></tr>
            ) : (
              filtradas.map(cat => (
                <tr key={cat.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 ${!cat.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 text-white font-medium">{cat.nome}</td>
                  <td className="py-3 pr-4">{naturezaBadge(cat.natureza)}</td>
                  <td className="py-3 pr-4 text-gray-400">{cat.descricao || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.ativo ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-gray-500'}`}>
                      {cat.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => handleEditar(cat)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(cat)}>
                        {cat.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleExcluir(cat.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Categoria' : 'Nova Categoria'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Energia Elétrica" />
          <Select
            label="Natureza *"
            value={form.natureza}
            onChange={e => setForm({ ...form, natureza: e.target.value })}
            required
            options={naturezas}
          />
          <Input label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Opcional" />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={saving}>{editando ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Departamento Section ──────────────────────────────────────────────────────

function SecaoDepartamentos() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Departamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', natureza: 'AMBOS', descricao: '' });

  const load = () => {
    setLoading(true);
    api.get<Departamento[]>('/departamentos')
      .then(setDepartamentos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/departamentos/${editando.id}`, form);
      } else {
        await api.post('/departamentos', form);
      }
      setModalOpen(false);
      setEditando(null);
      setForm({ nome: '', natureza: 'AMBOS', descricao: '' });
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (dep: Departamento) => {
    setEditando(dep);
    setForm({ nome: dep.nome, natureza: dep.natureza, descricao: dep.descricao || '' });
    setModalOpen(true);
  };

  const handleToggle = async (dep: Departamento) => {
    try {
      await api.put(`/departamentos/${dep.id}`, { ativo: !dep.ativo });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir departamento?')) return;
    try {
      await api.delete(`/departamentos/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Departamentos</h2>
          <p className="text-gray-400 text-sm">Centros de responsabilidade para lançamentos financeiros</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditando(null); setForm({ nome: '', natureza: 'AMBOS', descricao: '' }); setModalOpen(true); }}>
          + Departamento
        </Button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-zinc-800">
              <th className="pb-3 pr-4 font-medium">Nome</th>
              <th className="pb-3 pr-4 font-medium">Natureza</th>
              <th className="pb-3 pr-4 font-medium">Descrição</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Carregando...</td></tr>
            ) : departamentos.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Nenhum departamento</td></tr>
            ) : (
              departamentos.map(dep => (
                <tr key={dep.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 ${!dep.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 text-white font-medium">{dep.nome}</td>
                  <td className="py-3 pr-4">{naturezaBadge(dep.natureza)}</td>
                  <td className="py-3 pr-4 text-gray-400">{dep.descricao || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${dep.ativo ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-gray-500'}`}>
                      {dep.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => handleEditar(dep)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(dep)}>{dep.ativo ? 'Desativar' : 'Ativar'}</Button>
                      <Button variant="danger" size="sm" onClick={() => handleExcluir(dep.id)}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Departamento' : 'Novo Departamento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Comercial - Motos" />
          <Select
            label="Natureza *"
            value={form.natureza}
            onChange={e => setForm({ ...form, natureza: e.target.value })}
            required
            options={naturezas}
          />
          <Input label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Opcional" />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={saving}>{editando ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CategoriasDepartamentos() {
  const [aba, setAba] = useState<'categorias' | 'departamentos'>('categorias');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Plano de Contas</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie categorias e departamentos para classificação financeira</p>
      </div>

      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
        {(['categorias', 'departamentos'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${aba === tab ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab === 'categorias' ? '🏷 Categorias' : '🏢 Departamentos'}
          </button>
        ))}
      </div>

      {aba === 'categorias' ? <SecaoCategorias /> : <SecaoDepartamentos />}
    </div>
  );
}
