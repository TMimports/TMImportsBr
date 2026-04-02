import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Financeiro } from './Financeiro';
import { ContasReceber } from './ContasReceber';
import { CategoriasDepartamentos } from './CategoriasDepartamentos';
import { PedidosCompra } from './PedidosCompra';
import { NotasFiscais } from './NotasFiscais';
import { DashboardEmpresa } from './DashboardEmpresa';

// ── Visão Geral (resumo consolidado) ──────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface DashFinanceiro {
  saldoLiquido: number;
  totalPagar: number;
  totalReceber: number;
  qtdVencidoPagar: number;
  totalVencidoPagar: number;
  qtdVencidoReceber: number;
  totalVencidoReceber: number;
  vencendo7diasPagar: number;
  vencendo7diasReceber: number;
}

function KpiCard({ label, value, sub, color = 'text-white', icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div className="bg-zinc-800 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-zinc-500 text-xs">{sub}</div>}
    </div>
  );
}

function VisaoGeral() {
  const { token } = useAuth();
  const [data, setData] = useState<DashFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/financeiro/dashboard', { headers })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-zinc-500">Carregando resumo...</div>
  );

  if (!data) return null;

  const saldo = data.saldoLiquido ?? 0;

  return (
    <div className="p-6 space-y-8">
      {/* Saldo líquido destaque */}
      <div className={`rounded-2xl p-8 flex flex-col items-center text-center ${
        saldo >= 0 ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'
      }`}>
        <div className="text-zinc-400 text-sm uppercase tracking-widest mb-2">Saldo Líquido</div>
        <div className={`text-5xl font-extrabold ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fmt(saldo)}
        </div>
        <div className="text-zinc-500 text-sm mt-2">
          A Receber − A Pagar em aberto
        </div>
      </div>

      {/* KPIs principais */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Contas a Pagar</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard icon="📤" label="Em Aberto" value={fmt(data.totalPagar ?? 0)} color="text-red-400" />
          <KpiCard icon="⚠️" label="Vencidas" value={fmt(data.totalVencidoPagar ?? 0)}
            sub={`${data.qtdVencidoPagar ?? 0} lançamentos`} color="text-red-300" />
          <KpiCard icon="⏳" label="Vencendo em 7 dias" value={fmt(data.vencendo7diasPagar ?? 0)} color="text-orange-400" />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Contas a Receber</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard icon="📥" label="Em Aberto" value={fmt(data.totalReceber ?? 0)} color="text-green-400" />
          <KpiCard icon="⚠️" label="Vencidas" value={fmt(data.totalVencidoReceber ?? 0)}
            sub={`${data.qtdVencidoReceber ?? 0} lançamentos`} color="text-yellow-400" />
          <KpiCard icon="⏳" label="Vencendo em 7 dias" value={fmt(data.vencendo7diasReceber ?? 0)} color="text-blue-400" />
        </div>
      </div>
    </div>
  );
}

// ── Tabs config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'visao-geral',    label: 'Visão Geral',         icon: '📊' },
  { id: 'por-cnpj',       label: 'Por CNPJ',            icon: '🏢' },
  { id: 'contas-pagar',   label: 'Contas a Pagar',      icon: '📤' },
  { id: 'contas-receber', label: 'Contas a Receber',    icon: '📥' },
  { id: 'pedidos-compra', label: 'Pedidos de Compra',   icon: '🛒' },
  { id: 'notas-fiscais',  label: 'Notas Fiscais',       icon: '🧾' },
  { id: 'plano-contas',   label: 'Plano de Contas',     icon: '🏷' },
] as const;

type TabId = typeof TABS[number]['id'];

const ADMIN_TABS: TabId[] = ['visao-geral', 'por-cnpj', 'contas-pagar', 'contas-receber', 'pedidos-compra', 'notas-fiscais', 'plano-contas'];
const STORE_TABS: TabId[] = ['visao-geral', 'por-cnpj', 'contas-pagar', 'contas-receber', 'pedidos-compra', 'notas-fiscais', 'plano-contas'];

// ── Hub principal ──────────────────────────────────────────────────────────────

export function FinanceiroHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('visao-geral');

  const role = user?.role ?? '';
  const allowedTabs: TabId[] =
    role === 'ADMIN_GERAL' || role === 'ADMIN_FINANCEIRO' ? ADMIN_TABS : STORE_TABS;

  const visibleTabs = TABS.filter(t => allowedTabs.includes(t.id));

  const renderContent = () => {
    switch (activeTab) {
      case 'visao-geral':    return <VisaoGeral />;
      case 'por-cnpj':       return <DashboardEmpresa />;
      case 'contas-pagar':   return <Financeiro />;
      case 'contas-receber': return <ContasReceber />;
      case 'pedidos-compra': return <PedidosCompra />;
      case 'notas-fiscais':  return <NotasFiscais />;
      case 'plano-contas':   return <CategoriasDepartamentos />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-zinc-950">
      {/* Header do hub */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 pt-5 pb-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            💵 <span>Financeiro</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">Central financeira — tudo em um só lugar</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
