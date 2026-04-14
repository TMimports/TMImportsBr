import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLojaContext } from '../contexts/LojaContext';
import { api } from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface VendaMes { mes: string; total: number; quantidade: number; }
interface TopProduto { nome: string; quantidade: number; receita: number; }
interface TopVendedor { nome: string; quantidade: number; receita: number; }
interface ComercialData {
  totalVendasMes: number;
  quantidadeVendasMes: number;
  totalVendasAno: number;
  quantidadeVendasAno: number;
  ticketMedio: number;
  vendasPorMes: VendaMes[];
  topProdutos: TopProduto[];
  topVendedores: TopVendedor[];
  totalClientes: number;
  novosClientesMes: number;
  totalMotosVendidas: number;
  totalPecasVendidas: number;
  taxaConversao?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum  = (v: number) => v.toLocaleString('pt-BR');
const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MES_NOW = new Date().getMonth();
const ANO_NOW = new Date().getFullYear();

function KPI({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string; }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color = 'bg-orange-500' }: {
  data: any[]; labelKey: string; valueKey: string; color?: string;
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 w-24 truncate flex-shrink-0">{d[labelKey]}</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
          <span className="text-xs text-zinc-300 w-16 text-right flex-shrink-0">
            {typeof d[valueKey] === 'number' && d[valueKey] > 1000
              ? fmtBRL(d[valueKey])
              : fmtNum(d[valueKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Comercial ────────────────────────────────────────────────────

export function DashboardComercial() {
  const { user } = useAuth();
  const { selectedLojaId } = useLojaContext();
  const [data, setData] = useState<ComercialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    setErro('');
    const params = selectedLojaId ? `?lojaId=${selectedLojaId}` : '';
    api.get<ComercialData>(`/dashboard/comercial${params}`)
      .then(d => setData(d))
      .catch(e => setErro(e.message || 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [selectedLojaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm animate-pulse">Carregando dashboard comercial...</div>
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{erro || 'Sem dados'}</div>
      </div>
    );
  }

  const vendasMesOrdenado = [...(data.vendasPorMes || [])].sort((a, b) => {
    const getMesIdx = (s: string) => {
      const parts = s.split('/');
      return (parseInt(parts[1] || '0') - 1) * 100 + parseInt(parts[0] || '0');
    };
    return getMesIdx(a.mes) - getMesIdx(b.mes);
  }).slice(-6);

  const mesAtualLabel = `${String(MES_NOW + 1).padStart(2,'0')}/${ANO_NOW}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🛍️ Dashboard Comercial
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Visão comercial — {selectedLojaId ? 'por loja' : 'todas as lojas'} · {MESES[MES_NOW]}/{ANO_NOW}
        </p>
        {user?.role === 'ADMIN_COMERCIAL' && (
          <p className="text-xs text-orange-400/70 mt-1 italic">Perfil somente leitura — dados de volume e indicadores comerciais</p>
        )}
      </div>

      {/* KPIs do mês */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Mês Atual</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Vendas no Mês"     value={fmtBRL(data.totalVendasMes)}     color="text-orange-400" />
          <KPI label="Qtd. Vendas"       value={fmtNum(data.quantidadeVendasMes)} color="text-white" sub="transações este mês" />
          <KPI label="Ticket Médio"      value={fmtBRL(data.ticketMedio)}         color="text-green-400" />
          <KPI label="Novos Clientes"    value={fmtNum(data.novosClientesMes)}    color="text-blue-400" sub="cadastros este mês" />
        </div>
      </div>

      {/* KPIs do ano */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Ano {ANO_NOW}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Volume Total"      value={fmtBRL(data.totalVendasAno)}      color="text-orange-400" />
          <KPI label="Total de Vendas"   value={fmtNum(data.quantidadeVendasAno)} color="text-white" />
          <KPI label="Motos Vendidas"    value={fmtNum(data.totalMotosVendidas)}  color="text-purple-400" sub="unidades do ano" />
          <KPI label="Base de Clientes"  value={fmtNum(data.totalClientes)}       color="text-cyan-400"   sub="clientes ativos" />
        </div>
      </div>

      {/* Gráfico de vendas por mês */}
      {vendasMesOrdenado.length > 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">📈 Evolução de Vendas — últimos 6 meses</h3>
          <div className="space-y-3">
            {vendasMesOrdenado.map((v, i) => {
              const maxMes = Math.max(...vendasMesOrdenado.map(x => x.total), 1);
              const pct = Math.round((v.total / maxMes) * 100);
              const isCurrent = v.mes === mesAtualLabel;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-xs w-14 flex-shrink-0 ${isCurrent ? 'text-orange-400 font-semibold' : 'text-zinc-400'}`}>
                    {v.mes}
                  </span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${isCurrent ? 'bg-orange-500' : 'bg-orange-500/40'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-40 flex-shrink-0 justify-end">
                    <span className="text-xs text-zinc-400">{v.quantidade} vendas</span>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-orange-400' : 'text-zinc-300'}`}>
                      {fmtBRL(v.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top produtos e vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.topProdutos?.length ?? 0) > 0 && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">🏍️ Modelos mais vendidos</h3>
            <BarChart data={data.topProdutos} labelKey="nome" valueKey="quantidade" color="bg-orange-500" />
          </div>
        )}
        {(data.topVendedores?.length ?? 0) > 0 && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">🏆 Top Vendedores</h3>
            <BarChart data={data.topVendedores} labelKey="nome" valueKey="receita" color="bg-green-500" />
          </div>
        )}
      </div>

      {/* Peças vs Motos */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">📊 Mix de Vendas — Ano {ANO_NOW}</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-400">{fmtNum(data.totalMotosVendidas)}</p>
            <p className="text-sm text-zinc-400 mt-1">Motos vendidas</p>
            {data.quantidadeVendasAno > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((data.totalMotosVendidas / data.quantidadeVendasAno) * 100)}% das transações
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-400">{fmtNum(data.totalPecasVendidas)}</p>
            <p className="text-sm text-zinc-400 mt-1">Peças vendidas</p>
            {data.quantidadeVendasAno > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((data.totalPecasVendidas / data.quantidadeVendasAno) * 100)}% das transações
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
