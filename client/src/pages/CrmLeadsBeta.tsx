import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Loja {
  id: number; nomeFantasia: string; razaoSocial?: string;
  regiao?: string; bairrosAtendidos?: string; cidade?: string; uf?: string; endereco?: string;
}
interface VendedorLista {
  id: number; nome: string; email: string; telefone?: string;
  loja?: { id: number; nomeFantasia: string; };
}
interface LeadInteracao {
  id: number; tipo: string; descricao: string; createdAt: string;
  usuario: { id: number; nome: string; };
}
interface Lead {
  id: number; nome: string; telefone?: string; email?: string;
  origem: string; campanha?: string; interesse: string;
  interesseCorrigido?: string;
  lojaId?: number; vendedorId?: number;
  repassadoPorId?: number; dataRepasseVendedor?: string;
  status: string; prioridade: string;
  resumo?: string; proximaAcao?: string;
  mensagemWhatsApp?: string;
  dataProximoFollowUp?: string; observacoes?: string;
  whatsappComercialOrigem?: string; canalOrigem?: string;
  mensagemRecebida?: string; linkConversa?: string;
  regiaoCliente?: string; bairroCliente?: string;
  cidadeCliente?: string; ufCliente?: string;
  lojaSugerida?: string; motivoLojaSugerida?: string;
  origemRepasse?: string;
  createdAt: string; updatedAt: string;
  loja?: { id: number; nomeFantasia: string; regiao?: string; cidade?: string; };
  vendedor?: { id: number; nome: string; telefone?: string; };
  repassadoPor?: { id: number; nome: string; };
  interacoes?: LeadInteracao[];
}
interface DashboardData {
  total: number; ganhos: number; perdidos: number; taxaConversao: number;
  novosUltimaSemana: number; novosUltimoMes: number;
  porStatus:     { status: string; total: number; }[];
  porOrigem:     { origem: string; total: number; }[];
  porPrioridade: { prioridade: string; total: number; }[];
  porLoja:       { lojaId: number; nome: string; total: number; }[];
  porVendedor:   { vendedorId: number; nome: string; total: number; }[];
}

// ── Labels e cores ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NOVO: 'Novo', EM_ATENDIMENTO: 'Em Atendimento', PROPOSTA_ENVIADA: 'Proposta Enviada',
  GANHO: 'Ganho', PERDIDO: 'Perdido', SEM_RESPOSTA: 'Sem Resposta',
};
const STATUS_CLS: Record<string, string> = {
  NOVO: 'bg-blue-500/20 text-blue-400',
  EM_ATENDIMENTO: 'bg-yellow-500/20 text-yellow-400',
  PROPOSTA_ENVIADA: 'bg-purple-500/20 text-purple-400',
  GANHO: 'bg-green-500/20 text-green-400',
  PERDIDO: 'bg-red-500/20 text-red-400',
  SEM_RESPOSTA: 'bg-zinc-500/20 text-zinc-400',
};
const PRIORIDADE_CLS: Record<string, string> = {
  ALTA: 'bg-red-500/20 text-red-400',
  MEDIA: 'bg-yellow-500/20 text-yellow-400',
  BAIXA: 'bg-zinc-500/20 text-zinc-400',
};
const ORIGEM_ICON: Record<string, string> = {
  META: '📘', GOOGLE: '🔍', SITE: '🌐', WHATSAPP: '💬',
  INDICACAO: '🤝', OUTRO: '📌', TESTE: '🧪',
};
const TIPO_INTERACAO_ICON: Record<string, string> = {
  LIGACAO: '📞', WHATSAPP: '💬', EMAIL: '📧', OBSERVACAO: '📝', FOLLOW_UP: '🔔',
};

const STATUSES  = ['NOVO', 'EM_ATENDIMENTO', 'PROPOSTA_ENVIADA', 'GANHO', 'PERDIDO', 'SEM_RESPOSTA'];
const ORIGENS   = ['META', 'GOOGLE', 'SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO'];
const INTERESSES = ['MOTO', 'PECA', 'SERVICO', 'CURSO', 'OUTRO'];
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAIXA'];
const TIPOS_INTERACAO = ['LIGACAO', 'WHATSAPP', 'EMAIL', 'OBSERVACAO', 'FOLLOW_UP'];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </Card>
  );
}

function Badge({ cls, label }: { cls: string; label: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Modal Criar Lead ──────────────────────────────────────────────────────────

function ModalCriarLead({ lojas, vendedores, onClose, onSalvo }: {
  lojas: Loja[]; vendedores: VendedorLista[];
  onClose: () => void; onSalvo: (lead: Lead) => void;
}) {
  const inp = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-500';
  const lbl = 'block text-xs text-zinc-400 mb-1';
  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', origem: 'OUTRO', campanha: '',
    interesse: 'MOTO', lojaId: '', vendedorId: '', status: 'NOVO',
    prioridade: 'MEDIA', resumo: '', proximaAcao: '', dataProximoFollowUp: '', observacoes: '',
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setErro('Nome obrigatório'); return; }
    setSaving(true); setErro('');
    try {
      const lead = await api.post<Lead>('/crm-leads', {
        ...form,
        lojaId: form.lojaId ? Number(form.lojaId) : null,
        vendedorId: form.vendedorId ? Number(form.vendedorId) : null,
        dataProximoFollowUp: form.dataProximoFollowUp || null,
      });
      onSalvo(lead);
    } catch (e: any) { setErro(e.message || 'Erro ao criar lead'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">➕ Novo Lead</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={lbl}>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} required className={inp} placeholder="Nome completo" />
            </div>
            <div>
              <label className={lbl}>Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inp} placeholder="21 99999-9999" />
            </div>
            <div>
              <label className={lbl}>E-mail</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} type="email" className={inp} placeholder="email@exemplo.com" />
            </div>
          </div>
          {/* Origem e interesse */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Origem</label>
              <select value={form.origem} onChange={e => set('origem', e.target.value)} className={inp}>
                {ORIGENS.map(o => <option key={o} value={o}>{ORIGEM_ICON[o]} {o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Interesse</label>
              <select value={form.interesse} onChange={e => set('interesse', e.target.value)} className={inp}>
                {INTERESSES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Prioridade</label>
              <select value={form.prioridade} onChange={e => set('prioridade', e.target.value)} className={inp}>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {/* Campanha + Loja + Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Campanha</label>
              <input value={form.campanha} onChange={e => set('campanha', e.target.value)} className={inp} placeholder="Ex: TM Recreio Maio" />
            </div>
            <div>
              <label className={lbl}>Loja</label>
              <select value={form.lojaId} onChange={e => set('lojaId', e.target.value)} className={inp}>
                <option value="">Selecione...</option>
                {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Vendedor</label>
              <select value={form.vendedorId} onChange={e => set('vendedorId', e.target.value)} className={inp}>
                <option value="">Selecione...</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
          </div>
          {/* Resumo + próxima ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Resumo / Mensagem</label>
              <textarea value={form.resumo} onChange={e => set('resumo', e.target.value)} rows={2} className={inp} placeholder="O que o lead disse ou busca..." />
            </div>
            <div>
              <label className={lbl}>Próxima Ação</label>
              <textarea value={form.proximaAcao} onChange={e => set('proximaAcao', e.target.value)} rows={2} className={inp} placeholder="Ex: Ligar amanhã às 10h" />
            </div>
            <div>
              <label className={lbl}>Data Follow-Up</label>
              <input value={form.dataProximoFollowUp} onChange={e => set('dataProximoFollowUp', e.target.value)} type="datetime-local" className={inp} />
            </div>
            <div>
              <label className={lbl}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} className={inp} placeholder="Notas adicionais..." />
            </div>
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
              {saving ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Detalhes / Interações ───────────────────────────────────────────────

function PainelDetalhe({ lead, onClose, onAtualizado }: {
  lead: Lead;
  onClose: () => void; onAtualizado: (l: Lead) => void;
}) {
  const inp  = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-500';
  const lbl  = 'block text-xs text-zinc-400 mb-1';
  const [aba, setAba] = useState<'info' | 'interacoes'>('info');
  const [tipoInt, setTipoInt] = useState('OBSERVACAO');
  const [descInt, setDescInt] = useState('');
  const [savingInt, setSavingInt] = useState(false);
  const [erroInt, setErroInt] = useState('');
  const [novoStatus, setNovoStatus] = useState(lead.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [novaAcao, setNovaAcao]   = useState(lead.proximaAcao || '');
  const [novoFollowUp, setNovoFollowUp] = useState(
    lead.dataProximoFollowUp ? lead.dataProximoFollowUp.slice(0, 16) : ''
  );
  const [savingAcao, setSavingAcao] = useState(false);
  const [detalhe, setDetalhe] = useState<Lead>(lead);
  const [showRepasse, setShowRepasse] = useState(false);

  async function registrarInteracao() {
    if (!descInt.trim()) { setErroInt('Descreva a interação'); return; }
    setSavingInt(true); setErroInt('');
    try {
      await api.post(`/crm-leads/${lead.id}/interacoes`, { tipo: tipoInt, descricao: descInt });
      const atualizado = await api.get<Lead>(`/crm-leads/${lead.id}`);
      setDetalhe(atualizado); onAtualizado(atualizado); setDescInt('');
    } catch (e: any) { setErroInt(e.message || 'Erro'); }
    finally { setSavingInt(false); }
  }

  async function alterarStatus() {
    if (novoStatus === detalhe.status) return;
    setSavingStatus(true);
    try {
      const atualizado = await api.patch<Lead>(`/crm-leads/${lead.id}`, { status: novoStatus });
      setDetalhe(atualizado); onAtualizado(atualizado);
    } catch { /* silencia */ }
    finally { setSavingStatus(false); }
  }

  async function salvarAcao() {
    setSavingAcao(true);
    try {
      const atualizado = await api.patch<Lead>(`/crm-leads/${lead.id}`, {
        proximaAcao: novaAcao,
        dataProximoFollowUp: novoFollowUp || null,
      });
      setDetalhe(atualizado); onAtualizado(atualizado);
    } catch { /* silencia */ }
    finally { setSavingAcao(false); }
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 p-0" onClick={onClose}>
      <div className="bg-zinc-900 border-l border-zinc-700 w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{detalhe.nome}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {ORIGEM_ICON[detalhe.origem]} {detalhe.origem}
              {detalhe.campanha && <span className="ml-2 text-zinc-500">· {detalhe.campanha}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <button onClick={() => setShowRepasse(true)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              🤝 Passar Bastão
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">✕</button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 px-5 py-3 border-b border-zinc-800 flex-wrap flex-shrink-0">
          <Badge cls={STATUS_CLS[detalhe.status]} label={STATUS_LABEL[detalhe.status]} />
          <Badge cls={PRIORIDADE_CLS[detalhe.prioridade]} label={detalhe.prioridade} />
          <Badge cls="bg-zinc-700 text-zinc-300" label={`🏷 ${detalhe.interesse}`} />
          {detalhe.interesseCorrigido && (
            <Badge cls="bg-blue-500/20 text-blue-300 border border-blue-500/30" label={`🤖 ${detalhe.interesseCorrigido}`} />
          )}
          {detalhe.loja && <Badge cls="bg-zinc-700 text-zinc-300" label={detalhe.loja.nomeFantasia} />}
          {detalhe.vendedor && <Badge cls="bg-zinc-700 text-zinc-300" label={`👤 ${detalhe.vendedor.nome}`} />}
        </div>

        {/* Abas */}
        <div className="flex border-b border-zinc-800 flex-shrink-0">
          {(['info', 'interacoes'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${aba === a ? 'text-orange-400 border-b-2 border-orange-400' : 'text-zinc-400 hover:text-white'}`}>
              {a === 'info' ? '📋 Informações' : `💬 Interações (${detalhe.interacoes?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {aba === 'info' && (
            <>
              {/* Contato */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detalhe.telefone && <div><p className="text-zinc-500 text-xs">Telefone</p><p className="text-white">{detalhe.telefone}</p></div>}
                {detalhe.email    && <div><p className="text-zinc-500 text-xs">E-mail</p><p className="text-white">{detalhe.email}</p></div>}
                <div><p className="text-zinc-500 text-xs">Criado em</p><p className="text-white">{fmtDate(detalhe.createdAt)}</p></div>
                <div><p className="text-zinc-500 text-xs">Atualizado</p><p className="text-white">{fmtDate(detalhe.updatedAt)}</p></div>
              </div>
              {/* Análise Claude */}
              {(detalhe.resumo || detalhe.proximaAcao || detalhe.mensagemWhatsApp || detalhe.interesseCorrigido) && (
                <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4 space-y-3">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">🤖 Análise Claude / n8n</p>
                  {detalhe.interesseCorrigido && detalhe.interesseCorrigido !== detalhe.interesse && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Interesse Corrigido pela IA</p>
                      <p className="text-blue-300 text-sm font-medium">{detalhe.interesseCorrigido}</p>
                      <p className="text-zinc-600 text-xs">Original declarado: {detalhe.interesse}</p>
                    </div>
                  )}
                  {detalhe.resumo && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Resumo da Conversa</p>
                      <p className="text-zinc-200 text-sm bg-zinc-800/60 rounded-lg px-3 py-2 leading-relaxed">{detalhe.resumo}</p>
                    </div>
                  )}
                  {detalhe.proximaAcao && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">🎯 Próxima Ação Sugerida</p>
                      <p className="text-orange-300 text-sm font-medium bg-orange-950/30 border border-orange-800/30 rounded-lg px-3 py-2">{detalhe.proximaAcao}</p>
                    </div>
                  )}
                  {detalhe.mensagemWhatsApp && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">💬 Mensagem WhatsApp Sugerida</p>
                      <div className="bg-green-950/30 border border-green-800/30 rounded-lg px-3 py-2">
                        <p className="text-green-300 text-sm leading-relaxed whitespace-pre-wrap">{detalhe.mensagemWhatsApp}</p>
                      </div>
                      {detalhe.telefone && (
                        <a
                          href={`https://wa.me/55${detalhe.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(detalhe.mensagemWhatsApp)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                          📲 Abrir no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {detalhe.observacoes && (
                <div><p className="text-zinc-500 text-xs mb-1">Observações</p>
                  <p className="text-zinc-300 text-sm bg-zinc-800 rounded-lg px-3 py-2">{detalhe.observacoes}</p></div>
              )}

              {/* Vendedor Responsável */}
              {detalhe.vendedor ? (
                <div className="bg-orange-950/20 border border-orange-800/30 rounded-xl p-4 space-y-2">
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">🤝 Vendedor Responsável</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm">{detalhe.vendedor.nome}</p>
                        {detalhe.origemRepasse && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            detalhe.origemRepasse === 'AUTO_REGIAO'
                              ? 'bg-teal-500/20 text-teal-400'
                              : 'bg-zinc-600/40 text-zinc-300'
                          }`}>
                            {detalhe.origemRepasse === 'AUTO_REGIAO' ? '🤖 Auto-Região' : detalhe.origemRepasse}
                          </span>
                        )}
                      </div>
                      {detalhe.repassadoPor && (
                        <p className="text-zinc-500 text-xs">Repassado por {detalhe.repassadoPor.nome}</p>
                      )}
                      {detalhe.dataRepasseVendedor && (
                        <p className="text-zinc-500 text-xs">em {fmtDate(detalhe.dataRepasseVendedor)}</p>
                      )}
                    </div>
                    {detalhe.vendedor.telefone && (
                      <a href={`https://wa.me/55${detalhe.vendedor.telefone.replace(/\D/g,'')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                        📲 WhatsApp
                      </a>
                    )}
                  </div>
                  <button onClick={() => setShowRepasse(true)}
                    className="w-full text-xs text-orange-400 hover:text-orange-300 border border-orange-800/40 hover:border-orange-600/40 rounded-lg py-1.5 transition-colors">
                    Alterar vendedor responsável
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowRepasse(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-orange-600/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 rounded-xl py-3 text-sm font-medium transition-colors">
                  🤝 Passar Bastão — Atribuir Vendedor
                </button>
              )}

              {/* Região do Cliente & Atribuição Automática */}
              {(detalhe.regiaoCliente || detalhe.bairroCliente || detalhe.cidadeCliente || detalhe.lojaSugerida) && (
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                  <p className="text-teal-400 text-xs font-semibold uppercase tracking-wider">🗺️ Região do Cliente</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {detalhe.regiaoCliente && (
                      <div>
                        <p className="text-zinc-500 text-xs">Região</p>
                        <p className="text-white font-medium">{detalhe.regiaoCliente}</p>
                      </div>
                    )}
                    {detalhe.bairroCliente && (
                      <div>
                        <p className="text-zinc-500 text-xs">Bairro</p>
                        <p className="text-white">{detalhe.bairroCliente}</p>
                      </div>
                    )}
                    {detalhe.cidadeCliente && (
                      <div>
                        <p className="text-zinc-500 text-xs">Cidade</p>
                        <p className="text-white">{detalhe.cidadeCliente}{detalhe.ufCliente ? ` / ${detalhe.ufCliente}` : ''}</p>
                      </div>
                    )}
                    {detalhe.loja && (
                      <div>
                        <p className="text-zinc-500 text-xs">Loja Atribuída</p>
                        <p className="text-teal-300 font-medium">{detalhe.loja.nomeFantasia}</p>
                        {detalhe.loja.regiao && <p className="text-zinc-500 text-xs">Região: {detalhe.loja.regiao}</p>}
                      </div>
                    )}
                  </div>
                  {detalhe.lojaSugerida && (
                    <div>
                      <p className="text-zinc-500 text-xs">Loja Sugerida pela Claude</p>
                      <p className="text-teal-300 text-sm font-medium">{detalhe.lojaSugerida}</p>
                    </div>
                  )}
                  {detalhe.motivoLojaSugerida && (
                    <div>
                      <p className="text-zinc-500 text-xs">Motivo da Sugestão</p>
                      <p className="text-zinc-300 text-sm bg-zinc-800 rounded-lg px-3 py-2 leading-relaxed">{detalhe.motivoLojaSugerida}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Alterar status */}
              <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">🔄 Alterar Status</p>
                <div className="flex gap-2">
                  <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)} className={`${inp} flex-1`}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <button onClick={alterarStatus} disabled={savingStatus || novoStatus === detalhe.status}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    {savingStatus ? '...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {/* Próxima ação */}
              <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">🎯 Próxima Ação</p>
                <div>
                  <label className={lbl}>Descrição</label>
                  <input value={novaAcao} onChange={e => setNovaAcao(e.target.value)} className={inp} placeholder="Ex: Ligar amanhã às 10h" />
                </div>
                <div>
                  <label className={lbl}>Data Follow-Up</label>
                  <input value={novoFollowUp} onChange={e => setNovoFollowUp(e.target.value)} type="datetime-local" className={inp} />
                </div>
                <button onClick={salvarAcao} disabled={savingAcao}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  {savingAcao ? 'Salvando...' : 'Salvar Próxima Ação'}
                </button>
              </div>
            </>
          )}

          {aba === 'interacoes' && (
            <>
              {/* Registrar nova interação */}
              <div className="border border-zinc-700 rounded-lg p-4 space-y-2">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">➕ Registrar Interação</p>
                <div className="flex gap-2">
                  <select value={tipoInt} onChange={e => setTipoInt(e.target.value)} className={`${inp} max-w-[180px]`}>
                    {TIPOS_INTERACAO.map(t => <option key={t} value={t}>{TIPO_INTERACAO_ICON[t]} {t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <textarea value={descInt} onChange={e => setDescInt(e.target.value)} rows={2} className={inp}
                  placeholder="Descreva o que aconteceu..." />
                {erroInt && <p className="text-red-400 text-xs">{erroInt}</p>}
                <button onClick={registrarInteracao} disabled={savingInt}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-1.5 rounded-lg text-sm font-medium">
                  {savingInt ? 'Salvando...' : 'Registrar'}
                </button>
              </div>

              {/* Histórico */}
              <div className="space-y-2">
                {(detalhe.interacoes ?? []).length === 0 && (
                  <p className="text-center text-zinc-500 py-6 text-sm">Sem interações ainda</p>
                )}
                {(detalhe.interacoes ?? []).map(i => (
                  <div key={i.id} className="bg-zinc-800 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-300">
                        {TIPO_INTERACAO_ICON[i.tipo]} {i.tipo.replace('_', ' ')} · {i.usuario.nome}
                      </span>
                      <span className="text-xs text-zinc-500">{fmtDate(i.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-300">{i.descricao}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {showRepasse && (
      <ModalPassarBastao
        lead={detalhe}
        onClose={() => setShowRepasse(false)}
        onConfirmado={(atualizado) => {
          setDetalhe(atualizado);
          onAtualizado(atualizado);
          setShowRepasse(false);
        }}
      />
    )}
    </>
  );
}

// ── Modal Passar Bastão ────────────────────────────────────────────────────────

interface ModalPassarBastaoProps {
  lead: Lead;
  onClose: () => void;
  onConfirmado: (l: Lead) => void;
}

function ModalPassarBastao({ lead, onClose, onConfirmado }: ModalPassarBastaoProps) {
  const [vendedores, setVendedores] = useState<VendedorLista[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(lead.vendedorId ?? null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VendedorLista[]>('/crm-leads/vendedores')
      .then(v => { setVendedores(v); setLoading(false); })
      .catch(() => { setErro('Erro ao carregar vendedores'); setLoading(false); });
  }, []);

  const vendedorSel = vendedores.find(v => v.id === selectedId);

  const msgSugerida = `Novo lead recebido:
Nome: ${lead.nome}
Telefone: ${lead.telefone ?? '—'}
Origem: ${lead.origem}
Campanha: ${lead.campanha ?? '—'}
Interesse: ${lead.interesseCorrigido || lead.interesse}
Prioridade: ${lead.prioridade}
Resumo: ${lead.resumo ?? '—'}
Próxima ação: ${lead.proximaAcao ?? '—'}`;

  async function confirmar() {
    if (!selectedId) { setErro('Selecione um vendedor'); return; }
    setSaving(true); setErro('');
    try {
      const atualizado = await api.post<Lead>(`/crm-leads/${lead.id}/repasse`, { vendedorId: selectedId });
      onConfirmado(atualizado);
    } catch (e: any) { setErro(e.message || 'Erro ao repassar lead'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-white">🤝 Passar Bastão</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Atribuir lead <span className="text-orange-400 font-medium">{lead.nome}</span> a um vendedor</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Selecionar vendedor */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wide">Selecionar Vendedor</label>
            {loading ? (
              <p className="text-zinc-500 text-sm">Carregando vendedores...</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {vendedores.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">Nenhum vendedor ativo encontrado</p>
                )}
                {vendedores.map(v => (
                  <button key={v.id} onClick={() => setSelectedId(v.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                      selectedId === v.id
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                    }`}>
                    <div className="text-left">
                      <p className="font-medium">{v.nome}</p>
                      <p className="text-xs text-zinc-500">{v.loja?.nomeFantasia ?? 'Sem loja'}</p>
                    </div>
                    {v.telefone && (
                      <span className="text-xs text-green-400">{v.telefone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem sugerida + link WhatsApp do vendedor */}
          {vendedorSel && (
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-3">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">💬 Mensagem para Vendedor</p>
              <pre className="text-green-300 text-xs whitespace-pre-wrap leading-relaxed bg-green-950/20 border border-green-800/30 rounded-lg px-3 py-2">{msgSugerida}</pre>
              {vendedorSel.telefone ? (
                <a href={`https://wa.me/55${vendedorSel.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msgSugerida)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
                  📲 Abrir WhatsApp do Vendedor
                </a>
              ) : (
                <p className="text-zinc-500 text-xs">Vendedor sem telefone cadastrado</p>
              )}
            </div>
          )}

          {erro && <p className="text-red-400 text-xs">{erro}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button onClick={confirmar} disabled={saving || !selectedId}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {saving ? 'Repassando...' : '✅ Confirmar Repasse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

function DashboardKpis({ data }: { data: DashboardData }) {
  const barra = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total de Leads" value={data.total} />
        <KpiCard label="Ganhos" value={data.ganhos} color="text-green-400" sub={`${data.taxaConversao}% conversão`} />
        <KpiCard label="Perdidos" value={data.perdidos} color="text-red-400" />
        <KpiCard label="Novos (7 dias)" value={data.novosUltimaSemana} sub={`${data.novosUltimoMes} no mês`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Por status */}
        <Card className="p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-3">Por Status</p>
          <div className="space-y-2">
            {data.porStatus.map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-zinc-300">{STATUS_LABEL[s.status] ?? s.status}</span>
                  <span className="text-zinc-400">{s.total}</span>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${barra(s.total, data.total)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        {/* Por origem */}
        <Card className="p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-3">Por Origem</p>
          <div className="space-y-1.5">
            {data.porOrigem.map(o => (
              <div key={o.origem} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{ORIGEM_ICON[o.origem]} {o.origem}</span>
                <span className="text-sm font-medium text-white">{o.total}</span>
              </div>
            ))}
          </div>
        </Card>
        {/* Top vendedores */}
        <Card className="p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-3">Top Vendedores (Leads)</p>
          <div className="space-y-1.5">
            {data.porVendedor.slice(0, 5).map((v, i) => (
              <div key={v.vendedorId ?? i} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 truncate mr-2">{v.nome || 'Não atribuído'}</span>
                <span className="text-sm font-medium text-white">{v.total}</span>
              </div>
            ))}
            {data.porVendedor.length === 0 && <p className="text-xs text-zinc-500">Sem dados</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function CrmLeadsBeta() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [vendedores, setVendedores] = useState<VendedorLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<'dashboard' | 'leads' | 'regioes'>('dashboard');
  const [lojasRegiao, setLojasRegiao] = useState<Loja[]>([]);
  const [editandoLoja, setEditandoLoja] = useState<Loja | null>(null);
  const [savingLoja, setSavingLoja] = useState(false);
  const [showCriar, setShowCriar] = useState(false);
  const [leadDetalhe, setLeadDetalhe] = useState<Lead | null>(null);

  // Filtros
  const [fStatus, setFStatus] = useState('');
  const [fOrigem, setFOrigem] = useState('');
  const [fPrioridade, setFPrioridade] = useState('');
  const [fBusca, setFBusca] = useState('');

  const sel = 'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500';

  const loadAll = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const params = new URLSearchParams();
      if (fStatus)     params.set('status', fStatus);
      if (fOrigem)     params.set('origem', fOrigem);
      if (fPrioridade) params.set('prioridade', fPrioridade);
      if (fBusca)      params.set('busca', fBusca);

      const [l, d, lj, vs, lr] = await Promise.all([
        api.get<Lead[]>(`/crm-leads?${params}`),
        api.get<DashboardData>('/crm-leads/dashboard'),
        api.get<any>('/lojas?limit=50'),
        api.get<any>('/usuarios?limit=200'),
        api.get<Loja[]>('/crm-leads/lojas'),
      ]);
      setLeads(Array.isArray(l) ? l : []);
      setDashboard(d);
      const lojasList: any[] = Array.isArray(lj) ? lj : lj?.lojas ?? lj?.data ?? [];
      setLojas(lojasList.map((x: any) => ({ id: x.id, nomeFantasia: x.nomeFantasia || x.razaoSocial })));
      const vsList: any[] = Array.isArray(vs) ? vs : vs?.usuarios ?? vs?.data ?? [];
      setVendedores(vsList.filter((u: any) => ['VENDEDOR', 'GERENTE_LOJA'].includes(u.role)));
      setLojasRegiao(Array.isArray(lr) ? lr : []);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar CRM Leads');
    } finally { setLoading(false); }
  }, [fStatus, fOrigem, fPrioridade, fBusca]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function atualizarLead(lead: Lead) {
    setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
    if (leadDetalhe?.id === lead.id) setLeadDetalhe(lead);
  }

  async function salvarLoja() {
    if (!editandoLoja) return;
    setSavingLoja(true);
    try {
      const atualizada = await api.patch<Loja>(`/crm-leads/lojas/${editandoLoja.id}`, {
        regiao:           editandoLoja.regiao || null,
        bairrosAtendidos: editandoLoja.bairrosAtendidos || null,
        cidade:           editandoLoja.cidade || null,
        uf:               editandoLoja.uf || null,
      });
      setLojasRegiao(prev => prev.map(l => l.id === atualizada.id ? { ...l, ...atualizada } : l));
      setEditandoLoja(null);
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar configuração da loja');
    } finally { setSavingLoja(false); }
  }

  async function excluirLead(lead: Lead) {
    if (!confirm(`Excluir o lead "${lead.nome}"?\n\nEsta ação apagará o lead e todo o histórico de interações permanentemente.`)) return;
    try {
      await api.delete(`/crm-leads/${lead.id}`);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      if (leadDetalhe?.id === lead.id) setLeadDetalhe(null);
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir lead');
    }
  }

  if (loading && leads.length === 0) return (
    <div className="p-12 text-center text-zinc-400">Carregando CRM Leads Beta...</div>
  );

  if (erro && leads.length === 0) return (
    <div className="p-12 text-center">
      <p className="text-red-400 mb-4">{erro}</p>
      <button onClick={loadAll} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm">Tentar novamente</button>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">CRM Leads</h1>
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-2 py-0.5 rounded-full font-medium">BETA</span>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">Captação e acompanhamento de leads comerciais · Acesso restrito</p>
        </div>
        <button onClick={() => setShowCriar(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Novo Lead
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-zinc-800 p-1 rounded-lg w-fit">
        <button onClick={() => setAba('dashboard')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${aba === 'dashboard' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
          📊 Dashboard
        </button>
        <button onClick={() => setAba('leads')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${aba === 'leads' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
          📋 Leads ({leads.length})
        </button>
        <button onClick={() => setAba('regioes')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${aba === 'regioes' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
          🗺️ Regiões das Lojas
        </button>
      </div>

      {/* Dashboard */}
      {aba === 'dashboard' && dashboard && <DashboardKpis data={dashboard} />}

      {/* Tabela de leads */}
      {aba === 'leads' && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <input value={fBusca} onChange={e => setFBusca(e.target.value)}
              placeholder="🔍 Buscar por nome, telefone, email..." className={`${sel} min-w-[220px]`} />
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={sel}>
              <option value="">Todos os status</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select value={fOrigem} onChange={e => setFOrigem(e.target.value)} className={sel}>
              <option value="">Todas as origens</option>
              {ORIGENS.map(o => <option key={o} value={o}>{ORIGEM_ICON[o]} {o}</option>)}
            </select>
            <select value={fPrioridade} onChange={e => setFPrioridade(e.target.value)} className={sel}>
              <option value="">Todas as prioridades</option>
              {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={loadAll} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg text-sm">
              🔄 Aplicar
            </button>
          </div>

          {/* Tabela */}
          <Card className="overflow-hidden">
            {leads.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-lg font-medium text-zinc-300 mb-1">Nenhum lead encontrado</p>
                <p className="text-sm">Crie o primeiro lead ou ajuste os filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-400 text-xs uppercase border-b border-zinc-800">
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3">Interesse</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Loja</th>
                      <th className="px-4 py-3">Vendedor</th>
                      <th className="px-4 py-3">Follow-Up</th>
                      <th className="px-4 py-3">Criado</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{lead.nome}</p>
                          {lead.telefone && <p className="text-zinc-400 text-xs">{lead.telefone}</p>}
                          {lead.email && <p className="text-zinc-500 text-xs truncate max-w-[150px]">{lead.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {ORIGEM_ICON[lead.origem]} {lead.origem}
                          {lead.campanha && <p className="text-zinc-500 text-xs truncate max-w-[120px]">{lead.campanha}</p>}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {lead.interesseCorrigido ? (
                            <span title={`IA corrigiu para: ${lead.interesseCorrigido}`}>
                              <span className="text-blue-300 font-medium">{lead.interesseCorrigido}</span>
                              <span className="text-zinc-600 text-xs ml-1">(🤖)</span>
                            </span>
                          ) : lead.interesse}
                        </td>
                        <td className="px-4 py-3">
                          <Badge cls={STATUS_CLS[lead.status]} label={STATUS_LABEL[lead.status]} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Badge cls={PRIORIDADE_CLS[lead.prioridade]} label={lead.prioridade} />
                            {lead.resumo && <span title="Análise Claude disponível" className="text-blue-400 text-xs">🤖</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{lead.loja?.nomeFantasia ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">{lead.vendedor?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                          {lead.dataProximoFollowUp ? (
                            <span className={new Date(lead.dataProximoFollowUp) < new Date() ? 'text-red-400' : 'text-zinc-300'}>
                              {fmtDate(lead.dataProximoFollowUp)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setLeadDetalhe(lead)}
                              className="text-orange-400 hover:text-orange-300 text-xs font-medium px-2 py-1 bg-orange-500/10 rounded">
                              Detalhes →
                            </button>
                            <button onClick={() => excluirLead(lead)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                              title="Excluir lead">
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Aba Regiões das Lojas */}
      {aba === 'regioes' && (
        <div className="space-y-4">
          <div className="bg-teal-950/30 border border-teal-800/30 rounded-xl p-4">
            <p className="text-teal-300 text-sm font-medium mb-1">🗺️ Configuração de Regiões para Atribuição Automática</p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Configure a <strong className="text-zinc-300">região</strong>, os <strong className="text-zinc-300">bairros atendidos</strong> e a <strong className="text-zinc-300">cidade</strong> de cada loja.
              Quando o n8n/Claude enviar um lead com dados de localização, o sistema usará essas informações para atribuir automaticamente ao vendedor correto via rodízio.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-zinc-400">
              <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                <p className="text-teal-400 font-semibold mb-1">Prioridade 1</p>
                <p>lojaId explícito no payload</p>
              </div>
              <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                <p className="text-teal-400 font-semibold mb-1">Prioridade 2</p>
                <p>lojaSugerida → nomeFantasia contém</p>
              </div>
              <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                <p className="text-teal-400 font-semibold mb-1">Prioridade 3–5</p>
                <p>regiaoCliente → bairroCliente → cidadeCliente</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lojasRegiao.map(loja => (
              <Card key={loja.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{loja.nomeFantasia || loja.razaoSocial}</p>
                    {loja.endereco && <p className="text-zinc-500 text-xs">{loja.endereco}</p>}
                  </div>
                  <button onClick={() => setEditandoLoja(editandoLoja?.id === loja.id ? null : { ...loja })}
                    className="text-xs text-orange-400 hover:text-orange-300 border border-orange-800/40 hover:border-orange-600 px-2 py-1 rounded-lg transition-colors">
                    {editandoLoja?.id === loja.id ? 'Cancelar' : '✏️ Editar'}
                  </button>
                </div>

                {editandoLoja?.id === loja.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Região</label>
                        <input value={editandoLoja.regiao || ''}
                          onChange={e => setEditandoLoja(p => p ? { ...p, regiao: e.target.value } : p)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                          placeholder="Ex: Recreio, Copacabana, Campo Grande..." />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Cidade</label>
                        <input value={editandoLoja.cidade || ''}
                          onChange={e => setEditandoLoja(p => p ? { ...p, cidade: e.target.value } : p)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                          placeholder="Ex: Rio de Janeiro" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Bairros Atendidos</label>
                        <input value={editandoLoja.bairrosAtendidos || ''}
                          onChange={e => setEditandoLoja(p => p ? { ...p, bairrosAtendidos: e.target.value } : p)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                          placeholder="Ex: Recreio dos Bandeirantes, Barra da Tijuca..." />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">UF</label>
                        <input value={editandoLoja.uf || ''} maxLength={2}
                          onChange={e => setEditandoLoja(p => p ? { ...p, uf: e.target.value.toUpperCase() } : p)}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                          placeholder="RJ" />
                      </div>
                    </div>
                    <button onClick={salvarLoja} disabled={savingLoja}
                      className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">
                      {savingLoja ? 'Salvando...' : '✅ Salvar Configuração'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-zinc-500">Região</p>
                      <p className={loja.regiao ? 'text-teal-300 font-medium' : 'text-zinc-600 italic'}>
                        {loja.regiao || 'Não configurado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Cidade / UF</p>
                      <p className={loja.cidade ? 'text-zinc-300' : 'text-zinc-600 italic'}>
                        {loja.cidade ? `${loja.cidade}${loja.uf ? ` / ${loja.uf}` : ''}` : 'Não configurado'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-zinc-500">Bairros Atendidos</p>
                      <p className={loja.bairrosAtendidos ? 'text-zinc-300 leading-relaxed' : 'text-zinc-600 italic'}>
                        {loja.bairrosAtendidos || 'Não configurado'}
                      </p>
                    </div>
                    {!loja.regiao && !loja.bairrosAtendidos && !loja.cidade && (
                      <div className="col-span-2">
                        <span className="text-yellow-500 text-xs">⚠️ Sem configuração de região — leads desta área não serão atribuídos automaticamente</span>
                      </div>
                    )}
                    {(loja.regiao || loja.bairrosAtendidos || loja.cidade) && (
                      <div className="col-span-2">
                        <span className="text-teal-500 text-xs">✅ Pronta para atribuição automática</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      {showCriar && (
        <ModalCriarLead lojas={lojas} vendedores={vendedores}
          onClose={() => setShowCriar(false)}
          onSalvo={lead => { setLeads(prev => [lead, ...prev]); setShowCriar(false); loadAll(); }} />
      )}
      {leadDetalhe && (
        <PainelDetalhe lead={leadDetalhe}
          onClose={() => setLeadDetalhe(null)}
          onAtualizado={atualizarLead} />
      )}
    </div>
  );
}
