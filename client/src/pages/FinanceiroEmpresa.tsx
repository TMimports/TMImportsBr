import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Loja {
  id: number;
  nomeFantasia?: string;
  razaoSocial: string;
  cnpj: string;
  grupo?: { nome: string };
}

interface DashFin {
  contasPagar: {
    totalAberto: number; qtdAberto: number;
    totalVencendo7dias: number; qtdVencendo7dias: number;
    totalVencido: number; qtdVencido: number;
    totalPagoMes: number;
  };
  contasReceber: {
    totalAberto: number; qtdAberto: number;
    totalVencendo7dias: number; qtdVencendo7dias: number;
    totalVencido: number; qtdVencido: number;
    totalRecebidoMes: number;
  };
  saldoLiquido: number;
}

interface ContaPagar {
  id: number;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  dataPago?: string;
  origem: string;
  loja: { nomeFantasia?: string; razaoSocial: string };
  categoria?: { nome: string; natureza: string };
  departamento?: { nome: string };
  pedidoCompra?: { numero: string; fornecedor: string };
}

interface ContaReceber {
  id: number;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  dataPago?: string;
  origem: string;
  cliente?: { nome: string; cpfCnpj: string };
  loja: { nomeFantasia?: string; razaoSocial: string };
  categoria?: { nome: string };
}

type TabId = 'visao-geral' | 'contas-pagar' | 'contas-receber';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'visao-geral',    label: 'Visão Geral',  icon: '📊' },
  { id: 'contas-pagar',   label: 'A Pagar',      icon: '📤' },
  { id: 'contas-receber', label: 'A Receber',     icon: '📥' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

function diasVencimento(vencimento: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento); venc.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

function StatusBadge({ pago, vencimento }: { pago: boolean; vencimento: string }) {
  if (pago) return <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/50 text-green-400 border border-green-800">Pago</span>;
  const dias = diasVencimento(vencimento);
  if (dias < 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/50 text-red-400 border border-red-800">Vencido {Math.abs(dias)}d</span>;
  if (dias === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-900/50 text-orange-400 border border-orange-800">Vence hoje</span>;
  if (dias <= 7) return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800">Em {dias}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">A vencer</span>;
}

function KpiCard({ label, value, sub, color = 'text-white', icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-zinc-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FinanceiroEmpresa() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('visao-geral');
  const [loadingLojas, setLoadingLojas] = useState(true);

  // Visão Geral
  const [dash, setDash] = useState<DashFin | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);

  // A Pagar
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [loadingCP, setLoadingCP] = useState(false);
  const [filtroCP, setFiltroCP] = useState<'todos' | 'pendentes' | 'pagas'>('pendentes');

  // A Receber
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loadingCR, setLoadingCR] = useState(false);
  const [filtroCR, setFiltroCR] = useState<'todos' | 'pendentes' | 'recebidas'>('pendentes');

  const tabBarRef = useRef<HTMLDivElement>(null);

  // Load lojas
  useEffect(() => {
    api.get<Loja[]>('/lojas').then(r => {
      setLojas(r.data);
      setLoadingLojas(false);
    }).catch(() => setLoadingLojas(false));
  }, []);

  // Load data when loja selected
  useEffect(() => {
    if (!lojaId) return;
    loadDash();
    loadCP();
    loadCR();
  }, [lojaId]);

  // Reload when filters change
  useEffect(() => { if (lojaId) loadCP(); }, [filtroCP, lojaId]);
  useEffect(() => { if (lojaId) loadCR(); }, [filtroCR, lojaId]);

  function loadDash() {
    if (!lojaId) return;
    setLoadingDash(true);
    api.get<DashFin>(`/financeiro/dashboard?lojaId=${lojaId}`)
      .then(r => setDash(r.data))
      .catch(() => setDash(null))
      .finally(() => setLoadingDash(false));
  }

  function loadCP() {
    if (!lojaId) return;
    setLoadingCP(true);
    const params = new URLSearchParams({ lojaId: String(lojaId) });
    if (filtroCP !== 'todos') params.set('status', filtroCP);
    api.get<ContaPagar[]>(`/financeiro/contas-pagar?${params}`)
      .then(r => setContasPagar(r.data))
      .catch(() => setContasPagar([]))
      .finally(() => setLoadingCP(false));
  }

  function loadCR() {
    if (!lojaId) return;
    setLoadingCR(true);
    const params = new URLSearchParams({ lojaId: String(lojaId) });
    if (filtroCR !== 'todos') params.set('status', filtroCR);
    api.get<ContaReceber[]>(`/financeiro/contas-receber?${params}`)
      .then(r => setContasReceber(r.data))
      .catch(() => setContasReceber([]))
      .finally(() => setLoadingCR(false));
  }

  const lojaAtual = lojas.find(l => l.id === lojaId);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Financeiro por Loja</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Visão financeira completa de cada unidade da rede</p>
        </div>
      </div>

      {/* Loja Selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Selecionar Unidade / Loja</label>
        {loadingLojas ? (
          <div className="text-zinc-500 text-sm">Carregando lojas...</div>
        ) : lojas.length === 0 ? (
          <div className="text-zinc-500 text-sm">Nenhuma loja cadastrada.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lojas.map(loja => (
              <button
                key={loja.id}
                onClick={() => { setLojaId(loja.id); setActiveTab('visao-geral'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  lojaId === loja.id
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500 hover:text-orange-400'
                }`}
              >
                <span>🏪</span>
                <div className="text-left">
                  <div>{loja.nomeFantasia || loja.razaoSocial}</div>
                  {loja.grupo && <div className="text-xs opacity-70">{loja.grupo.nome}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content when loja selected */}
      {!lojaId ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🏪</div>
          <p className="text-zinc-400">Selecione uma loja acima para visualizar o financeiro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Loja info bar */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-orange-500/30 rounded-xl px-5 py-3">
            <span className="text-orange-400 text-xl">🏪</span>
            <div>
              <span className="font-semibold text-white">{lojaAtual?.nomeFantasia || lojaAtual?.razaoSocial}</span>
              {lojaAtual?.grupo && <span className="text-zinc-400 text-sm ml-2">· {lojaAtual.grupo.nome}</span>}
              <span className="text-zinc-500 text-xs ml-2">{lojaAtual?.cnpj}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div ref={tabBarRef} className="flex overflow-x-auto border-b border-zinc-800 scrollbar-none">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-400 bg-zinc-800/50'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'visao-geral' && <TabVisaoGeral dash={dash} loading={loadingDash} onRefresh={loadDash} />}
              {activeTab === 'contas-pagar' && (
                <TabContasPagar
                  contas={contasPagar}
                  loading={loadingCP}
                  filtro={filtroCP}
                  onFiltro={setFiltroCP}
                  onRefresh={loadCP}
                />
              )}
              {activeTab === 'contas-receber' && (
                <TabContasReceber
                  contas={contasReceber}
                  loading={loadingCR}
                  filtro={filtroCR}
                  onFiltro={setFiltroCR}
                  onRefresh={loadCR}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Visão Geral ───────────────────────────────────────────────────────────

function TabVisaoGeral({ dash, loading, onRefresh }: {
  dash: DashFin | null; loading: boolean; onRefresh: () => void;
}) {
  if (loading) return <LoadingState />;
  if (!dash) return <EmptyState msg="Nenhum dado financeiro encontrado para esta loja." />;

  const saldoPositivo = dash.saldoLiquido >= 0;

  return (
    <div className="space-y-6">
      {/* Saldo Líquido */}
      <div className={`rounded-xl p-6 border ${saldoPositivo ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
        <div className="text-zinc-400 text-sm font-medium uppercase tracking-wide mb-1">Saldo Líquido (A Receber – A Pagar)</div>
        <div className={`text-4xl font-bold ${saldoPositivo ? 'text-green-400' : 'text-red-400'}`}>
          {fmt(dash.saldoLiquido)}
        </div>
        <div className="text-zinc-500 text-xs mt-1">
          {saldoPositivo ? '✅ A empresa está com liquidez positiva' : '⚠️ A empresa tem mais obrigações que direitos'}
        </div>
      </div>

      {/* A Pagar */}
      <div>
        <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <span>📤</span> Contas a Pagar
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Em Aberto" value={fmt(dash.contasPagar.totalAberto)}
            sub={`${dash.contasPagar.qtdAberto} contas`} color="text-white" icon="📋" />
          <KpiCard label="Vencidas" value={fmt(dash.contasPagar.totalVencido)}
            sub={`${dash.contasPagar.qtdVencido} contas`} color="text-red-400" icon="🔴" />
          <KpiCard label="Vencem em 7d" value={fmt(dash.contasPagar.totalVencendo7dias)}
            sub={`${dash.contasPagar.qtdVencendo7dias} contas`} color="text-yellow-400" icon="⏰" />
          <KpiCard label="Pago no Mês" value={fmt(dash.contasPagar.totalPagoMes)}
            sub="mês atual" color="text-green-400" icon="✅" />
        </div>
      </div>

      {/* A Receber */}
      <div>
        <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          <span>📥</span> Contas a Receber
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Em Aberto" value={fmt(dash.contasReceber.totalAberto)}
            sub={`${dash.contasReceber.qtdAberto} contas`} color="text-white" icon="📋" />
          <KpiCard label="Vencidas" value={fmt(dash.contasReceber.totalVencido)}
            sub={`${dash.contasReceber.qtdVencido} contas`} color="text-red-400" icon="🔴" />
          <KpiCard label="Vencem em 7d" value={fmt(dash.contasReceber.totalVencendo7dias)}
            sub={`${dash.contasReceber.qtdVencendo7dias} contas`} color="text-yellow-400" icon="⏰" />
          <KpiCard label="Recebido no Mês" value={fmt(dash.contasReceber.totalRecebidoMes)}
            sub="mês atual" color="text-green-400" icon="✅" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onRefresh} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          🔄 Atualizar dados
        </button>
      </div>
    </div>
  );
}

// ── Tab: Contas a Pagar ────────────────────────────────────────────────────────

function TabContasPagar({ contas, loading, filtro, onFiltro, onRefresh }: {
  contas: ContaPagar[];
  loading: boolean;
  filtro: 'todos' | 'pendentes' | 'pagas';
  onFiltro: (f: 'todos' | 'pendentes' | 'pagas') => void;
  onRefresh: () => void;
}) {
  const [busca, setBusca] = useState('');

  const filtradas = contas.filter(c =>
    c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    (c.pedidoCompra?.fornecedor || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.categoria?.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalAberto = contas.filter(c => !c.pago).reduce((s, c) => s + c.valor, 0);
  const totalVencido = contas.filter(c => !c.pago && diasVencimento(c.vencimento) < 0).reduce((s, c) => s + c.valor, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {filtro !== 'pagas' && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Em aberto: </span>
            <span className="text-white font-semibold">{fmt(totalAberto)}</span>
          </div>
          {totalVencido > 0 && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-red-400">Vencidas: </span>
              <span className="text-red-300 font-semibold">{fmt(totalVencido)}</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {(['pendentes', 'todos', 'pagas'] as const).map(f => (
            <button key={f} onClick={() => onFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
              {f === 'pendentes' ? 'Pendentes' : f === 'todos' ? 'Todos' : 'Pagas'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-orange-500"
          />
          <button onClick={onRefresh} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded-lg px-3 py-1.5 text-sm transition-colors">
            🔄
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingState /> : filtradas.length === 0 ? (
        <EmptyState msg="Nenhuma conta encontrada com os filtros selecionados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="text-center px-4 py-3">Vencimento</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtradas.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-zinc-200 font-medium">{c.descricao}</div>
                    {c.pedidoCompra && (
                      <div className="text-zinc-500 text-xs">{c.pedidoCompra.fornecedor}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.origem === 'COMPRA' ? 'bg-blue-900/50 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {c.origem}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-zinc-400 text-xs">{c.categoria?.nome || '—'}</span>
                    {c.departamento && <span className="text-zinc-600 text-xs ml-1">· {c.departamento.nome}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${c.pago ? 'text-green-400' : 'text-white'}`}>
                      {fmt(c.valor)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400 text-xs">
                    {fmtDate(c.vencimento)}
                    {c.dataPago && <div className="text-green-500">Pago {fmtDate(c.dataPago)}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge pago={c.pago} vencimento={c.vencimento} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-800/30 text-xs font-semibold text-zinc-300 border-t border-zinc-700">
                <td colSpan={3} className="px-4 py-2 hidden md:table-cell">
                  Total: {filtradas.length} registros
                </td>
                <td className="px-4 py-2 text-right">{fmt(filtradas.reduce((s, c) => s + c.valor, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Contas a Receber ──────────────────────────────────────────────────────

function TabContasReceber({ contas, loading, filtro, onFiltro, onRefresh }: {
  contas: ContaReceber[];
  loading: boolean;
  filtro: 'todos' | 'pendentes' | 'recebidas';
  onFiltro: (f: 'todos' | 'pendentes' | 'recebidas') => void;
  onRefresh: () => void;
}) {
  const [busca, setBusca] = useState('');

  const filtradas = contas.filter(c =>
    c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cliente?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.categoria?.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalAberto = contas.filter(c => !c.pago).reduce((s, c) => s + c.valor, 0);
  const totalVencido = contas.filter(c => !c.pago && diasVencimento(c.vencimento) < 0).reduce((s, c) => s + c.valor, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {filtro !== 'recebidas' && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-zinc-400">Em aberto: </span>
            <span className="text-white font-semibold">{fmt(totalAberto)}</span>
          </div>
          {totalVencido > 0 && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-sm">
              <span className="text-red-400">Vencidas: </span>
              <span className="text-red-300 font-semibold">{fmt(totalVencido)}</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {(['pendentes', 'todos', 'recebidas'] as const).map(f => (
            <button key={f} onClick={() => onFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
              {f === 'pendentes' ? 'Pendentes' : f === 'todos' ? 'Todos' : 'Recebidas'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-orange-500"
          />
          <button onClick={onRefresh} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded-lg px-3 py-1.5 text-sm transition-colors">
            🔄
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingState /> : filtradas.length === 0 ? (
        <EmptyState msg="Nenhuma conta encontrada com os filtros selecionados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Tipo</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="text-center px-4 py-3">Vencimento</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtradas.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-zinc-200 font-medium">{c.descricao}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {c.cliente ? (
                      <div>
                        <div className="text-zinc-300 text-xs">{c.cliente.nome}</div>
                        <div className="text-zinc-500 text-xs">{c.cliente.cpfCnpj}</div>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.origem === 'VENDA' ? 'bg-orange-900/50 text-orange-400'
                      : c.origem === 'OS' ? 'bg-purple-900/50 text-purple-400'
                      : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {c.origem}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${c.pago ? 'text-green-400' : 'text-white'}`}>
                      {fmt(c.valor)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-400 text-xs">
                    {fmtDate(c.vencimento)}
                    {c.dataPago && <div className="text-green-500">Recebido {fmtDate(c.dataPago)}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge pago={c.pago} vencimento={c.vencimento} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-800/30 text-xs font-semibold text-zinc-300 border-t border-zinc-700">
                <td colSpan={3} className="px-4 py-2 hidden md:table-cell">
                  Total: {filtradas.length} registros
                </td>
                <td className="px-4 py-2 text-right">{fmt(filtradas.reduce((s, c) => s + c.valor, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Utility Components ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Carregando...</p>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-zinc-400 text-sm">{msg}</p>
    </div>
  );
}
