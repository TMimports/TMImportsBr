import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Grupo { id: number; nome: string; }

interface Loja {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  grupoId: number;
  grupo?: Grupo;
  _count?: { usuarios: number };
  createdAt?: string;
}

const emptyForm = {
  id: 0, cnpj: '', razaoSocial: '', nomeFantasia: '',
  endereco: '', cep: '', bairro: '', cidade: '', uf: '',
  telefone: '', email: '', grupoId: 0,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtCNPJ = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length !== 14) return v;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// ── Modal genérico ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Detalhes da Loja ───────────────────────────────────────────────────────────

function DetalheRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-zinc-100 font-medium">{value || '—'}</span>
    </div>
  );
}

function ModalDetalhes({ loja, onClose, onEditar }: { loja: Loja; onClose: () => void; onEditar: () => void }) {
  return (
    <Modal title={`🏪 ${loja.nomeFantasia || loja.razaoSocial}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${loja.ativo ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
            {loja.ativo ? '● Ativa' : '● Inativa'}
          </span>
          {loja.grupo && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {loja.grupo.nome}
            </span>
          )}
        </div>

        {/* Dados principais */}
        <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetalheRow label="Nome Fantasia" value={loja.nomeFantasia} />
          <DetalheRow label="Razão Social" value={loja.razaoSocial} />
          <DetalheRow label="CNPJ" value={fmtCNPJ(loja.cnpj)} />
          <DetalheRow label="Usuários vinculados" value={loja._count?.usuarios ?? 0} />
        </div>

        {/* Contato */}
        <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetalheRow label="Telefone" value={loja.telefone} />
          <DetalheRow label="E-mail" value={loja.email} />
          <div className="sm:col-span-2">
            <DetalheRow label="Endereço" value={loja.endereco} />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onEditar} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            ✏️ Editar
          </button>
          <button onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Formulário (Criar / Editar) ────────────────────────────────────────────────

function ModalForm({
  form, setForm, grupos, saving, buscando, onBuscarCNPJ, onSubmit, onClose, editando,
}: {
  form: typeof emptyForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  grupos: Grupo[]; saving: boolean; buscando: boolean;
  onBuscarCNPJ: () => void; onSubmit: (e: React.FormEvent) => void;
  onClose: () => void; editando: boolean;
}) {
  const inp = "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-500 transition-colors";
  const lbl = "block text-xs text-zinc-400 mb-1";

  return (
    <Modal title={editando ? '✏️ Editar Loja' : '🏪 Nova Loja'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* CNPJ */}
        <div>
          <label className={lbl}>CNPJ</label>
          <div className="flex gap-2">
            <input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
              className={inp} placeholder="00.000.000/0000-00" />
            <button type="button" onClick={onBuscarCNPJ} disabled={buscando}
              className="flex-shrink-0 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
              {buscando ? '⏳' : '🔍 Buscar'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Clique em Buscar para preencher automaticamente pela Receita Federal</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={lbl}>Razão Social *</label>
            <input value={form.razaoSocial} onChange={e => setForm(p => ({ ...p, razaoSocial: e.target.value }))}
              className={inp} required />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Nome Fantasia</label>
            <input value={form.nomeFantasia} onChange={e => setForm(p => ({ ...p, nomeFantasia: e.target.value }))}
              className={inp} placeholder="Ex: TM Recreio" />
          </div>

          <div className="sm:col-span-2">
            <label className={lbl}>Grupo *</label>
            <select value={form.grupoId || ''} onChange={e => setForm(p => ({ ...p, grupoId: Number(e.target.value) }))}
              required className={inp}>
              <option value="">Selecione...</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Endereço */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Endereço</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className={lbl}>Logradouro</label>
              <input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))}
                className={inp} placeholder="Rua, número, complemento" />
            </div>
            <div>
              <label className={lbl}>CEP</label>
              <input value={form.cep} onChange={e => setForm(p => ({ ...p, cep: e.target.value }))}
                className={inp} placeholder="00000-000" />
            </div>
            <div>
              <label className={lbl}>Bairro</label>
              <input value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                className={inp} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Cidade</label>
                <input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>UF</label>
                <input value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value }))}
                  className={inp} maxLength={2} placeholder="RJ" />
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Telefone</label>
            <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
              className={inp} placeholder="(21) 99999-9999" />
          </div>
          <div>
            <label className={lbl}>E-mail</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={inp} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Loja'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Card da Loja ───────────────────────────────────────────────────────────────

function LojaCard({
  loja, onDetalhes, onEditar, onExcluir,
}: {
  loja: Loja;
  onDetalhes: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const cnpjPendente = loja.cnpj.startsWith('PENDENTE');
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 text-lg">
            🏪
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate leading-tight">
              {loja.nomeFantasia || loja.razaoSocial}
            </p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{loja.razaoSocial}</p>
          </div>
        </div>
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${loja.ativo ? 'bg-green-500/15 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
          {loja.ativo ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      {/* Dados */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-10 flex-shrink-0">CNPJ</span>
          {cnpjPendente ? (
            <span className="text-yellow-400 font-mono">⏳ Pendente</span>
          ) : (
            <span className="text-zinc-300 font-mono">{fmtCNPJ(loja.cnpj)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-10 flex-shrink-0">Grupo</span>
          <span className="text-orange-400">{loja.grupo?.nome || '—'}</span>
        </div>
        {loja.telefone && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 w-10 flex-shrink-0">Tel</span>
            <span className="text-zinc-300">{loja.telefone}</span>
          </div>
        )}
        {loja.email && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 w-10 flex-shrink-0">Email</span>
            <span className="text-zinc-300 truncate">{loja.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 w-10 flex-shrink-0">Users</span>
          <span className="text-zinc-300">{loja._count?.usuarios ?? 0} usuário(s)</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-1 border-t border-zinc-800">
        <button onClick={onDetalhes}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors">
          👁️ Detalhes
        </button>
        <button onClick={onEditar}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors">
          ✏️ Editar
        </button>
        <button onClick={onExcluir}
          className="flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors">
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────────

export function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [busca, setBusca] = useState('');

  const [modalDetalhes, setModalDetalhes] = useState<Loja | null>(null);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const flash = (msg: string, tipo: 'ok' | 'erro') => {
    if (tipo === 'ok') { setSucesso(msg); setTimeout(() => setSucesso(null), 3500); }
    else { setErro(msg); setTimeout(() => setErro(null), 4000); }
  };

  const loadLojas = async () => {
    setLoading(true);
    try {
      const data = await api.get<Loja[]>('/lojas');
      setLojas(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setLojas([]);
      flash(e.message || 'Erro ao carregar lojas', 'erro');
    } finally { setLoading(false); }
  };

  const loadGrupos = async () => {
    try {
      const data = await api.get<Grupo[]>('/grupos');
      setGrupos(Array.isArray(data) ? data : []);
    } catch { setGrupos([]); }
  };

  useEffect(() => {
    loadLojas();
    loadGrupos();
  }, []);

  const handleBuscarCNPJ = async () => {
    const valorCnpj = String(form.cnpj || '');
    const cnpjLimpo = valorCnpj.trim().replace(/\D/g, '');
    console.log('[Buscar CNPJ] valorOriginal:', JSON.stringify(valorCnpj), '| cnpjLimpo:', cnpjLimpo, '| length:', cnpjLimpo.length);
    if (cnpjLimpo.length !== 14) { flash('Digite um CNPJ válido com 14 dígitos', 'erro'); return; }
    setBuscando(true);
    try {
      const d = await api.get<any>(`/lojas/consultar-cnpj/${cnpjLimpo}`);
      setForm(p => ({
        ...p,
        cnpj: d.cnpj ?? p.cnpj,
        razaoSocial: d.razaoSocial ?? p.razaoSocial,
        nomeFantasia: d.nomeFantasia ?? p.nomeFantasia,
        endereco: d.endereco ?? p.endereco,
        cep: d.cep ?? p.cep,
        bairro: d.bairro ?? p.bairro,
        cidade: d.cidade ?? p.cidade,
        uf: d.uf ?? p.uf,
        telefone: d.telefone ?? p.telefone,
        email: d.email ?? p.email,
      }));
    } catch (e: any) { flash(e.message || 'CNPJ não encontrado na Receita Federal', 'erro'); }
    finally { setBuscando(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cnpjLimpo = form.cnpj.replace(/\D/g, '');
      const enderecoFull = [form.endereco, form.bairro, form.cidade, form.uf, form.cep].filter(Boolean).join(', ');
      const body = { ...form, cnpj: cnpjLimpo, endereco: enderecoFull };
      if (editando && form.id) {
        await api.put(`/lojas/${form.id}`, body);
        flash('Loja atualizada com sucesso!', 'ok');
      } else {
        await api.post('/lojas', body);
        flash('Loja criada com sucesso!', 'ok');
      }
      setModalForm(false);
      setForm(emptyForm);
      setEditando(false);
      await loadLojas();
    } catch (e: any) { flash(e.message || 'Erro ao salvar', 'erro'); }
    finally { setSaving(false); }
  };

  const handleEditar = (loja: Loja) => {
    setForm({
      id: loja.id, cnpj: loja.cnpj,
      razaoSocial: loja.razaoSocial, nomeFantasia: loja.nomeFantasia || '',
      endereco: loja.endereco || '', cep: '', bairro: '', cidade: '', uf: '',
      telefone: loja.telefone || '', email: loja.email || '', grupoId: loja.grupoId,
    });
    setEditando(true);
    setModalDetalhes(null);
    setModalForm(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/lojas/${id}`);
      flash('Loja excluída.', 'ok');
      await loadLojas();
    } catch (e: any) { flash(e.message || 'Erro ao excluir', 'erro'); }
  };

  const lojasFiltradas = useMemo(() => {
    const q = busca.toLowerCase();
    if (!q) return lojas;
    return lojas.filter(l =>
      l.nomeFantasia?.toLowerCase().includes(q) ||
      l.razaoSocial?.toLowerCase().includes(q) ||
      l.cnpj?.includes(q) ||
      l.grupo?.nome?.toLowerCase().includes(q)
    );
  }, [lojas, busca]);

  const ativas = lojas.filter(l => l.ativo).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Alertas */}
      {sucesso && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/15 border border-green-500/40 text-green-400 px-4 py-3 rounded-xl text-sm shadow-lg">
          ✅ {sucesso}
        </div>
      )}
      {erro && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/15 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm shadow-lg">
          ❌ {erro}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">🏪 Lojas</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {lojas.length} loja(s) cadastrada(s) — {ativas} ativa(s)
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditando(false); setModalForm(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
          + Nova Loja
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Lojas', value: lojas.length, icon: '🏪', color: 'text-white' },
          { label: 'Ativas', value: ativas, icon: '✅', color: 'text-green-400' },
          { label: 'Inativas', value: lojas.length - ativas, icon: '⛔', color: 'text-zinc-400' },
          { label: 'Com CNPJ Pendente', value: lojas.filter(l => l.cnpj.startsWith('PENDENTE')).length, icon: '⏳', color: 'text-yellow-400' },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>{k.icon}</span>
              <span className="text-xs text-zinc-500">{k.label}</span>
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CNPJ ou grupo..."
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600 transition-colors"
        />
      </div>

      {/* Grid de lojas */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500">Carregando lojas...</div>
      ) : lojasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-lg font-medium text-zinc-400">{busca ? 'Nenhuma loja encontrada' : 'Nenhuma loja cadastrada'}</p>
          {busca && <button onClick={() => setBusca('')} className="mt-2 text-sm text-orange-400 hover:underline">Limpar busca</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lojasFiltradas.map(loja => (
            <LojaCard
              key={loja.id}
              loja={loja}
              onDetalhes={() => setModalDetalhes(loja)}
              onEditar={() => handleEditar(loja)}
              onExcluir={() => handleExcluir(loja.id)}
            />
          ))}
        </div>
      )}

      {/* Modal Detalhes */}
      {modalDetalhes && (
        <ModalDetalhes
          loja={modalDetalhes}
          onClose={() => setModalDetalhes(null)}
          onEditar={() => handleEditar(modalDetalhes)}
        />
      )}

      {/* Modal Formulário */}
      {modalForm && (
        <ModalForm
          form={form} setForm={setForm}
          grupos={grupos} saving={saving} buscando={buscando}
          onBuscarCNPJ={handleBuscarCNPJ}
          onSubmit={handleSubmit}
          onClose={() => { setModalForm(false); setForm(emptyForm); setEditando(false); }}
          editando={editando}
        />
      )}
    </div>
  );
}
