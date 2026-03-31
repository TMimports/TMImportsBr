import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v: number) => v.toLocaleString('pt-BR');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

type Periodo = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'mes', label: 'Mês atual' },
  { key: 'custom', label: 'Período' },
];

const MEDAL_COLORS = [
  'from-yellow-500/20 to-yellow-600/10 border-yellow-500/40',
  'from-zinc-400/20 to-zinc-500/10 border-zinc-400/40',
  'from-orange-700/20 to-orange-800/10 border-orange-700/40',
];
const MEDAL_TEXT = ['text-yellow-400', 'text-zinc-300', 'text-orange-500'];
const MEDAL_ICON = ['🥇', '🥈', '🥉'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'zinc', icon, onClick }: {
  label: string; value: string; sub?: string; color?: string; icon: string; onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    zinc: 'text-zinc-100', orange: 'text-orange-400', green: 'text-green-400',
    yellow: 'text-yellow-400', red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-zinc-600 transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${colors[color]} leading-tight`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function AutoRefreshIndicator({ lastUpdated, refreshing, onRefresh }: {
  lastUpdated: Date | null; refreshing: boolean; onRefresh: () => void;
}) {
  const [, forceUpdate] = useState(false);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(b => !b), 10000);
    return () => clearInterval(t);
  }, []);

  const ago = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : null;

  const agoText = ago === null ? '' : ago < 10 ? 'agora' : ago < 60 ? `${ago}s atrás` : `${Math.floor(ago / 60)}min atrás`;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
      <span className="text-xs text-zinc-500">
        {refreshing ? 'Atualizando...' : `Atualizado ${agoText}`}
      </span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
      >
        ↻ Atualizar
      </button>
    </div>
  );
}

function Top3Lojas({ ranking }: { ranking: LojaRanking[] }) {
  const top = ranking.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-200 mb-3 flex items-center gap-2">
        <span>🏆</span> Top 3 Lojas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top.map((loja, i) => (
          <div
            key={loja.lojaId}
            className={`bg-gradient-to-br ${MEDAL_COLORS[i]} border rounded-xl p-5 relative overflow-hidden`}
          >
            <div className="absolute top-3 right-4 text-3xl opacity-80">{MEDAL_ICON[i]}</div>
            <div className="mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${MEDAL_TEXT[i]}`}>
                #{loja.posicao}º lugar
              </span>
            </div>
            <h3 className="font-bold text-zinc-100 text-base mb-1 pr-8">{loja.lojaNome}</h3>
            <p className="text-xs text-zinc-500 mb-3">{loja.grupoNome}</p>
            <p className={`text-xl font-bold ${MEDAL_TEXT[i]} mb-1`}>{fmtCurrency(loja.faturamento)}</p>
            <p className="text-xs text-zinc-400 mb-3">faturamento total</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Vendas</span>
                <span className="text-zinc-300">{fmtCurrency(loja.totalVendas)} ({loja.quantidadeVendas})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">OS</span>
                <span className="text-zinc-300">{fmtCurrency(loja.totalOS)} ({loja.quantidadeOS})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Ticket médio</span>
                <span className="text-zinc-300">{fmtCurrency(loja.ticketMedio)}</span>
              </div>
              {loja.produtoMaisVendido && (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Mais vendido</span>
                  <span className="text-zinc-300 truncate max-w-[120px] text-right">{loja.produtoMaisVendido}</span>
                </div>
              )}
              {loja.ultimaVenda && (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Última venda</span>
                  <span className="text-zinc-400">{fmtDateTime(loja.ultimaVenda)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingTable({ ranking }: { ranking: LojaRanking[] }) {
  if (ranking.length === 0) {
    return <div className="text-center py-10 text-zinc-500">Nenhuma loja com vendas no período.</div>;
  }

  const maxFaturamento = ranking[0]?.faturamento || 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">#</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Loja</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Faturamento</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden sm:table-cell">Vendas</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">OS</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Ticket Médio</th>
            <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden xl:table-cell">+ Vendido</th>
            <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden xl:table-cell">Última Venda</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((loja) => {
            const pct = maxFaturamento > 0 ? (loja.faturamento / maxFaturamento) * 100 : 0;
            const medal = loja.posicao <= 3 ? MEDAL_ICON[loja.posicao - 1] : null;
            return (
              <tr key={loja.lojaId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {medal && <span className="text-base">{medal}</span>}
                    <span className={`font-bold text-sm ${loja.posicao <= 3 ? MEDAL_TEXT[loja.posicao - 1] : 'text-zinc-500'}`}>
                      {loja.posicao}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200">{loja.lojaNome}</p>
                  <p className="text-xs text-zinc-500">{loja.grupoNome}</p>
                  <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden w-24">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-semibold text-zinc-100">{fmtCurrency(loja.faturamento)}</p>
                  <p className="text-xs text-zinc-500">{fmtNum(loja.quantidadeVendas + loja.quantidadeOS)} transações</p>
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <p className="font-medium text-green-400">{fmtCurrency(loja.totalVendas)}</p>
                  <p className="text-xs text-zinc-500">{loja.quantidadeVendas} vendas</p>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <p className="font-medium text-blue-400">{fmtCurrency(loja.totalOS)}</p>
                  <p className="text-xs text-zinc-500">{loja.quantidadeOS} OS</p>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <p className="font-medium text-zinc-300">{fmtCurrency(loja.ticketMedio)}</p>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <p className="text-xs text-zinc-400">{loja.produtoMaisVendido || '—'}</p>
                </td>
                <td className="px-4 py-3 text-right hidden xl:table-cell">
                  <p className="text-xs text-zinc-400">
                    {loja.ultimaVenda ? fmtDateTime(loja.ultimaVenda) : '—'}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProdutosMaisVendidos({ data }: { data: ProdutosData | null }) {
  const [tab, setTab] = useState<'todos' | 'motos' | 'pecas' | 'servicos'>('todos');

  if (!data) return null;

  const items = data[tab];
  const maxQtd = Math.max(...items.map(i => i.quantidadeVendida), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
          <span>📦</span> Produtos com Maior Saída
        </h2>
        <div className="flex gap-1">
          {(['todos', 'motos', 'pecas', 'servicos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {t === 'todos' ? 'Todos' : t === 'motos' ? 'Motos' : t === 'pecas' ? 'Peças' : 'Serviços'}
              {t !== 'todos' && (
                <span className="ml-1 opacity-60">({data[t].length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
          Nenhum produto vendido neste período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">#</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Produto / Serviço</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden sm:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Qtd Vendida</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Faturamento</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Participação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const pct = maxQtd > 0 ? (item.quantidadeVendida / maxQtd) * 100 : 0;
                const tipoColor = item.tipo === 'MOTO' ? 'bg-orange-900/40 text-orange-300' :
                  item.tipo === 'PECA' ? 'bg-blue-900/40 text-blue-300' :
                  'bg-purple-900/40 text-purple-300';
                return (
                  <tr key={`${item.tipo}-${item.produtoId || item.servicoId}`} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${item.posicao <= 3 ? MEDAL_TEXT[item.posicao - 1] : 'text-zinc-500'}`}>
                        {item.posicao <= 3 ? MEDAL_ICON[item.posicao - 1] : item.posicao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-200">{item.nome}</p>
                      <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden w-32">
                        <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipoColor}`}>
                        {item.tipo === 'SERVICO' ? 'Serviço' : item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-zinc-100 text-lg">{fmtNum(item.quantidadeVendida)}</p>
                      <p className="text-xs text-zinc-500">unidades</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <p className="font-medium text-green-400">{fmtCurrency(item.faturamento)}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <p className="text-sm text-zinc-300">{item.participacao.toFixed(1)}%</p>
                      <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden w-16 ml-auto">
                        <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${Math.min(100, item.participacao)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [produtosData, setProdutosData] = useState<ProdutosData | null>(null);
  const [basicData, setBasicData] = useState<DashboardData | null>(null);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
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
    return params;
  }, [periodo, customInicio, customFim]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const params = buildParams();
    try {
      const [ranking, produtos, basic, comissoes] = await Promise.all([
        api.get<RankingData>(`/dashboard/ranking-lojas${params}`),
        api.get<ProdutosData>(`/dashboard/produtos-mais-vendidos${params}`),
        api.get<DashboardData>('/dashboard'),
        api.get<any[]>('/financeiro/comissoes')
      ]);
      setRankingData(ranking);
      setProdutosData(produtos);
      setBasicData(basic);
      setComissoesPendentes(comissoes.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams]);

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

  const kpis = rankingData?.kpis;
  const ranking = rankingData?.ranking || [];
  const alertasHoje = basicData?.contasVencer?.hoje || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-400">Bem-vindo, {user?.nome}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AutoRefreshIndicator lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={() => fetchAll(true)} />
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-900/60 rounded-lg text-xs hover:bg-red-900/60 transition-colors"
          >
            Resetar Sistema
          </button>
        </div>
      </div>

      {/* Alerta contas vencer */}
      {alertasHoje > 0 && (
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-red-900/40 transition-colors"
        >
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-400">{alertasHoje} conta{alertasHoje > 1 ? 's' : ''} vencendo HOJE</p>
            <p className="text-xs text-zinc-400">Clique para acessar o financeiro</p>
          </div>
        </div>
      )}

      {/* Filtro de período */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Período:</span>
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${periodo === p.key ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {p.label}
            </button>
          ))}
          {periodo === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customInicio}
                onChange={e => setCustomInicio(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input
                type="date"
                value={customFim}
                onChange={e => setCustomFim(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={() => fetchAll()}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Vendas Hoje"
          value={fmtCurrency(kpis?.vendasHoje || 0)}
          sub={`${kpis?.qtdVendasHoje || 0} vendas`}
          color="green"
          icon="📅"
          onClick={() => navigateTo('vendas')}
        />
        <KpiCard
          label="Faturamento"
          value={fmtCurrency(kpis?.faturamentoTotal || 0)}
          sub="no período"
          color="orange"
          icon="💰"
        />
        <KpiCard
          label="Transações"
          value={fmtNum(kpis?.totalTransacoes || 0)}
          sub="vendas + OS"
          color="blue"
          icon="📊"
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtCurrency(kpis?.ticketMedioGeral || 0)}
          sub="por transação"
          color="purple"
          icon="🎯"
        />
        <KpiCard
          label="Loja Líder"
          value={kpis?.lojaLider || '—'}
          sub="maior faturamento"
          color="yellow"
          icon="🏆"
        />
        <KpiCard
          label="Alertas Estoque"
          value={String(basicData?.alertasEstoque || 0)}
          sub="itens abaixo do mín."
          color={basicData?.alertasEstoque ? 'red' : 'zinc'}
          icon="⚠️"
          onClick={() => navigateTo('estoque')}
        />
      </div>

      {/* KPIs financeiros secundários */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-xs text-zinc-500 mb-1">Entradas Mês</p>
          <p className="text-lg font-bold text-green-400">{fmtCurrency(basicData?.fluxoCaixa?.entradas || 0)}</p>
        </div>
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-xs text-zinc-500 mb-1">Saídas Mês</p>
          <p className="text-lg font-bold text-red-400">{fmtCurrency(basicData?.fluxoCaixa?.saidas || 0)}</p>
        </div>
        <div
          onClick={() => navigateTo('financeiro')}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-xs text-zinc-500 mb-1">Saldo Mês</p>
          <p className={`text-lg font-bold ${(basicData?.fluxoCaixa?.saldo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtCurrency(basicData?.fluxoCaixa?.saldo || 0)}
          </p>
        </div>
        <div
          onClick={() => navigateTo('comissoes')}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-xs text-zinc-500 mb-1">Comissões Pendentes</p>
          <p className="text-lg font-bold text-purple-400">{fmtCurrency(comissoesPendentes)}</p>
        </div>
      </div>

      {/* Top 3 */}
      <Top3Lojas ranking={ranking} />

      {/* Ranking completo */}
      <div>
        <h2 className="text-base font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <span>📋</span> Ranking de Todas as Lojas
          <span className="text-xs text-zinc-600 font-normal">— ordenado por faturamento</span>
        </h2>
        <RankingTable ranking={ranking} />
      </div>

      {/* Produtos mais vendidos */}
      <ProdutosMaisVendidos data={produtosData} />

      {/* Contas a vencer */}
      <div>
        <h2 className="text-base font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <span>📅</span> Contas a Vencer
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors text-center">
            <p className={`text-2xl font-bold ${alertasHoje > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{alertasHoje}</p>
            <p className="text-xs text-zinc-500 mt-1">Hoje</p>
          </div>
          <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors text-center">
            <p className={`text-2xl font-bold ${(basicData?.contasVencer?.em3dias || 0) > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>{basicData?.contasVencer?.em3dias || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">3 dias</p>
          </div>
          <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors text-center">
            <p className="text-2xl font-bold text-zinc-400">{basicData?.contasVencer?.em7dias || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">7 dias</p>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-red-500/50">
            <h2 className="text-xl font-bold text-red-400 mb-4">Resetar Sistema</h2>
            <p className="text-zinc-300 mb-4">Esta ação irá <strong>APAGAR TODOS OS DADOS</strong> do sistema:</p>
            <ul className="text-zinc-400 text-sm mb-4 list-disc list-inside space-y-1">
              <li>Todas as vendas e orçamentos</li>
              <li>Todas as OS</li>
              <li>Todos os clientes</li>
              <li>Todos os produtos e estoque</li>
              <li>Todo o financeiro</li>
              <li>Todos os usuários (exceto admin)</li>
            </ul>
            <p className="text-red-400 font-bold mb-6">Esta ação NÃO pode ser desfeita!</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetModal(false)} disabled={resetting} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleResetSistema} disabled={resetting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                {resetting ? 'Resetando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vendedor / Outros Roles Dashboard ────────────────────────────────────────

function UserDashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comissoesPendentes, setComissoesPendentes] = useState(0);

  const navigateTo = (page: string) => {
    if (onNavigate) onNavigate(page);
    else window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const isVendedor = user?.role === 'VENDEDOR';

  useEffect(() => {
    const fetch = (silent = false) => {
      if (!silent) setLoading(true);
      Promise.all([
        api.get<DashboardData>('/dashboard'),
        api.get<any[]>('/financeiro/comissoes')
      ]).then(([d, comissoes]) => {
        setData(d);
        setComissoesPendentes(comissoes.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0));
      }).catch(console.error).finally(() => setLoading(false));
    };
    fetch();
    const t = setInterval(() => fetch(true), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-400">Bem-vindo, {user?.nome}</p>
      </div>

      {!isVendedor && (data?.contasVencer?.hoje || 0) > 0 && (
        <div onClick={() => navigateTo('financeiro')} className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-red-900/40 transition-colors">
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-400">{data?.contasVencer?.hoje} conta(s) vencendo HOJE</p>
            <p className="text-xs text-zinc-400">Clique para acessar o financeiro</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label={isVendedor ? 'Minhas Vendas' : 'Vendas do Mês'}
          value={fmtCurrency(data?.vendasMes?.total || 0)}
          sub={`${data?.vendasMes?.quantidade || 0} vendas`}
          color="green"
          icon="💰"
          onClick={() => navigateTo('vendas')}
        />
        <KpiCard
          label={isVendedor ? 'Minhas OS' : 'OS do Mês'}
          value={fmtCurrency(data?.osMes?.total || 0)}
          sub={`${data?.osMes?.quantidade || 0} ordens`}
          color="blue"
          icon="🔧"
          onClick={() => navigateTo('os')}
        />
        <KpiCard
          label="Alertas de Estoque"
          value={String(data?.alertasEstoque || 0)}
          sub="itens abaixo do mínimo"
          color={data?.alertasEstoque ? 'yellow' : 'zinc'}
          icon="⚠️"
          onClick={() => navigateTo('estoque')}
        />
        <KpiCard
          label={isVendedor ? 'Minhas Comissões' : 'Comissões Pendentes'}
          value={fmtCurrency(comissoesPendentes)}
          sub="a pagar"
          color="purple"
          icon="💸"
          onClick={() => navigateTo('comissoes')}
        />
        <KpiCard
          label="Contas a Receber"
          value="Ver detalhes"
          sub="clique para acessar"
          color="zinc"
          icon="💳"
          onClick={() => navigateTo('contas-receber')}
        />
        <KpiCard
          label="Garantias"
          value="Ver detalhes"
          sub="clique para acessar"
          color="zinc"
          icon="📜"
          onClick={() => navigateTo('garantias')}
        />
      </div>

      {!isVendedor && (
        <div>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Fluxo de Caixa do Mês</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors">
              <p className="text-xs text-zinc-500 mb-1">Entradas</p>
              <p className="text-2xl font-bold text-green-400">{fmtCurrency(data?.fluxoCaixa?.entradas || 0)}</p>
            </div>
            <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors">
              <p className="text-xs text-zinc-500 mb-1">Saídas</p>
              <p className="text-2xl font-bold text-red-400">{fmtCurrency(data?.fluxoCaixa?.saidas || 0)}</p>
            </div>
            <div onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors">
              <p className="text-xs text-zinc-500 mb-1">Saldo</p>
              <p className={`text-2xl font-bold ${(data?.fluxoCaixa?.saldo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtCurrency(data?.fluxoCaixa?.saldo || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isVendedor && (
        <div>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Contas a Vencer</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hoje', val: data?.contasVencer?.hoje || 0, color: 'red' as const },
              { label: '3 dias', val: data?.contasVencer?.em3dias || 0, color: 'yellow' as const },
              { label: '7 dias', val: data?.contasVencer?.em7dias || 0, color: 'zinc' as const },
            ].map(({ label, val, color }) => (
              <div key={label} onClick={() => navigateTo('financeiro')} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors text-center">
                <p className={`text-2xl font-bold ${val > 0 && color !== 'zinc' ? `text-${color}-400` : 'text-zinc-400'}`}>{val}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN_GERAL';

  if (isAdmin) {
    return <AdminDashboard onNavigate={onNavigate} />;
  }
  return <UserDashboard onNavigate={onNavigate} />;
}
