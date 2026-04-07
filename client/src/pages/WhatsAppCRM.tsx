import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: number;
  nome: string;
  contexto: string;
  mensagem: string;
  ativo: boolean;
  createdAt: string;
}

interface Disparo {
  id: number;
  destinatario: string;
  numero: string;
  mensagem: string;
  status: string;
  tipo: string;
  contexto: string | null;
  createdAt: string;
  enviadoAt: string | null;
  template: { nome: string } | null;
  operador: { nome: string } | null;
  cliente: { nome: string } | null;
  fornecedor: { razaoSocial: string; nomeFantasia: string } | null;
  destinatarioUser: { nome: string } | null;
}

interface Stats {
  total: number;
  enviados: number;
  pendentes: number;
  hoje: number;
}

interface Vendedor {
  id: number;
  nome: string;
  telefone: string | null;
  loja: { nomeFantasia: string } | null;
}

interface ClienteItem {
  id: number;
  nome: string;
  telefone: string | null;
}

interface FornecedorItem {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  telefone: string | null;
  celular: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTEXTO_LABEL: Record<string, string> = {
  MOTIVACIONAL_VENDEDOR: '💪 Motivacional Vendedor',
  FOLLOWUP_CLIENTE:      '👤 Follow-up Cliente',
  FOLLOWUP_FORNECEDOR:   '🏭 Follow-up Fornecedor',
  COBRANCA:              '💰 Cobrança',
  BOAS_VINDAS:           '👋 Boas-vindas',
  CONFIRMACAO_VENDA:     '🛍️ Confirmação Venda',
  AVISO_GARANTIA:        '🛡️ Aviso Garantia',
  PERSONALIZADO:         '✏️ Personalizado',
};

const STATUS_BADGE: Record<string, string> = {
  PENDENTE:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ABERTO:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ENVIADO:   'bg-green-500/10 text-green-400 border-green-500/20',
  FALHA:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const fmtData = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ─── Componente principal ─────────────────────────────────────────────────────

export function WhatsAppCRM() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'disparar' | 'templates' | 'historico'>('disparar');
  const [stats, setStats] = useState<Stats | null>(null);

  const isAdmin = ['ADMIN_GERAL', 'DONO_LOJA', 'ADMIN_FINANCEIRO', 'ADMIN_REDE'].includes(user?.role || '');

  useEffect(() => {
    api.get<Stats>('/whatsapp/stats').then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-2xl">💬</span> WhatsApp CRM
          </h1>
          <p className="text-sm text-zinc-500">Envio de mensagens automáticas e manuais via WhatsApp</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => api.post('/whatsapp/templates/seed', {}).then(() => alert('Templates padrão criados!')).catch(() => alert('Templates já existem'))}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700 transition-colors"
          >
            ✨ Carregar Templates Padrão
          </button>
        )}
      </div>

      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total disparos', value: stats.total, color: 'text-zinc-100' },
            { label: 'Enviados', value: stats.enviados, color: 'text-green-400' },
            { label: 'Pendentes', value: stats.pendentes, color: 'text-yellow-400' },
            { label: 'Hoje', value: stats.hoje, color: 'text-orange-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {([
          { key: 'disparar',   label: '🚀 Disparar',   show: true },
          { key: 'templates',  label: '📋 Templates',  show: isAdmin },
          { key: 'historico',  label: '🕐 Histórico',  show: true },
        ] as const).filter(t => t.show).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'disparar' && <TabDisparar onSent={() => api.get<Stats>('/whatsapp/stats').then(setStats)} />}
      {tab === 'templates' && isAdmin && <TabTemplates />}
      {tab === 'historico' && <TabHistorico />}
    </div>
  );
}

// ─── Tab Disparar ─────────────────────────────────────────────────────────────

function TabDisparar({ onSent }: { onSent: () => void }) {
  const { user } = useAuth();
  const isAdmin = ['ADMIN_GERAL', 'DONO_LOJA', 'ADMIN_FINANCEIRO', 'ADMIN_REDE', 'GERENTE_LOJA'].includes(user?.role || '');

  const [modo, setModo] = useState<'vendedor' | 'cliente' | 'fornecedor' | 'avulso'>('vendedor');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorItem[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [templateId, setTemplateId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [avulsoNome, setAvulsoNome] = useState('');
  const [avulsoNumero, setAvulsoNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ nome: string; link: string; disparoId: number }[]>([]);

  const carregarDados = useCallback(async () => {
    const [tmps, vends] = await Promise.all([
      api.get<Template[]>('/whatsapp/templates'),
      api.get<Vendedor[]>('/whatsapp/vendedores'),
    ]);
    setTemplates(tmps.filter(t => t.ativo));
    setVendedores(vends);
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    if (modo === 'cliente') {
      api.get<ClienteItem[]>('/clientes').then(setClientes).catch(() => {});
    } else if (modo === 'fornecedor') {
      api.get<FornecedorItem[]>('/fornecedores').then(setFornecedores).catch(() => {});
    }
    setSelecionados(new Set());
  }, [modo]);

  useEffect(() => {
    const t = templates.find(t => String(t.id) === templateId);
    if (t) setMensagem(t.mensagem);
  }, [templateId, templates]);

  const toggleSel = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: number[]) => {
    const all = ids.every(id => selecionados.has(id));
    setSelecionados(all ? new Set() : new Set(ids));
  };

  const handleDisparar = async () => {
    if (!mensagem.trim()) return alert('Escreva uma mensagem antes de disparar.');
    setLoading(true);
    setResultado([]);
    try {
      if (modo === 'avulso') {
        if (!avulsoNumero.trim()) return alert('Informe o número do destinatário.');
        const r = await api.post<{ disparo: any; link: string }>('/whatsapp/disparar', {
          destinatario: avulsoNome || 'Contato',
          numero: avulsoNumero,
          mensagem,
          templateId: templateId || undefined,
        });
        setResultado([{ nome: avulsoNome || 'Contato', link: r.link, disparoId: r.disparo.id }]);
      } else {
        let destinatarios: { nome: string; numero: string; clienteId?: number; fornecedorId?: number; usuarioId?: number }[] = [];

        if (modo === 'vendedor') {
          destinatarios = vendedores
            .filter(v => selecionados.has(v.id) && v.telefone)
            .map(v => ({ nome: v.nome, numero: v.telefone!, usuarioId: v.id }));
        } else if (modo === 'cliente') {
          destinatarios = clientes
            .filter(c => selecionados.has(c.id) && c.telefone)
            .map(c => ({ nome: c.nome, numero: c.telefone!, clienteId: c.id }));
        } else if (modo === 'fornecedor') {
          destinatarios = fornecedores
            .filter(f => selecionados.has(f.id) && (f.telefone || f.celular))
            .map(f => ({ nome: f.nomeFantasia || f.razaoSocial, numero: (f.celular || f.telefone)!, fornecedorId: f.id }));
        }

        if (destinatarios.length === 0) return alert('Selecione ao menos um destinatário com número cadastrado.');

        const r = await api.post<{ total: number; results: { nome: string; link: string; disparoId: number }[] }>(
          '/whatsapp/disparar/bulk',
          { destinatarios, mensagem, contexto: templates.find(t => String(t.id) === templateId)?.contexto, templateId: templateId || undefined }
        );
        setResultado(r.results);
      }
      onSent();
    } catch (err) {
      alert('Erro ao gerar disparos');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirLink = async (link: string, disparoId: number) => {
    await api.patch(`/whatsapp/disparos/${disparoId}/enviado`, {});
    window.open(link, '_blank');
  };

  const handleAbrirTodos = async () => {
    for (const r of resultado) {
      await api.patch(`/whatsapp/disparos/${r.disparoId}/enviado`, {});
      window.open(r.link, '_blank');
      await new Promise(res => setTimeout(res, 400));
    }
    onSent();
  };

  const listaAtual = modo === 'vendedor' ? vendedores : modo === 'cliente' ? clientes : modo === 'fornecedor' ? fornecedores : [];
  const idsComNumero = modo === 'vendedor'
    ? vendedores.filter(v => v.telefone).map(v => v.id)
    : modo === 'cliente'
    ? clientes.filter(c => c.telefone).map(c => c.id)
    : modo === 'fornecedor'
    ? fornecedores.filter(f => f.telefone || f.celular).map(f => f.id)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Esquerda: seleção + mensagem */}
      <div className="space-y-4">
        {/* Modo */}
        <div>
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Destinatários</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'vendedor', label: '👔 Vendedores' },
              ...(isAdmin ? [
                { key: 'cliente', label: '👤 Clientes' },
                { key: 'fornecedor', label: '🏭 Fornecedores' },
              ] : []),
              { key: 'avulso', label: '✏️ Avulso' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setModo(m.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  modo === m.key
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de seleção */}
        {modo !== 'avulso' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">
                {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
              </p>
              {idsComNumero.length > 0 && (
                <button
                  onClick={() => toggleAll(idsComNumero)}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {idsComNumero.every(id => selecionados.has(id)) ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto">
              {listaAtual.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-6">Carregando...</p>
              ) : (
                listaAtual.map((item: any) => {
                  const numero = item.telefone || item.celular;
                  const nome = item.nome || item.nomeFantasia || item.razaoSocial;
                  const sub = item.loja?.nomeFantasia || item.razaoSocial || '';
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors ${!numero ? 'opacity-40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionados.has(item.id)}
                        onChange={() => numero && toggleSel(item.id)}
                        disabled={!numero}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{nome}</p>
                        {sub && <p className="text-xs text-zinc-500 truncate">{sub}</p>}
                      </div>
                      {numero ? (
                        <span className="text-xs text-green-400 font-mono flex-shrink-0">{numero}</span>
                      ) : (
                        <span className="text-xs text-red-500 flex-shrink-0">sem número</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Avulso */}
        {modo === 'avulso' && (
          <div className="space-y-3">
            <div>
              <label className="label">Nome do destinatário</label>
              <input
                className="input"
                placeholder="Ex: João Silva"
                value={avulsoNome}
                onChange={e => setAvulsoNome(e.target.value)}
              />
            </div>
            <div>
              <label className="label">WhatsApp (com DDD) *</label>
              <input
                className="input"
                placeholder="Ex: 21 99999-9999"
                value={avulsoNumero}
                onChange={e => setAvulsoNumero(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Template selector */}
        <div>
          <label className="label">Template de mensagem (opcional)</label>
          <select
            className="input"
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
          >
            <option value="">— Escrever mensagem personalizada —</option>
            {templates.map(t => (
              <option key={t.id} value={String(t.id)}>{CONTEXTO_LABEL[t.contexto] || t.contexto} — {t.nome}</option>
            ))}
          </select>
        </div>

        {/* Mensagem */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Mensagem *</label>
            <span className="text-xs text-zinc-600">{'{{nome}}'} será substituído automaticamente</span>
          </div>
          <textarea
            className="input resize-none"
            rows={6}
            placeholder="Olá, {{nome}}! Sua mensagem aqui..."
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
          />
        </div>

        <button
          onClick={handleDisparar}
          disabled={loading}
          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando links...</>
          ) : (
            <>💬 Gerar Links WhatsApp</>
          )}
        </button>
      </div>

      {/* Direita: resultado */}
      <div>
        {resultado.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 h-full min-h-[300px]">
            <span className="text-5xl">💬</span>
            <p className="text-zinc-400 text-sm font-medium">Os links aparecerão aqui</p>
            <p className="text-zinc-600 text-xs text-center">
              Selecione os destinatários, escolha ou escreva a mensagem e clique em "Gerar Links".<br />
              Cada link abre diretamente no WhatsApp com a mensagem pré-preenchida.
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200">{resultado.length} link{resultado.length !== 1 ? 's' : ''} gerado{resultado.length !== 1 ? 's' : ''}</p>
              <button
                onClick={handleAbrirTodos}
                className="text-xs px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-600/30 transition-colors"
              >
                Abrir todos ↗
              </button>
            </div>
            <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
              {resultado.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{r.nome}</p>
                    <p className="text-xs text-zinc-500 truncate">#{r.disparoId}</p>
                  </div>
                  <button
                    onClick={() => handleAbrirLink(r.link, r.disparoId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                  >
                    <span>Enviar</span>
                    <span>↗</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950">
              <p className="text-xs text-zinc-600">
                ℹ️ Cada clique em "Enviar" abre o WhatsApp com a mensagem pré-preenchida. O disparo é marcado como enviado automaticamente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Templates ────────────────────────────────────────────────────────────

function TabTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ id: 0, nome: '', contexto: 'PERSONALIZADO', mensagem: '', ativo: true });
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await api.get<Template[]>('/whatsapp/templates'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleNovo = () => {
    setForm({ id: 0, nome: '', contexto: 'PERSONALIZADO', mensagem: '', ativo: true });
    setEditando(false);
    setModalOpen(true);
  };

  const handleEditar = (t: Template) => {
    setForm({ id: t.id, nome: t.nome, contexto: t.contexto, mensagem: t.mensagem, ativo: t.ativo });
    setEditando(true);
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/whatsapp/templates/${form.id}`, form);
      } else {
        await api.post('/whatsapp/templates', form);
      }
      setModalOpen(false);
      carregar();
    } catch {
      alert('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir este template?')) return;
    await api.delete(`/whatsapp/templates/${id}`);
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Gerencie os templates de mensagem para cada contexto.</p>
        <button onClick={handleNovo} className="btn btn-primary text-sm">+ Novo Template</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Nenhum template cadastrado.</p>
          <p className="text-xs mt-1">Clique em "Carregar Templates Padrão" para começar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => (
            <div key={t.id} className={`bg-zinc-900 border rounded-xl p-4 ${t.ativo ? 'border-zinc-800' : 'border-zinc-800/40 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-zinc-200 text-sm">{t.nome}</p>
                    {!t.ativo && <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Inativo</span>}
                  </div>
                  <p className="text-xs text-orange-400">{CONTEXTO_LABEL[t.contexto] || t.contexto}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEditar(t)} className="btn btn-sm btn-secondary">Editar</button>
                  <button onClick={() => handleExcluir(t.id)} className="btn btn-sm btn-danger">Excluir</button>
                </div>
              </div>
              <p className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-zinc-800">{t.mensagem}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-zinc-100">{editando ? 'Editar Template' : 'Novo Template'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required placeholder="Ex: Motivação segunda-feira" />
              </div>
              <div>
                <label className="label">Contexto *</label>
                <select className="input" value={form.contexto} onChange={e => setForm(p => ({ ...p, contexto: e.target.value }))}>
                  {Object.entries(CONTEXTO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Mensagem *</label>
                  <span className="text-xs text-zinc-600">Use {'{{nome}}'} para o nome do destinatário</span>
                </div>
                <textarea
                  className="input resize-none"
                  rows={7}
                  value={form.mensagem}
                  onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))}
                  required
                  placeholder="Olá, {{nome}}! Sua mensagem aqui..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
                <label htmlFor="ativo" className="text-sm text-zinc-400">Template ativo</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 btn btn-primary disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Histórico ────────────────────────────────────────────────────────────

function TabHistorico() {
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCtx, setFiltroCtx] = useState('');
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroCtx) params.set('contexto', filtroCtx);
      const r = await api.get<{ disparos: Disparo[]; total: number; pages: number }>(`/whatsapp/disparos?${params}`);
      setDisparos(r.disparos);
      setTotal(r.total);
      setPages(r.pages);
    } finally {
      setLoading(false);
    }
  }, [page, filtroStatus, filtroCtx]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setPage(1); }, [filtroStatus, filtroCtx]);

  const handleReenviar = async (d: Disparo) => {
    const link = `https://wa.me/${d.numero}?text=${encodeURIComponent(d.mensagem)}`;
    await api.patch(`/whatsapp/disparos/${d.id}/enviado`, {});
    window.open(link, '_blank');
    carregar();
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select className="input !w-auto text-sm" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="ENVIADO">Enviado</option>
          <option value="FALHA">Falha</option>
        </select>
        <select className="input !w-auto text-sm" value={filtroCtx} onChange={e => setFiltroCtx(e.target.value)}>
          <option value="">Todos os contextos</option>
          {Object.entries(CONTEXTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-xs text-zinc-500 self-center">{total} registro{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disparos.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-4xl mb-3">🕐</p>
          <p>Nenhum disparo encontrado.</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {disparos.map(d => {
                const destinatarioFinal = d.destinatarioUser?.nome || d.cliente?.nome || d.fornecedor?.nomeFantasia || d.fornecedor?.razaoSocial || d.destinatario;
                return (
                  <div key={d.id} className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{destinatarioFinal}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[d.status] || STATUS_BADGE.PENDENTE}`}>{d.status}</span>
                        {d.contexto && <span className="text-xs text-zinc-500">{CONTEXTO_LABEL[d.contexto] || d.contexto}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono truncate">{d.numero}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{d.mensagem.slice(0, 80)}...</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {fmtData(d.createdAt)}
                        {d.operador && <> · por {d.operador.nome}</>}
                        {d.template && <> · template: {d.template.nome}</>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReenviar(d)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-600/30 transition-colors"
                    >
                      ↗ Reenviar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paginação */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-zinc-700 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">← Anterior</button>
              <span className="text-xs text-zinc-500">Página {page} de {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-xs border border-zinc-700 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
