import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LojaResumo {
  id: number;
  nomeFantasia: string;
  razaoSocial: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  createdAt: string;
  totalMotos: number;
  totalPecas: number;
  totalAlertas: number;
  semEstoque: number;
  valorEstimado: number;
  ultimaMovimentacao: string | null;
}

interface GrupoResumo {
  id: number;
  nome: string;
  totalLojas: number;
  totalMotos: number;
  totalPecas: number;
  totalAlertas: number;
  lojas: LojaResumo[];
}

interface ItemEstoque {
  id: number;
  quantidade: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  produto: { id: number; nome: string; tipo: string; preco: number; codigo: string };
}

interface Venda {
  id: number;
  tipo: string;
  confirmadaFinanceiro: boolean;
  createdAt: string;
  valorTotal: number;
  cliente: { nome: string };
  vendedor: { nome: string };
  itens: { produto?: { nome: string; tipo: string }; quantidade: number; precoUnitario: number }[];
}

interface OS {
  id: number;
  numero: string;
  status: string;
  tipo: string;
  confirmadaFinanceiro: boolean;
  createdAt: string;
  valorTotal: number;
  tecnico?: string;
  cliente: { nome: string };
  itens: { produto?: { nome: string }; servico?: { nome: string }; quantidade: number; precoUnitario: number }[];
}

interface LogEstoque {
  id: number;
  tipo: string;
  origem: string;
  origemId?: number;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  createdAt: string;
  produto: { nome: string; tipo: string };
  usuario: { nome: string };
}

interface LojaDetalhes {
  loja: {
    id: number;
    nomeFantasia?: string;
    razaoSocial: string;
    cnpj: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    ativo: boolean;
    createdAt: string;
    grupo: { id: number; nome: string };
    usuarios: { nome: string; email: string }[];
  };
  resumo: {
    totalMotos: number;
    totalPecas: number;
    totalAlertas: number;
    semEstoque: number;
    valorEstimado: number;
    ultimaMovimentacao: string | null;
  };
  itens: ItemEstoque[];
  vendas: Venda[];
  os: OS[];
  logs: LogEstoque[];
  alertas: ItemEstoque[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusBadge({ value }: { value: string; type?: 'os' | 'venda' | 'estoque' | 'loja' }) {
  const configs: Record<string, string> = {
    ORCAMENTO: 'bg-zinc-700 text-zinc-300',
    EM_EXECUCAO: 'bg-blue-900/50 text-blue-300',
    EXECUTADA: 'bg-green-900/50 text-green-300',
    VENDA: 'bg-orange-900/50 text-orange-300',
    OK: 'bg-green-900/50 text-green-300',
    BAIXO: 'bg-yellow-900/50 text-yellow-300',
    CRITICO: 'bg-red-900/50 text-red-300',
    ATIVO: 'bg-green-900/50 text-green-300',
    INATIVO: 'bg-red-900/50 text-red-300',
    PAGO: 'bg-green-900/50 text-green-300',
    PENDENTE: 'bg-yellow-900/50 text-yellow-300',
  };
  const labels: Record<string, string> = {
    EM_EXECUCAO: 'Em Execução',
    EXECUTADA: 'Executada',
    ORCAMENTO: 'Orçamento',
    VENDA: 'Venda',
    OK: 'OK',
    BAIXO: 'Baixo',
    CRITICO: 'Crítico',
    ATIVO: 'Ativo',
    INATIVO: 'Inativo',
    PAGO: 'Pago',
    PENDENTE: 'Pendente',
  };
  const cls = configs[value] ?? 'bg-zinc-700 text-zinc-400';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {labels[value] ?? value}
    </span>
  );
}

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-zinc-400 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-orange-400 transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-zinc-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function KpiCard({ label, value, sub, color = 'zinc' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    zinc: 'text-zinc-100',
    orange: 'text-orange-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };
  return (
    <div className="bg-zinc-800/60 rounded-lg p-4 border border-zinc-700/50">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Level 1: Grupos ──────────────────────────────────────────────────────────

function GruposView({ grupos, onSelectGrupo }: { grupos: GrupoResumo[]; onSelectGrupo: (g: GrupoResumo) => void }) {
  const [search, setSearch] = useState('');

  const filtered = grupos.filter(g =>
    g.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Estoque</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Visão geral por grupo / responsável</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar grupo..."
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">Nenhum grupo encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(grupo => (
            <div key={grupo.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">{grupo.nome}</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">{grupo.totalLojas} {grupo.totalLojas === 1 ? 'loja' : 'lojas'}</p>
                </div>
                {grupo.totalAlertas > 0 && (
                  <span className="bg-red-900/50 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
                    {grupo.totalAlertas} alerta{grupo.totalAlertas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-400">{grupo.totalMotos}</p>
                  <p className="text-xs text-zinc-500">Motos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{grupo.totalPecas}</p>
                  <p className="text-xs text-zinc-500">Peças</p>
                </div>
                <div className="text-center">
                  <p className={`text-xl font-bold ${grupo.totalAlertas > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{grupo.totalAlertas}</p>
                  <p className="text-xs text-zinc-500">Alertas</p>
                </div>
              </div>

              <Button variant="secondary" size="sm" className="w-full" onClick={() => onSelectGrupo(grupo)}>
                Ver Lojas
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Level 2: Lojas ───────────────────────────────────────────────────────────

function LojasView({ grupo, onSelectLoja, onBack }: { grupo: GrupoResumo; onSelectLoja: (l: LojaResumo) => void; onBack?: () => void }) {
  const [search, setSearch] = useState('');

  const filtered = grupo.lojas.filter(l =>
    l.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
    l.razaoSocial.toLowerCase().includes(search.toLowerCase())
  );

  const statusEstoque = (l: LojaResumo) => {
    if (l.semEstoque > 0) return 'CRITICO';
    if (l.totalAlertas > 0) return 'BAIXO';
    return 'OK';
  };

  return (
    <div>
      {onBack && (
        <Breadcrumb items={[
          { label: 'Estoque', onClick: onBack },
          { label: grupo.nome }
        ]} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{grupo.nome}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{grupo.totalLojas} {grupo.totalLojas === 1 ? 'loja' : 'lojas'} · {grupo.totalMotos} motos · {grupo.totalPecas} peças</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar loja..."
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-56"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">Nenhuma loja encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(loja => {
            const st = statusEstoque(loja);
            return (
              <div key={loja.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100">{loja.nomeFantasia}</h3>
                      <StatusBadge value={loja.ativo ? 'ATIVO' : 'INATIVO'} type="loja" />
                    </div>
                    {loja.endereco && <p className="text-xs text-zinc-500 mt-0.5">{loja.endereco}</p>}
                    {loja.telefone && <p className="text-xs text-zinc-500">{loja.telefone}</p>}
                  </div>
                  <StatusBadge value={st} type="estoque" />
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center bg-zinc-800/50 rounded-lg py-2">
                    <p className="text-lg font-bold text-orange-400">{loja.totalMotos}</p>
                    <p className="text-xs text-zinc-500">Motos</p>
                  </div>
                  <div className="text-center bg-zinc-800/50 rounded-lg py-2">
                    <p className="text-lg font-bold text-blue-400">{loja.totalPecas}</p>
                    <p className="text-xs text-zinc-500">Peças</p>
                  </div>
                  <div className="text-center bg-zinc-800/50 rounded-lg py-2">
                    <p className={`text-lg font-bold ${loja.totalAlertas > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>{loja.totalAlertas}</p>
                    <p className="text-xs text-zinc-500">Alertas</p>
                  </div>
                  <div className="text-center bg-zinc-800/50 rounded-lg py-2">
                    <p className={`text-lg font-bold ${loja.semEstoque > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{loja.semEstoque}</p>
                    <p className="text-xs text-zinc-500">Zerados</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    {loja.ultimaMovimentacao
                      ? `Última mov.: ${fmtDate(loja.ultimaMovimentacao)}`
                      : 'Sem movimentações'}
                  </div>
                  <Button variant="primary" size="sm" onClick={() => onSelectLoja(loja)}>
                    Ver detalhes
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Level 3: Loja Detail Tabs ────────────────────────────────────────────────

type TabKey = 'resumo' | 'estoque' | 'pedidos' | 'movimentacao' | 'alertas';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'movimentacao', label: 'Movimentação' },
  { key: 'alertas', label: 'Alertas' },
];

function TabResumo({ det }: { det: LojaDetalhes }) {
  const { loja, resumo } = det;
  const donos = loja.usuarios;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Motos" value={resumo.totalMotos} color="orange" />
        <KpiCard label="Peças" value={resumo.totalPecas} color="blue" />
        <KpiCard label="Alertas" value={resumo.totalAlertas} color={resumo.totalAlertas > 0 ? 'yellow' : 'zinc'} />
        <KpiCard label="Zerados" value={resumo.semEstoque} color={resumo.semEstoque > 0 ? 'red' : 'zinc'} />
        <KpiCard label="Pedidos" value={det.vendas.length + det.os.length} color="zinc" sub="últimos 30" />
        <KpiCard label="Val. Estimado" value={fmtCurrency(resumo.valorEstimado)} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Dados da Loja</h3>
          <div className="space-y-3">
            <InfoRow label="Nome" value={loja.nomeFantasia || loja.razaoSocial} />
            <InfoRow label="Razão Social" value={loja.razaoSocial} />
            <InfoRow label="CNPJ" value={loja.cnpj} />
            <InfoRow label="Grupo" value={loja.grupo.nome} />
            <InfoRow label="Endereço" value={loja.endereco || '—'} />
            <InfoRow label="Telefone" value={loja.telefone || '—'} />
            <InfoRow label="E-mail" value={loja.email || '—'} />
            <InfoRow label="Cadastro" value={fmtDate(loja.createdAt)} />
            <InfoRow label="Situação" value={loja.ativo ? 'Ativa' : 'Inativa'} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Responsáveis</h3>
          {donos.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum responsável cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {donos.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-semibold text-sm">
                    {u.nome[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{u.nome}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Atividade Recente</h4>
            <div className="space-y-2">
              <InfoRow label="Última Movimentação" value={resumo.ultimaMovimentacao ? fmtDateTime(resumo.ultimaMovimentacao) : 'Sem movimentações'} />
              <InfoRow label="Últimas Vendas" value={`${det.vendas.filter(v => v.tipo === 'VENDA').length} vendas registradas`} />
              <InfoRow label="Últimas OS" value={`${det.os.length} ordens de serviço`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function TabEstoque({ itens }: { itens: ItemEstoque[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'motos' | 'pecas' | 'alertas'>('todos');

  const filtered = itens.filter(item => {
    const matchSearch = item.produto.nome.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'motos' ? item.produto.tipo === 'MOTO' :
      filter === 'pecas' ? item.produto.tipo === 'PECA' :
      item.quantidade <= item.estoqueMinimo && item.estoqueMinimo > 0;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar produto..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <div className="flex gap-1">
          {([['todos', 'Todos'], ['motos', 'Motos'], ['pecas', 'Peças'], ['alertas', 'Alertas']] as [string, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === k ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Produto</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Tipo</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Qtd</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Mín</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Máx</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Preço</th>
              <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-zinc-500">Nenhum item encontrado.</td></tr>
            )}
            {filtered.map(item => {
              const baixo = item.quantidade <= item.estoqueMinimo && item.estoqueMinimo > 0;
              const zerado = item.quantidade === 0;
              return (
                <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-zinc-200 font-medium">{item.produto.nome}</p>
                    <p className="text-xs text-zinc-500">{item.produto.codigo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.produto.tipo === 'MOTO' ? 'bg-orange-900/40 text-orange-300' : 'bg-blue-900/40 text-blue-300'}`}>
                      {item.produto.tipo}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold text-base ${zerado ? 'text-red-400' : baixo ? 'text-yellow-400' : 'text-zinc-100'}`}>
                    {item.quantidade}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">{item.estoqueMinimo}</td>
                  <td className="px-4 py-3 text-right text-zinc-400">{item.estoqueMaximo}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{fmtCurrency(Number(item.produto.preco))}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge value={zerado ? 'CRITICO' : baixo ? 'BAIXO' : 'OK'} type="estoque" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPedidos({ vendas, os }: { vendas: Venda[]; os: OS[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'vendas' | 'os' | 'pendentes'>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);

  type Pedido =
    | { _kind: 'venda'; id: string; date: string; data: Venda }
    | { _kind: 'os'; id: string; date: string; data: OS };

  const pedidos: Pedido[] = useMemo(() => {
    const v: Pedido[] = vendas.map(v => ({ _kind: 'venda' as const, id: `v-${v.id}`, date: v.createdAt, data: v }));
    const o: Pedido[] = os.map(o => ({ _kind: 'os' as const, id: `os-${o.id}`, date: o.createdAt, data: o }));
    return [...v, ...o].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vendas, os]);

  const filtered = pedidos.filter(p => {
    const s = search.toLowerCase();
    const nome = p._kind === 'venda' ? p.data.cliente.nome : p.data.cliente.nome;
    const matchSearch = !search || nome.toLowerCase().includes(s) || String(p.data.id).includes(s);
    const matchFilter =
      filter === 'todos' ? true :
      filter === 'vendas' ? p._kind === 'venda' :
      filter === 'os' ? p._kind === 'os' :
      (p._kind === 'venda' ? !p.data.confirmadaFinanceiro : !p.data.confirmadaFinanceiro);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar cliente ou nº..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <div className="flex gap-1">
          {([['todos', 'Todos'], ['vendas', 'Vendas'], ['os', 'OS'], ['pendentes', 'Pendentes']] as [string, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${filter === k ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">Nenhum pedido encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const isOpen = expanded === p.id;
            if (p._kind === 'venda') {
              const v = p.data;
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors" onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <div className="w-8 h-8 rounded-lg bg-orange-900/30 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">{v.cliente.nome}</span>
                        <StatusBadge value={v.tipo === 'VENDA' ? 'VENDA' : 'ORCAMENTO'} type="venda" />
                        <StatusBadge value={v.confirmadaFinanceiro ? 'PAGO' : 'PENDENTE'} type="venda" />
                      </div>
                      <p className="text-xs text-zinc-500">{fmtDateTime(v.createdAt)} · Vendedor: {v.vendedor.nome}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold text-sm ${v.confirmadaFinanceiro ? 'text-green-400' : 'text-zinc-300'}`}>{fmtCurrency(Number(v.valorTotal))}</p>
                      <p className="text-xs text-zinc-600">{isOpen ? '▲' : '▼'}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-800 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            <th className="text-left py-1.5">Produto</th>
                            <th className="text-right py-1.5">Qtd</th>
                            <th className="text-right py-1.5">Vlr. Unit.</th>
                            <th className="text-right py-1.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.itens.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 last:border-0">
                              <td className="py-1.5 text-zinc-300">{item.produto?.nome || '—'}</td>
                              <td className="py-1.5 text-right text-zinc-400">{item.quantidade}</td>
                              <td className="py-1.5 text-right text-zinc-400">{fmtCurrency(Number(item.precoUnitario))}</td>
                              <td className="py-1.5 text-right text-zinc-200">{fmtCurrency(item.quantidade * Number(item.precoUnitario))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            } else {
              const o = p.data;
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors" onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">{o.cliente.nome}</span>
                        <span className="text-xs text-zinc-500">OS</span>
                        <StatusBadge value={o.status} type="os" />
                        <StatusBadge value={o.confirmadaFinanceiro ? 'PAGO' : 'PENDENTE'} type="os" />
                      </div>
                      <p className="text-xs text-zinc-500">{fmtDateTime(o.createdAt)}{o.tecnico ? ` · Técnico: ${o.tecnico}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold text-sm ${o.confirmadaFinanceiro ? 'text-green-400' : 'text-zinc-300'}`}>{fmtCurrency(Number(o.valorTotal))}</p>
                      <p className="text-xs text-zinc-600">{isOpen ? '▲' : '▼'}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-800 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            <th className="text-left py-1.5">Item</th>
                            <th className="text-right py-1.5">Qtd</th>
                            <th className="text-right py-1.5">Vlr. Unit.</th>
                            <th className="text-right py-1.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.itens.map((item, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 last:border-0">
                              <td className="py-1.5 text-zinc-300">{item.produto?.nome || item.servico?.nome || '—'}</td>
                              <td className="py-1.5 text-right text-zinc-400">{item.quantidade}</td>
                              <td className="py-1.5 text-right text-zinc-400">{fmtCurrency(Number(item.precoUnitario))}</td>
                              <td className="py-1.5 text-right text-zinc-200">{fmtCurrency(item.quantidade * Number(item.precoUnitario))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

function TabMovimentacao({ logs }: { logs: LogEstoque[] }) {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const tipos = [...new Set(logs.map(l => l.tipo))];

  const filtered = logs.filter(log => {
    const s = search.toLowerCase();
    const matchSearch = !search || log.produto.nome.toLowerCase().includes(s) || log.usuario.nome.toLowerCase().includes(s) || log.origem.toLowerCase().includes(s);
    const matchTipo = !tipoFilter || log.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const tipoColors: Record<string, string> = {
    ENTRADA: 'text-green-400',
    SAIDA: 'text-red-400',
    VENDA: 'text-orange-400',
    AJUSTE: 'text-blue-400',
    TRANSFERENCIA: 'text-purple-400',
    DEVOLUCAO: 'text-yellow-400',
  };
  const tipoBg: Record<string, string> = {
    ENTRADA: 'bg-green-900/40',
    SAIDA: 'bg-red-900/40',
    VENDA: 'bg-orange-900/40',
    AJUSTE: 'bg-blue-900/40',
    TRANSFERENCIA: 'bg-purple-900/40',
    DEVOLUCAO: 'bg-yellow-900/40',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar produto, usuário, origem..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
        >
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Data</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Produto</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Origem</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Qtd</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Ant.</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Novo</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-zinc-500">Nenhuma movimentação encontrada.</td></tr>
            )}
            {filtered.map(log => (
              <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipoBg[log.tipo] || 'bg-zinc-700'} ${tipoColors[log.tipo] || 'text-zinc-300'}`}>
                    {log.tipo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-zinc-200 text-sm">{log.produto.nome}</p>
                  <p className="text-xs text-zinc-500">{log.produto.tipo}</p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {log.origem}{log.origemId ? ` #${log.origemId}` : ''}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${log.quantidade > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {log.quantidade > 0 ? `+${log.quantidade}` : log.quantidade}
                </td>
                <td className="px-4 py-3 text-right text-zinc-500">{log.quantidadeAnterior}</td>
                <td className="px-4 py-3 text-right text-zinc-200 font-medium">{log.quantidadeNova}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">{log.usuario.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabAlertas({ alertas, itens }: { alertas: ItemEstoque[]; itens: ItemEstoque[] }) {
  const zerados = itens.filter(i => i.quantidade === 0);
  const baixos = alertas.filter(i => i.quantidade > 0);

  return (
    <div className="space-y-6">
      {zerados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <h3 className="text-sm font-semibold text-red-400">Sem Estoque ({zerados.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zerados.map(item => (
              <div key={item.id} className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
                <p className="font-medium text-zinc-200 text-sm">{item.produto.nome}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.produto.tipo}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-red-400">0</span>
                  <span className="text-xs text-zinc-500">mín: {item.estoqueMinimo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {baixos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <h3 className="text-sm font-semibold text-yellow-400">Estoque Baixo ({baixos.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {baixos.map(item => (
              <div key={item.id} className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-4">
                <p className="font-medium text-zinc-200 text-sm">{item.produto.nome}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.produto.tipo}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-yellow-400">{item.quantidade}</span>
                  <span className="text-xs text-zinc-500">mín: {item.estoqueMinimo}</span>
                </div>
                <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${Math.min(100, (item.quantidade / item.estoqueMinimo) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {zerados.length === 0 && baixos.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-zinc-400 font-medium">Estoque saudável</p>
          <p className="text-zinc-600 text-sm mt-1">Todos os itens estão acima do mínimo.</p>
        </div>
      )}
    </div>
  );
}

function LojaDetalheView({
  lojaResumo,
  grupoNome,
  onBackToGrupo,
  onBackToGrupos,
  showGrupos,
}: {
  lojaResumo: LojaResumo;
  grupoNome: string;
  onBackToGrupo: () => void;
  onBackToGrupos: () => void;
  showGrupos: boolean;
}) {
  const [tab, setTab] = useState<TabKey>('resumo');
  const [det, setDet] = useState<LojaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<LojaDetalhes>(`/estoque/loja/${lojaResumo.id}/detalhes`)
      .then(setDet)
      .catch(() => setError('Erro ao carregar detalhes da loja.'))
      .finally(() => setLoading(false));
  }, [lojaResumo.id]);

  const breadcrumbs = showGrupos
    ? [
        { label: 'Estoque', onClick: onBackToGrupos },
        { label: grupoNome, onClick: onBackToGrupo },
        { label: lojaResumo.nomeFantasia }
      ]
    : [
        { label: 'Estoque', onClick: onBackToGrupo },
        { label: lojaResumo.nomeFantasia }
      ];

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{lojaResumo.nomeFantasia}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{grupoNome} · {lojaResumo.endereco || 'Endereço não cadastrado'}</p>
        </div>
        {lojaResumo.totalAlertas > 0 && (
          <button
            onClick={() => setTab('alertas')}
            className="flex items-center gap-1.5 bg-red-900/40 text-red-400 border border-red-900/60 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-900/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {lojaResumo.totalAlertas} alerta{lojaResumo.totalAlertas !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="border-b border-zinc-800 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
              {t.key === 'alertas' && lojaResumo.totalAlertas > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{lojaResumo.totalAlertas}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-zinc-500">Carregando...</div>
      )}
      {error && (
        <div className="text-center py-16 text-red-400">{error}</div>
      )}
      {det && !loading && (
        <>
          {tab === 'resumo' && <TabResumo det={det} />}
          {tab === 'estoque' && <TabEstoque itens={det.itens} />}
          {tab === 'pedidos' && <TabPedidos vendas={det.vendas} os={det.os} />}
          {tab === 'movimentacao' && <TabMovimentacao logs={det.logs} />}
          {tab === 'alertas' && <TabAlertas alertas={det.alertas} itens={det.itens} />}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type View = 'grupos' | 'lojas' | 'loja';

export function Estoque() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<View>('grupos');
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoResumo | null>(null);
  const [selectedLoja, setSelectedLoja] = useState<LojaResumo | null>(null);

  const isAdmin = user?.role === 'ADMIN_GERAL';
  const isDono = user?.role === 'DONO_LOJA';
  const isGerente = user?.role === 'GERENTE_LOJA' || user?.role === 'VENDEDOR';

  useEffect(() => {
    setLoading(true);
    api.get<GrupoResumo[]>('/estoque/grupo-resumo')
      .then(data => {
        setGrupos(data);
        // Determine initial view based on role
        if (isGerente && data.length > 0 && data[0].lojas.length > 0) {
          // find loja by user.lojaId
          for (const g of data) {
            const found = g.lojas.find(l => l.id === user?.lojaId);
            if (found) {
              setSelectedGrupo(g);
              setSelectedLoja(found);
              setView('loja');
              return;
            }
          }
        } else if (isDono && data.length === 1) {
          setSelectedGrupo(data[0]);
          setView('lojas');
        }
      })
      .catch(() => setError('Erro ao carregar dados de estoque.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Carregando estoque...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (view === 'loja' && selectedLoja && selectedGrupo) {
    return (
      <LojaDetalheView
        lojaResumo={selectedLoja}
        grupoNome={selectedGrupo.nome}
        onBackToGrupo={() => {
          setSelectedLoja(null);
          setView('lojas');
        }}
        onBackToGrupos={() => {
          setSelectedLoja(null);
          setSelectedGrupo(null);
          setView('grupos');
        }}
        showGrupos={isAdmin || grupos.length > 1}
      />
    );
  }

  if (view === 'lojas' && selectedGrupo) {
    return (
      <LojasView
        grupo={selectedGrupo}
        onSelectLoja={loja => {
          setSelectedLoja(loja);
          setView('loja');
        }}
        onBack={isAdmin || grupos.length > 1 ? () => {
          setSelectedGrupo(null);
          setView('grupos');
        } : undefined}
      />
    );
  }

  return (
    <GruposView
      grupos={grupos}
      onSelectGrupo={grupo => {
        setSelectedGrupo(grupo);
        setView('lojas');
      }}
    />
  );
}
