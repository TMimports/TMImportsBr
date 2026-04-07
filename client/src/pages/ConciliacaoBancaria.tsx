import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';


const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string | Date) => new Date(s).toLocaleDateString('pt-BR');
const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const TIPO_CONTA: Record<string, string> = {
  CC: 'Conta Corrente', CP: 'Conta Pagamento', POUPANCA: 'Poupança', INVESTIMENTO: 'Investimento',
};

const BANCOS = [
  'Bradesco', 'Itaú', 'Santander', 'Banco do Brasil', 'Caixa Econômica Federal',
  'Nubank', 'Inter', 'Sicoob', 'Sicredi', 'C6 Bank', 'BTG Pactual', 'XP', 'Outro',
];

interface ContaBancaria {
  id: number;
  banco: string;
  agencia: string;
  conta: string;
  digitoConta?: string;
  tipoConta: string;
  saldoInicial: number;
  saldoAtual: number;
  ativa: boolean;
  descricao?: string;
  loja: { id: number; nomeFantasia: string; cnpj: string };
  _count: { lancamentos: number };
}

interface Lancamento {
  id: number;
  contaBancariaId: number;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'CREDITO' | 'DEBITO';
  conciliado: boolean;
  importadoOFX: boolean;
  fitid?: string;
  observacoes?: string;
  contaBancaria: { banco: string; agencia: string; conta: string; loja: { nomeFantasia: string } };
  pagamento?: { id: number; valor: number; dataPagamento: string; contaPagar?: { descricao: string } };
  recebimento?: { id: number; valor: number; dataRecebimento: string; contaReceber?: { descricao: string } };
}

interface Candidato {
  pagamentos: Array<{
    id: number; valor: number; dataPagamento: string; formaPagamento: string;
    contaPagar?: { descricao: string; fornecedor?: { razaoSocial: string } };
    loja: { nomeFantasia: string };
  }>;
  recebimentos: Array<{
    id: number; valor: number; dataRecebimento: string; formaPagamento: string;
    contaReceber?: { descricao: string };
    loja: { nomeFantasia: string };
  }>;
}

// ── Modal: Nova Conta ─────────────────────────────────────────────────────────

function ModalConta({ lojas, onSave, onClose }: {
  lojas: Array<{ id: number; nomeFantasia: string; cnpj: string }>;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    lojaId: String(lojas[0]?.id ?? ''),
    banco: '', agencia: '', conta: '', digitoConta: '',
    tipoConta: 'CC', saldoInicial: '0', descricao: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.lojaId || !form.banco || !form.agencia || !form.conta) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg space-y-4">
        <h2 className="text-lg font-bold text-white">Nova Conta Bancária</h2>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Empresa / Loja *</label>
          <select value={form.lojaId} onChange={e => setForm(p => ({ ...p, lojaId: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Banco *</label>
            <select value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Selecione...</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tipo de Conta *</label>
            <select value={form.tipoConta} onChange={e => setForm(p => ({ ...p, tipoConta: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
              {Object.entries(TIPO_CONTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Agência *</label>
            <input value={form.agencia} onChange={e => setForm(p => ({ ...p, agencia: e.target.value }))}
              placeholder="0001" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Conta *</label>
            <input value={form.conta} onChange={e => setForm(p => ({ ...p, conta: e.target.value }))}
              placeholder="00000" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dígito</label>
            <input value={form.digitoConta} onChange={e => setForm(p => ({ ...p, digitoConta: e.target.value }))}
              placeholder="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Saldo Inicial (R$)</label>
          <input type="number" step="0.01" value={form.saldoInicial}
            onChange={e => setForm(p => ({ ...p, saldoInicial: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Descrição (opcional)</label>
          <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            placeholder="Ex: Conta principal, Conta para folha..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.banco || !form.agencia || !form.conta}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : 'Salvar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Novo Lançamento Manual ─────────────────────────────────────────────

function ModalLancamento({ contas, contaPreSelecionada, onSave, onClose }: {
  contas: ContaBancaria[];
  contaPreSelecionada?: number;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    contaBancariaId: contaPreSelecionada ? String(contaPreSelecionada) : (contas[0]?.id ? String(contas[0].id) : ''),
    data: new Date().toISOString().slice(0, 10),
    descricao: '', valor: '', tipo: 'CREDITO', observacoes: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.contaBancariaId || !form.descricao || !form.valor) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Novo Lançamento Manual</h2>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Conta Bancária *</label>
          <select value={form.contaBancariaId} onChange={e => setForm(p => ({ ...p, contaBancariaId: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
            {contas.map(c => (
              <option key={c.id} value={c.id}>{c.banco} — Ag {c.agencia} / C {c.conta} ({c.loja.nomeFantasia})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Data *</label>
            <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tipo *</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="CREDITO">Crédito (+)</option>
              <option value="DEBITO">Débito (−)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Descrição *</label>
          <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            placeholder="Descrição do lançamento" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Valor (R$) *</label>
          <input type="number" step="0.01" min="0" value={form.valor}
            onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Observações</label>
          <input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
            placeholder="Opcional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.descricao || !form.valor}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Importar OFX ───────────────────────────────────────────────────────

function ModalOFX({ contas, contaPreSelecionada, onImport, onClose }: {
  contas: ContaBancaria[];
  contaPreSelecionada?: number;
  onImport: (contaId: number, content: string) => Promise<{ importados: number; duplicados: number; total: number }>;
  onClose: () => void;
}) {
  const [contaId, setContaId] = useState(contaPreSelecionada ?? contas[0]?.id ?? 0);
  const [ofxContent, setOfxContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ importados: number; duplicados: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setOfxContent(ev.target?.result as string ?? '');
    reader.readAsText(file, 'latin1');
  }

  async function handleImport() {
    if (!ofxContent || !contaId) return;
    setLoading(true);
    try {
      const r = await onImport(contaId, ofxContent);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-white">Importar Extrato OFX</h2>
        <p className="text-sm text-zinc-400">Exporte o extrato bancário no formato OFX pelo internet banking do seu banco e importe aqui.</p>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Conta Bancária *</label>
          <select value={contaId} onChange={e => setContaId(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm">
            {contas.map(c => (
              <option key={c.id} value={c.id}>{c.banco} — Ag {c.agencia} / C {c.conta} ({c.loja.nomeFantasia})</option>
            ))}
          </select>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-700 hover:border-orange-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          <div className="text-3xl mb-2">📄</div>
          <p className="text-zinc-300 text-sm font-medium">
            {fileName ? fileName : 'Clique para selecionar o arquivo .OFX'}
          </p>
          <p className="text-zinc-500 text-xs mt-1">Suporta todos os bancos brasileiros (Bradesco, Itaú, BB, Santander, Caixa, etc.)</p>
          <input ref={fileRef} type="file" accept=".ofx,.OFX" onChange={handleFile} className="hidden" />
        </div>

        {result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-sm">
            <p className="text-green-400 font-semibold mb-1">Importação concluída!</p>
            <p className="text-zinc-300">✅ {result.importados} lançamentos importados</p>
            {result.duplicados > 0 && <p className="text-zinc-400">⚠️ {result.duplicados} duplicatas ignoradas</p>}
            <p className="text-zinc-500 text-xs mt-1">Total no arquivo: {result.total} transações</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium">
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={loading || !ofxContent || !contaId}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
              {loading ? 'Importando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Conciliar ──────────────────────────────────────────────────────────

function ModalConciliar({ lancamento, onConciliar, onClose }: {
  lancamento: Lancamento;
  onConciliar: (lancamentoId: number, data: { pagamentoId?: number; recebimentoId?: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [candidatos, setCandidatos] = useState<Candidato>({ pagamentos: [], recebimentos: [] });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({
      tipo: lancamento.tipo,
      lojaId: String(lancamento.contaBancaria.loja ? '' : ''),
      data: new Date(lancamento.data).toISOString().slice(0, 10),
      valor: String(lancamento.valor),
    });
    api.get<Candidato>(`/conciliacao-bancaria/candidatos?${params}`)
      .then(d => setCandidatos(d && typeof d === 'object' ? d : { pagamentos: [], recebimentos: [] }))
      .catch(() => setCandidatos({ pagamentos: [], recebimentos: [] }))
      .finally(() => setLoading(false));
  }, []);

  async function conciliar(id: number, tipo: 'pagamento' | 'recebimento') {
    setSalvando(true);
    await onConciliar(lancamento.id, tipo === 'pagamento' ? { pagamentoId: id } : { recebimentoId: id });
    setSalvando(false);
  }

  const isCred = lancamento.tipo === 'CREDITO';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Conciliar Lançamento</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              <span className={`font-semibold ${isCred ? 'text-green-400' : 'text-red-400'}`}>
                {isCred ? '+' : '-'}{fmtBRL(Number(lancamento.valor))}
              </span>
              {' '}— {lancamento.descricao}
              {' '}— {fmtDate(lancamento.data)}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">×</button>
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Selecione o {isCred ? 'recebimento' : 'pagamento'} correspondente a este lançamento bancário (±10% do valor, ±7 dias):
        </p>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <p className="text-zinc-400 text-center py-8">Buscando candidatos...</p>}

          {!loading && isCred && candidatos.recebimentos.length === 0 && (
            <p className="text-zinc-500 text-center py-8 text-sm">Nenhum recebimento compatível encontrado no período</p>
          )}
          {!loading && !isCred && candidatos.pagamentos.length === 0 && (
            <p className="text-zinc-500 text-center py-8 text-sm">Nenhum pagamento compatível encontrado no período</p>
          )}

          {isCred && candidatos.recebimentos.map(r => (
            <div key={r.id} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">{r.contaReceber?.descricao ?? 'Recebimento avulso'}</p>
                <p className="text-xs text-zinc-400">{fmtDate(r.dataRecebimento)} — {r.formaPagamento} — {r.loja.nomeFantasia}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 font-semibold text-sm">{fmtBRL(Number(r.valor))}</span>
                <button onClick={() => conciliar(r.id, 'recebimento')} disabled={salvando}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                  Vincular
                </button>
              </div>
            </div>
          ))}

          {!isCred && candidatos.pagamentos.map(p => (
            <div key={p.id} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">
                  {p.contaPagar?.descricao ?? 'Pagamento avulso'}
                  {p.contaPagar?.fornecedor && <span className="text-zinc-400"> — {p.contaPagar.fornecedor.razaoSocial}</span>}
                </p>
                <p className="text-xs text-zinc-400">{fmtDate(p.dataPagamento)} — {p.formaPagamento} — {p.loja.nomeFantasia}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-semibold text-sm">{fmtBRL(Number(p.valor))}</span>
                <button onClick={() => conciliar(p.id, 'pagamento')} disabled={salvando}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                  Vincular
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-800 mt-4">
          <button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium">Fechar sem conciliar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

export function ConciliacaoBancaria() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [lojas, setLojas] = useState<Array<{ id: number; nomeFantasia: string; cnpj: string }>>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState({ totalLancamentos: 0, conciliados: 0, naoConciliados: 0, totalCreditos: 0, totalDebitos: 0 });

  const [contaSelecionada, setContaSelecionada] = useState<number | null>(null);
  const [filtroMes, setFiltroMes] = useState(mesAtual());
  const [filtroConciliado, setFiltroConciliado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [showModalConta, setShowModalConta] = useState(false);
  const [showModalLancamento, setShowModalLancamento] = useState(false);
  const [showModalOFX, setShowModalOFX] = useState(false);
  const [modalConciliar, setModalConciliar] = useState<Lancamento | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadLancamentos(); }, [contaSelecionada, filtroMes, filtroConciliado, filtroTipo]);

  async function loadAll() {
    setLoading(true);
    try {
      const [cData, lData, rData] = await Promise.all([
        api.get<ContaBancaria[]>('/conciliacao-bancaria/contas'),
        api.get<any>('/lojas'),
        api.get<any>('/conciliacao-bancaria/resumo'),
      ]);
      setContas(Array.isArray(cData) ? cData : []);
      setLojas(Array.isArray(lData) ? lData : lData.lojas ?? []);
      if (rData && typeof rData === 'object' && !rData.error) setResumo(rData);
    } catch { /* silent */ }
    setLoading(false);
    await loadLancamentos();
  }

  async function loadLancamentos() {
    const params = new URLSearchParams();
    if (contaSelecionada) params.set('contaBancariaId', String(contaSelecionada));
    if (filtroMes) params.set('mes', filtroMes);
    if (filtroConciliado !== '') params.set('conciliado', filtroConciliado);
    if (filtroTipo) params.set('tipo', filtroTipo);

    try {
      const d = await api.get<Lancamento[]>(`/conciliacao-bancaria/lancamentos?${params}`);
      setLancamentos(Array.isArray(d) ? d : []);
    } catch { setLancamentos([]); }
  }

  function flash(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  }

  async function saveConta(data: any) {
    try {
      await api.post('/conciliacao-bancaria/contas', data);
      setShowModalConta(false);
      flash('ok', 'Conta bancária cadastrada com sucesso!');
      await loadAll();
    } catch (e: any) { flash('erro', e.message || 'Erro ao salvar'); }
  }

  async function saveLancamento(data: any) {
    try {
      await api.post('/conciliacao-bancaria/lancamentos', data);
      setShowModalLancamento(false);
      flash('ok', 'Lançamento criado!');
      await loadAll();
    } catch (e: any) { flash('erro', e.message || 'Erro ao salvar'); }
  }

  async function importarOFX(contaId: number, ofxContent: string) {
    const d = await api.post<any>(`/conciliacao-bancaria/contas/${contaId}/importar-ofx`, { ofxContent });
    await loadAll();
    return { importados: d.importados, duplicados: d.duplicados, total: d.total };
  }

  async function conciliar(lancamentoId: number, data: { pagamentoId?: number; recebimentoId?: number }) {
    try {
      await api.post(`/conciliacao-bancaria/lancamentos/${lancamentoId}/conciliar`, data);
      setModalConciliar(null);
      flash('ok', 'Lançamento conciliado!');
      await loadLancamentos();
    } catch (e: any) { flash('erro', e.message || 'Erro ao conciliar'); }
  }

  async function desconciliar(lancamentoId: number) {
    if (!confirm('Desvincular este lançamento?')) return;
    try {
      await api.post(`/conciliacao-bancaria/lancamentos/${lancamentoId}/desconciliar`, {});
      flash('ok', 'Lançamento desvinculado');
      await loadLancamentos();
    } catch (e: any) { flash('erro', e.message || 'Erro'); }
  }

  async function excluirLancamento(id: number) {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await api.delete(`/conciliacao-bancaria/lancamentos/${id}`);
      flash('ok', 'Lançamento excluído');
      await loadLancamentos();
    } catch (e: any) { flash('erro', e.message || 'Erro'); }
  }

  const contaSel = contas.find(c => c.id === contaSelecionada);
  const totalSaldo = contas.reduce((acc, c) => acc + (c.saldoAtual ?? 0), 0);
  const pct = resumo.totalLancamentos > 0 ? Math.round((resumo.conciliados / resumo.totalLancamentos) * 100) : 0;

  const canEdit = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA'].includes(role);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">🏦 Conciliação Bancária</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Importe extratos OFX e concilie com lançamentos financeiros</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowModalOFX(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              📄 Importar OFX
            </button>
            <button onClick={() => setShowModalLancamento(true)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Lançamento Manual
            </button>
            <button onClick={() => setShowModalConta(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Nova Conta
            </button>
          </div>
        )}
      </div>

      {/* Mensagem flash */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
          msg.tipo === 'ok' ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'
        }`}>
          {msg.tipo === 'ok' ? '✅' : '❌'} {msg.texto}
        </div>
      )}

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Saldo Total</p>
          <p className={`text-xl font-bold ${totalSaldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBRL(totalSaldo)}</p>
          <p className="text-xs text-zinc-500 mt-1">{contas.length} conta{contas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Conciliados</p>
          <p className="text-xl font-bold text-white">{resumo.conciliados}<span className="text-zinc-500 text-sm">/{resumo.totalLancamentos}</span></p>
          <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-zinc-500 mt-1">{pct}% conciliado</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Pendentes</p>
          <p className="text-xl font-bold text-yellow-400">{resumo.naoConciliados}</p>
          <p className="text-xs text-zinc-500 mt-1">lançamentos sem vínculo</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Créditos / Débitos</p>
          <p className="text-sm font-semibold text-green-400">+{fmtBRL(resumo.totalCreditos)}</p>
          <p className="text-sm font-semibold text-red-400">-{fmtBRL(resumo.totalDebitos)}</p>
        </div>
      </div>

      {/* Contas bancárias */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Contas Bancárias</h2>
        {loading ? (
          <p className="text-zinc-500 text-sm">Carregando...</p>
        ) : contas.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-dashed border-zinc-800">
            <p className="text-zinc-500">Nenhuma conta bancária cadastrada ainda.</p>
            {canEdit && (
              <button onClick={() => setShowModalConta(true)} className="mt-3 text-orange-400 hover:text-orange-300 text-sm font-medium">
                + Cadastrar primeira conta
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contas.map(c => (
              <div
                key={c.id}
                onClick={() => setContaSelecionada(contaSelecionada === c.id ? null : c.id)}
                className={`bg-zinc-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-orange-500/50 ${
                  contaSelecionada === c.id ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800'
                } ${!c.ativa ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{c.banco}</p>
                    <p className="text-zinc-400 text-xs">{TIPO_CONTA[c.tipoConta]} · Ag {c.agencia} / C {c.conta}{c.digitoConta ? `-${c.digitoConta}` : ''}</p>
                  </div>
                  {!c.ativa && <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">Inativa</span>}
                </div>
                <p className="text-xs text-zinc-500 mb-2">{c.loja.nomeFantasia}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Saldo atual</p>
                    <p className={`text-lg font-bold ${(c.saldoAtual ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtBRL(c.saldoAtual ?? 0)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-600">{c._count.lancamentos} lançamentos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros + tabela de lançamentos */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-40">
            <h2 className="text-sm font-semibold text-white">
              Extrato / Lançamentos
              {contaSel && <span className="text-zinc-400 font-normal ml-2">— {contaSel.banco} ({contaSel.conta})</span>}
            </h2>
          </div>
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value="">Todos os tipos</option>
            <option value="CREDITO">Crédito</option>
            <option value="DEBITO">Débito</option>
          </select>
          <select value={filtroConciliado} onChange={e => setFiltroConciliado(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value="">Todos</option>
            <option value="false">Pendentes</option>
            <option value="true">Conciliados</option>
          </select>
          <button onClick={loadLancamentos} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg text-sm">↻ Atualizar</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-zinc-400 font-medium">Data</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Descrição</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Conta</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Valor</th>
                <th className="text-center p-4 text-zinc-400 font-medium">Status</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Vínculo</th>
                <th className="p-4 text-zinc-400 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-10 text-zinc-500">
                    {loading ? 'Carregando...' : 'Nenhum lançamento encontrado'}
                  </td>
                </tr>
              )}
              {lancamentos.map(l => (
                <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 text-zinc-300 whitespace-nowrap">{fmtDate(l.data)}</td>
                  <td className="p-4">
                    <p className="text-white">{l.descricao}</p>
                    {l.importadoOFX && <span className="text-xs text-zinc-600">OFX</span>}
                    {l.observacoes && <p className="text-xs text-zinc-500">{l.observacoes}</p>}
                  </td>
                  <td className="p-4 text-zinc-400 text-xs whitespace-nowrap">
                    {l.contaBancaria.banco}<br />{l.contaBancaria.loja?.nomeFantasia}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span className={`font-semibold ${l.tipo === 'CREDITO' ? 'text-green-400' : 'text-red-400'}`}>
                      {l.tipo === 'CREDITO' ? '+' : '-'}{fmtBRL(Number(l.valor))}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      l.conciliado ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {l.conciliado ? '✓ Conciliado' : '⏳ Pendente'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-zinc-400">
                    {l.pagamento && (
                      <div>
                        <span className="text-zinc-300">Pagamento #{l.pagamento.id}</span>
                        {l.pagamento.contaPagar && <p className="text-zinc-500">{l.pagamento.contaPagar.descricao}</p>}
                      </div>
                    )}
                    {l.recebimento && (
                      <div>
                        <span className="text-zinc-300">Recebimento #{l.recebimento.id}</span>
                        {l.recebimento.contaReceber && <p className="text-zinc-500">{l.recebimento.contaReceber.descricao}</p>}
                      </div>
                    )}
                    {!l.pagamento && !l.recebimento && <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      {!l.conciliado && canEdit && (
                        <button onClick={() => setModalConciliar(l)}
                          className="text-orange-400 hover:text-orange-300 text-xs font-medium">
                          Conciliar
                        </button>
                      )}
                      {l.conciliado && canEdit && (
                        <button onClick={() => desconciliar(l.id)}
                          className="text-zinc-500 hover:text-zinc-300 text-xs">
                          Desvincular
                        </button>
                      )}
                      {!l.conciliado && canEdit && (
                        <button onClick={() => excluirLancamento(l.id)}
                          className="text-red-500 hover:text-red-400 text-xs">
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showModalConta && (
        <ModalConta lojas={lojas} onSave={saveConta} onClose={() => setShowModalConta(false)} />
      )}
      {showModalLancamento && (
        <ModalLancamento
          contas={contas}
          contaPreSelecionada={contaSelecionada ?? undefined}
          onSave={saveLancamento}
          onClose={() => setShowModalLancamento(false)}
        />
      )}
      {showModalOFX && (
        <ModalOFX
          contas={contas}
          contaPreSelecionada={contaSelecionada ?? undefined}
          onImport={importarOFX}
          onClose={() => setShowModalOFX(false)}
        />
      )}
      {modalConciliar && (
        <ModalConciliar
          lancamento={modalConciliar}
          onConciliar={conciliar}
          onClose={() => setModalConciliar(null)}
        />
      )}
    </div>
  );
}
