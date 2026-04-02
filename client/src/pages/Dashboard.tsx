import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLojaContext } from '../contexts/LojaContext';


// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  vendasMes: { total: number; quantidade: number };
  osMes: { total: number; quantidade: number };
  alertasEstoque: number;
  contasVencer: { hoje: number; em3dias: number; em7dias: number };
  fluxoCaixa: { entradas: number; saidas: number; saldo: number };
}

interface LojaRanking {
  posicao: number;
  lojaId: number;
  lojaNome: string;
  grupoNome: string;
  totalVendas: number;
  quantidadeVendas: number;
  totalOS: number;
  quantidadeOS: number;
  faturamento: number;
  ticketMedio: number;
  produtoMaisVendido: string | null;
  ultimaVenda: string | null;
}

interface RankingData {
  periodo: { inicio: string; fim: string; tipo: string };
  kpis: {
    faturamentoTotal: number;
    totalVendasValor: number;
    totalTransacoes: number;
    ticketMedioGeral: number;
    lojaLider: string | null;
    vendasHoje: number;
    qtdVendasHoje: number;
  };
  ranking: LojaRanking[];
}

interface ProdutoRanking {
  posicao: number;
  produtoId: number | null;
  servicoId?: number | null;
  nome: string;
  tipo: string;
  quantidadeVendida: number;
  faturamento: number;
  participacao: number;
}

interface ProdutosData {
  motos: ProdutoRanking[];
  pecas: ProdutoRanking[];
  servicos: ProdutoRanking[];
  todos: ProdutoRanking[];
}

interface GraficoData {
  movimentacao: { label: string; vendas: number; os: number; total: number; qtdVendas: number; qtdOS: number }[];
  faturamentoPorLoja: { nome: string; faturamento: number; vendas: number; os: number }[];
  agruparPorHora: boolean;
}

interface FaturamentoComparativo {
  hoje: { vendas: number; os: number; total: number; qtd: number };
  mes: { vendas: number; os: number; total: number; qtd: number };
  ano: { vendas: number; os: number; total: number; qtd: number };
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
  lojaId?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtCurrencyShort = (v: number) => {
  if (v >= 1_000_000) return `R$\u00A0${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$\u00A0${(v / 1_000).toFixed(0)}k`;
  return fmtCurrency(v);
};
const fmtNum = (v: number) => v.toLocaleString('pt-BR');

type Periodo = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'mes', label: 'Mês atual' },
  { key: 'custom', label: 'Período' },
];

const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6'];
const MEDAL_ICON = ['🥇', '🥈', '🥉'];
const MEDAL_TEXT = ['text-yellow-400', 'text-zinc-300', 'text-orange-400'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-300">{p.name === 'vendas' ? 'Vendas' : p.name === 'os' ? 'OS' : p.name}:</span>
          <span className="text-white font-semibold">{fmtCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="border-t border-zinc-700 mt-1.5 pt-1.5">
          <span className="text-zinc-400">Total: </span>
          <span className="text-orange-400 font-bold">{fmtCurrency(payload.reduce((s: number, p: any) => s + p.value, 0))}</span>
        </div>
      )}
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-300 font-semibold mb-1">{label}</p>
      <p className="text-orange-400 font-bold">{fmtCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
}

// ─── KPI Big Card ─────────────────────────────────────────────────────────────

function KpiBig({ label, value, sub, accent = false, icon, onClick }: {
  label: string; value: string; sub?: string; accent?: boolean; icon: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative bg-zinc-900 border rounded-2xl p-5 flex flex-col gap-2 overflow-hidden transition-all
        ${onClick ? 'cursor-pointer hover:border-zinc-600 active:scale-[0.98]' : ''}
        ${accent ? 'border-orange-500/40' : 'border-zinc-800'}`}
    >
      {accent && <div className="absolute inset-0 bg-orange-500/5 pointer-events-none" />}
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {accent && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
      </div>
      <p className={`text-3xl font-black tracking-tight leading-none ${accent ? 'text-orange-400' : 'text-zinc-100'}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{label}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Auto Refresh ─────────────────────────────────────────────────────────────

function LiveBadge({ refreshing, lastUpdated, onRefresh }: {
  refreshing: boolean; lastUpdated: Date | null; onRefresh: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const ago = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : null;
  const agoText = ago === null ? '' : ago < 5 ? 'agora' : ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}min`;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
        ${refreshing ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
        {refreshing ? 'Atualizando...' : ago !== null ? `${agoText} atrás` : 'Ao vivo'}
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="px-2.5 py-1 rounded-full text-xs border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all disabled:opacity-50"
      >
        ↻
      </button>
    </div>
  );
}

// ─── Ranking Row ──────────────────────────────────────────────────────────────

function RankingRow({ loja, maxFat }: { loja: LojaRanking; maxFat: number }) {
  const pct = maxFat > 0 ? (loja.faturamento / maxFat) * 100 : 0;
  const medal = loja.posicao <= 3 ? MEDAL_ICON[loja.posicao - 1] : null;
  const medalColor = loja.posicao <= 3 ? MEDAL_TEXT[loja.posicao - 1] : 'text-zinc-600';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/20 px-4 rounded-lg transition-colors group">
      <div className="w-8 text-center flex-shrink-0">
        {medal ? (
          <span className="text-xl">{medal}</span>
        ) : (
          <span className={`text-sm font-bold ${medalColor}`}>{loja.posicao}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-200 text-sm truncate">{loja.lojaNome}</p>
        <p className="text-xs text-zinc-600 truncate">{loja.grupoNome}</p>
        <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: loja.posicao === 1 ? '#f97316' : loja.posicao === 2 ? '#a1a1aa' : loja.posicao === 3 ? '#b45309' : '#52525b'
            }}
          />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-base ${loja.posicao === 1 ? 'text-orange-400' : 'text-zinc-200'}`}>
          {fmtCurrencyShort(loja.faturamento)}
        </p>
        <p className="text-xs text-zinc-500">
          {fmtNum(loja.quantidadeVendas + loja.quantidadeOS)} transações
        </p>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ onNavigate, lojaId }: DashboardProps) {
  const { user } = useAuth();
  const { selectedLoja } = useLojaContext();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [produtosData, setProdutosData] = useState<ProdutosData | null>(null);
  const [graficoData, setGraficoData] = useState<GraficoData | null>(null);
  const [basicData, setBasicData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [prodTab, setProdTab] = useState<'todos' | 'motos' | 'pecas' | 'servicos'>('todos');
  const [faturamentoComp, setFaturamentoComp] = useState<FaturamentoComparativo | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const navigateTo = (page: string) => {
    if (onNavigate) onNavigate(page);
    else window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const buildParams = useCallback(() => {
    let params = `?periodo=${periodo}`;
    if (periodo === 'custom' && customInicio && customFim) {
      params += `&dataInicio=${customInicio}&dataFim=${customFim}`;
    }
    if (lojaId) params += `&lojaId=${lojaId}`;
    return params;
  }, [periodo, customInicio, customFim, lojaId]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const params = buildParams();
    const basicSuffix = lojaId ? `?lojaId=${lojaId}` : '';
    try {
      if (lojaId) {
        const [produtos, grafico, basic, comp] = await Promise.all([
          api.get<ProdutosData>(`/dashboard/produtos-mais-vendidos${params}`),
          api.get<GraficoData>(`/dashboard/grafico-vendas${params}`),
          api.get<DashboardData>(`/dashboard${basicSuffix}`),
          api.get<FaturamentoComparativo>(`/dashboard/faturamento-comparativo?lojaId=${lojaId}`),
        ]);
        setProdutosData(produtos);
        setGraficoData(grafico);
        setBasicData(basic);
        setFaturamentoComp(comp);
        setRankingData(null);
      } else {
        const [ranking, produtos, grafico, basic] = await Promise.all([
          api.get<RankingData>(`/dashboard/ranking-lojas${params}`),
          api.get<ProdutosData>(`/dashboard/produtos-mais-vendidos${params}`),
          api.get<GraficoData>(`/dashboard/grafico-vendas${params}`),
          api.get<DashboardData>('/dashboard'),
        ]);
        setRankingData(ranking);
        setProdutosData(produtos);
        setGraficoData(grafico);
        setBasicData(basic);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams, lojaId]);

  useEffect(() => {
    fetchAll();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchAll(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  const handleResetSistema = async () => {
    setResetting(true);
    try {
      await api.post('/sistema/reset', { confirmar: 'RESETAR_SISTEMA' });
      alert('Sistema resetado com sucesso! Voce sera deslogado.');
      localStorage.removeItem('token');
      window.location.reload();
    } catch {
      alert('Erro ao resetar sistema');
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  const faturamentoPeriodo = (basicData?.vendasMes?.total || 0) + (basicData?.osMes?.total || 0);
  const transacoesPeriodo = (basicData?.vendasMes?.quantidade || 0) + (basicData?.osMes?.quantidade || 0);
  const kpis = lojaId
    ? {
        vendasHoje: basicData?.vendasMes?.total || 0,
        faturamentoTotal: faturamentoPeriodo,
        totalTransacoes: transacoesPeriodo,
        ticketMedioGeral: transacoesPeriodo > 0 ? faturamentoPeriodo / transacoesPeriodo : 0,
        lojaLider: selectedLoja?.nomeFantasia || '—',
        qtdVendasHoje: basicData?.vendasMes?.quantidade || 0,
      }
    : rankingData?.kpis;
  const ranking = rankingData?.ranking || [];
  const alertasHoje = basicData?.contasVencer?.hoje || 0;
  const maxFat = ranking[0]?.faturamento || 1;

  // Produtos para gráfico horizontal
  const prodItems = produtosData ? produtosData[prodTab].slice(0, 8) : [];
  const maxProdQtd = Math.max(...prodItems.map(p => p.quantidadeVendida), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            {lojaId ? (selectedLoja?.nomeFantasia || 'Dashboard da Loja') : 'Dashboard'}
          </h1>
          <p className="text-sm text-zinc-500">
            {lojaId ? (
              <span className="text-zinc-400">Visão individual da unidade</span>
            ) : (
              <>Bem-vindo, <span className="text-zinc-300">{user?.nome}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={() => fetchAll(true)} />
          {!lojaId && (
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1 bg-red-900/30 text-red-500 border border-red-900/50 rounded-full text-xs hover:bg-red-900/50 transition-colors"
            >
              Resetar Sistema
            </button>
          )}
        </div>
      </div>

      {/* ── Alerta contas vencer ── */}
      {alertasHoje > 0 && (
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-red-500/50 transition-colors"
        >
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-400 text-sm">{alertasHoje} conta{alertasHoje > 1 ? 's' : ''} vencendo hoje</p>
            <p className="text-xs text-zinc-500">Clique para acessar o financeiro</p>
          </div>
        </div>
      )}

      {/* ── Filtro de período ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider mr-1">Período:</span>
        {PERIODOS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
              ${periodo === p.key
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'}`}
          >
            {p.label}
          </button>
        ))}
        {periodo === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customInicio}
              onChange={e => setCustomInicio(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            />
            <span className="text-zinc-600 text-xs">–</span>
            <input
              type="date"
              value={customFim}
              onChange={e => setCustomFim(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => fetchAll()}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-xs hover:bg-orange-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Cards Grandes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiBig
          icon="💰"
          label={lojaId ? 'Vendas (período)' : 'Vendas hoje'}
          value={fmtCurrencyShort(kpis?.vendasHoje || 0)}
          sub={`${fmtNum(kpis?.qtdVendasHoje || 0)} venda${(kpis?.qtdVendasHoje || 0) !== 1 ? 's' : ''}`}
          accent
        />
        <KpiBig
          icon="📈"
          label="Faturamento"
          value={fmtCurrencyShort(kpis?.faturamentoTotal || 0)}
          sub="no período"
        />
        <KpiBig
          icon="🔁"
          label="Transações"
          value={fmtNum(kpis?.totalTransacoes || 0)}
          sub="vendas + OS"
        />
        <KpiBig
          icon="🎯"
          label="Ticket médio"
          value={fmtCurrencyShort(kpis?.ticketMedioGeral || 0)}
          sub="por transação"
        />
        <KpiBig
          icon={lojaId ? '🏪' : '🏆'}
          label={lojaId ? 'Loja ativa' : 'Loja líder'}
          value={kpis?.lojaLider || '—'}
          sub={lojaId ? 'unidade selecionada' : 'maior faturamento'}
        />
        <KpiBig
          icon="⚠️"
          label="Alertas"
          value={String(basicData?.alertasEstoque || 0)}
          sub="estoque baixo"
          onClick={() => navigateTo('estoque')}
        />
      </div>

      {/* ── Gráfico de Movimentação ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle icon="📊" title="Movimentação de Vendas" sub={graficoData?.agruparPorHora ? 'Por hora do dia' : 'Por dia do período'} />
        {graficoData && graficoData.movimentacao.length > 0 && graficoData.movimentacao.some(d => d.total > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={graficoData.movimentacao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717a' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#71717a' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => fmtCurrencyShort(v)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="vendas" name="vendas" stroke="#f97316" strokeWidth={2} fill="url(#gradVendas)" dot={false} activeDot={{ r: 4, fill: '#f97316' }} />
              <Area type="monotone" dataKey="os" name="os" stroke="#3b82f6" strokeWidth={2} fill="url(#gradOS)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-zinc-600 text-sm">Nenhuma venda confirmada neste período</p>
          </div>
        )}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-orange-500 rounded-full" />
            <span className="text-xs text-zinc-500">Vendas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
            <span className="text-xs text-zinc-500">OS</span>
          </div>
        </div>
      </div>

      {/* ── Gráficos: Faturamento por Loja + Produtos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Faturamento por loja / Comparativo diário-mensal-anual */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          {lojaId ? (
            <>
              <SectionTitle icon="📅" title="Faturamento da Loja" sub="diário · mensal · anual" />
              {faturamentoComp ? (() => {
                const compData = [
                  { label: 'Hoje', total: faturamentoComp.hoje.total, vendas: faturamentoComp.hoje.vendas, os: faturamentoComp.hoje.os, qtd: faturamentoComp.hoje.qtd },
                  { label: 'Mês atual', total: faturamentoComp.mes.total, vendas: faturamentoComp.mes.vendas, os: faturamentoComp.mes.os, qtd: faturamentoComp.mes.qtd },
                  { label: 'Ano atual', total: faturamentoComp.ano.total, vendas: faturamentoComp.ano.vendas, os: faturamentoComp.ano.os, qtd: faturamentoComp.ano.qtd },
                ];
                const maxVal = Math.max(...compData.map(d => d.total), 1);
                const colors = ['#f97316', '#3b82f6', '#22c55e'];
                return (
                  <div className="space-y-4 mt-4">
                    {compData.map((item, i) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-zinc-400">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500">{item.qtd} transaç{item.qtd !== 1 ? 'ões' : 'ão'}</span>
                            <span className="text-sm font-bold text-zinc-100">{fmtCurrencyShort(item.total)}</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(item.total / maxVal) * 100}%`, backgroundColor: colors[i] }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-zinc-600">Vendas: <span className="text-zinc-400">{fmtCurrencyShort(item.vendas)}</span></span>
                          <span className="text-xs text-zinc-600">OS: <span className="text-zinc-400">{fmtCurrencyShort(item.os)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <>
              <SectionTitle icon="🏪" title="Faturamento por Loja" sub="no período selecionado" />
              {graficoData && graficoData.faturamentoPorLoja.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={graficoData.faturamentoPorLoja}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => fmtCurrencyShort(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 11, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: '#27272a' }} />
                    <Bar dataKey="faturamento" name="Faturamento" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {graficoData.faturamentoPorLoja.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#f97316' : i === 1 ? '#fb923c' : '#78716c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <p className="text-zinc-600 text-sm">Nenhum dado no período</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Produtos mais vendidos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <SectionTitle icon="📦" title="Produtos com Maior Saída" />
            <div className="flex gap-1 -mt-1">
              {(['todos', 'motos', 'pecas', 'servicos'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setProdTab(t)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-all
                    ${prodTab === t ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t === 'todos' ? 'Todos' : t === 'motos' ? 'Motos' : t === 'pecas' ? 'Peças' : 'OS'}
                </button>
              ))}
            </div>
          </div>

          {prodItems.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-zinc-600 text-sm">Nenhum produto vendido neste período</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prodItems.map((item, i) => {
                const pct = maxProdQtd > 0 ? (item.quantidadeVendida / maxProdQtd) * 100 : 0;
                return (
                  <div key={`${item.tipo}-${item.produtoId || item.servicoId}`} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center flex-shrink-0">
                      {i < 3 ? MEDAL_ICON[i] : <span className="text-zinc-600 text-xs font-bold">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-zinc-300 truncate pr-2">{item.nome}</p>
                        <span className="text-xs font-bold text-zinc-200 flex-shrink-0">{fmtNum(item.quantidadeVendida)}x</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 flex-shrink-0 w-16 text-right">{fmtCurrencyShort(item.faturamento)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Ranking das Lojas / Resumo Financeiro ── */}
      {lojaId ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Contas vencendo hoje</p>
            <p className="text-2xl font-bold text-red-400">{basicData?.contasVencer?.hoje || 0}</p>
            <p className="text-xs text-zinc-600 mt-1">contas a receber</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Próximos 7 dias</p>
            <p className="text-2xl font-bold text-orange-400">{basicData?.contasVencer?.em7dias || 0}</p>
            <p className="text-xs text-zinc-600 mt-1">contas a vencer</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Saldo de caixa</p>
            <p className={`text-2xl font-bold ${(basicData?.fluxoCaixa?.saldo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtCurrencyShort(basicData?.fluxoCaixa?.saldo || 0)}
            </p>
            <p className="text-xs text-zinc-600 mt-1">entradas − saídas</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Estoque baixo</p>
            <p className="text-2xl font-bold text-yellow-400">{basicData?.alertasEstoque || 0}</p>
            <p className="text-xs text-zinc-600 mt-1">produtos abaixo mínimo</p>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <h2 className="text-sm font-semibold text-zinc-200">Ranking das Lojas</h2>
            </div>
            <span className="text-xs text-zinc-500">{ranking.length} lojas</span>
          </div>
          {ranking.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-sm">Nenhuma venda no período</div>
          ) : (
            <div className="px-1 py-2">
              {ranking.map(loja => (
                <RankingRow key={loja.lojaId} loja={loja} maxFat={maxFat} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reset Modal ── */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-900/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-bold text-red-400 mb-2">Resetar Sistema</h2>
              <p className="text-sm text-zinc-400">Esta ação irá <strong className="text-red-400">apagar todos os dados</strong> e restaurar o sistema ao estado inicial.</p>
              <p className="text-xs text-zinc-500 mt-2">Esta ação é irreversível.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetSistema}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {resetting ? 'Resetando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Dashboard ────────────────────────────────────────────────────────────

function UserDashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const navigateTo = (page: string) => {
    if (onNavigate) onNavigate(page);
    else window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  useEffect(() => {
    api.get<DashboardData>('/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const v = data?.vendasMes;
  const o = data?.osMes;
  const alertas = data?.alertasEstoque || 0;
  const contasHoje = data?.contasVencer?.hoje || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500">Bem-vindo, <span className="text-zinc-300">{user?.nome}</span></p>
      </div>

      {contasHoje > 0 && (
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-red-500/50 transition-colors"
        >
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-400 text-sm">{contasHoje} conta{contasHoje > 1 ? 's' : ''} vencendo hoje</p>
            <p className="text-xs text-zinc-500">Clique para acessar o financeiro</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiBig icon="💰" label="Vendas do mês" value={fmtCurrencyShort(v?.total || 0)} sub={`${v?.quantidade || 0} vendas`} accent />
        <KpiBig icon="🔧" label="OS do mês" value={fmtCurrencyShort(o?.total || 0)} sub={`${o?.quantidade || 0} ordens`} />
        <KpiBig icon="⚠️" label="Estoque baixo" value={String(alertas)} sub="produtos" onClick={() => navigateTo('estoque')} />
        <KpiBig icon="💵" label="Saldo caixa" value={fmtCurrencyShort(data?.fluxoCaixa?.saldo || 0)} sub="entradas - saídas" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '📦', label: 'Acessar Estoque', page: 'estoque', desc: 'Gerencie produtos e estoque' },
          { icon: '💼', label: 'Registrar Venda', page: 'vendas', desc: 'Iniciar nova venda' },
          { icon: '🔧', label: 'Nova Ordem de Serviço', page: 'os', desc: 'Abrir nova OS' },
        ].map(({ icon, label, page, desc }) => (
          <button
            key={page}
            onClick={() => navigateTo(page)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-orange-500/40 hover:bg-zinc-800/50 transition-all group"
          >
            <span className="text-2xl block mb-2">{icon}</span>
            <p className="font-semibold text-zinc-200 text-sm group-hover:text-orange-400 transition-colors">{label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { selectedLojaId } = useLojaContext();
  const isAdmin = ['ADMIN_GERAL', 'ADMIN_REDE', 'ADMIN_FINANCEIRO', 'DONO_LOJA'].includes(user?.role || '');

  if (isAdmin) {
    return <AdminDashboard onNavigate={onNavigate} lojaId={selectedLojaId || undefined} />;
  }
  return <UserDashboard onNavigate={onNavigate} />;
}
