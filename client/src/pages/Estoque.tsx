import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SectionHeader } from '../components/ui/SectionHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Loja { id: number; nomeFantasia: string; razaoSocial: string; cnpj: string; }

interface EmpresaConsolidada {
  lojaId: number; cnpj: string; razaoSocial: string; nomeFantasia: string;
  grupoId: number; grupoNome: string;
  totalMotos: number; totalPecas: number; totalItens: number;
  valorTotalCusto: number; valorTotalVenda: number; alertas: number;
  unidades: number; pedidosPendentes: number;
}
interface ConsolidadoResponse {
  totais: { totalEmpresas: number; totalMotos: number; totalPecas: number; valorTotalCusto: number; valorTotalVenda: number; totalAlertas: number; };
  empresas: EmpresaConsolidada[];
}

interface ItemGerencial {
  id: number; produtoId: number; nome: string; tipo: string; codigo: string;
  quantidade: number; estoqueMinimo: number; estoqueMaximo: number;
  custoMedio: number; precoVenda: number;
  valorTotalCusto: number; valorTotalPreco: number;
  alerta: boolean; semEstoque: boolean;
}
interface ItemUnitario {
  id: number; produtoId: number; modeloNome: string; chassi: string;
  codigoMotor?: string; cor?: string; ano?: number; status: string; createdAt: string;
}
interface LogEstoque {
  id: number; tipo: string; quantidade: number; quantidadeAnterior: number; quantidadeNova: number;
  createdAt: string; origemId?: number;
  produto?: { nome: string; tipo: string; };
  usuario?: { nome: string; };
}
interface EmpresaDetalhes {
  empresa: { id: number; cnpj: string; razaoSocial: string; nomeFantasia: string; grupoNome: string; };
  totalizadores: {
    totalMotos: number; totalPecas: number; totalItens: number;
    valorTotalCusto: number; valorTotalVenda: number;
    alertasBaixoEstoque: number; semGiro: number; pedidosPendentes: number;
    unidadesTotal: number; unidadesEmEstoque: number; unidadesVendidas: number;
  };
  gerencial: ItemGerencial[];
  unitaria: ItemUnitario[];
  logsRecentes: LogEstoque[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const TIPO_BADGE: Record<string, string> = {
  MOTO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PECA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SERVICO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};
const STATUS_UNIDADE: Record<string, string> = {
  ESTOQUE: 'bg-green-500/20 text-green-400',
  VENDIDA: 'bg-zinc-500/20 text-zinc-400',
  RESERVADA: 'bg-yellow-500/20 text-yellow-400',
  TRANSFERIDA: 'bg-blue-500/20 text-blue-400',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KpiBlock({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </Card>
  );
}

function TabGerencial({ itens, busca }: { itens: ItemGerencial[]; busca: string }) {
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return q ? itens.filter(i => i.nome.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)) : itens;
  }, [itens, busca]);

  const motos = filtrados.filter(i => i.tipo === 'MOTO');
  const pecas = filtrados.filter(i => i.tipo === 'PECA');

  function GrupoTipo({ titulo, lista }: { titulo: string; lista: ItemGerencial[] }) {
    if (!lista.length) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">{titulo}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-right p-3 font-medium">Qtd</th>
                <th className="text-right p-3 font-medium">Custo Médio</th>
                <th className="text-right p-3 font-medium">Preço Venda</th>
                <th className="text-right p-3 font-medium">Valor (CM)</th>
                <th className="text-right p-3 font-medium">Valor (PV)</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(it => (
                <tr key={it.id} className="border-b border-[#27272a] hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3">
                    <p className="text-white font-medium">{it.nome}</p>
                    <p className="text-xs text-zinc-500 font-mono">{it.codigo}</p>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-bold text-base ${it.semEstoque ? 'text-red-400' : it.alerta ? 'text-yellow-400' : 'text-green-400'}`}>
                      {it.quantidade}
                    </span>
                    <p className="text-xs text-zinc-500">mín {it.estoqueMinimo}</p>
                  </td>
                  <td className="p-3 text-right text-zinc-200">{fmtBRL(it.custoMedio)}</td>
                  <td className="p-3 text-right text-zinc-200">{fmtBRL(it.precoVenda)}</td>
                  <td className="p-3 text-right font-medium text-zinc-100">{fmtBRL(it.valorTotalCusto)}</td>
                  <td className="p-3 text-right font-medium text-orange-400">{fmtBRL(it.valorTotalPreco)}</td>
                  <td className="p-3">
                    {it.semEstoque
                      ? <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Zerado</span>
                      : it.alerta
                        ? <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">Alerta</span>
                        : <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GrupoTipo titulo="Motos & Scooters" lista={motos} />
      <GrupoTipo titulo="Peças & Acessórios" lista={pecas} />
      {filtrados.length === 0 && (
        <div className="text-center py-12 text-zinc-500">Nenhum produto encontrado</div>
      )}
    </div>
  );
}

function TabUnitaria({ itens, busca }: { itens: ItemUnitario[]; busca: string }) {
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return q ? itens.filter(i =>
      i.modeloNome.toLowerCase().includes(q) || i.chassi.toLowerCase().includes(q) ||
      (i.cor?.toLowerCase().includes(q)) || (i.codigoMotor?.toLowerCase().includes(q))
    ) : itens;
  }, [itens, busca]);

  return (
    <div className="overflow-x-auto">
      {filtrados.length === 0
        ? <div className="text-center py-12 text-zinc-500">Nenhuma unidade encontrada</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                <th className="text-left p-3 font-medium">Chassi</th>
                <th className="text-left p-3 font-medium">Modelo</th>
                <th className="text-left p-3 font-medium">Cód. Motor</th>
                <th className="text-left p-3 font-medium">Cor</th>
                <th className="text-left p-3 font-medium">Ano</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Cadastrado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => (
                <tr key={u.id} className="border-b border-[#27272a] hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-mono text-zinc-200 text-xs">{u.chassi}</td>
                  <td className="p-3 text-white">{u.modeloNome}</td>
                  <td className="p-3 font-mono text-zinc-400 text-xs">{u.codigoMotor || '—'}</td>
                  <td className="p-3 text-zinc-300">{u.cor || '—'}</td>
                  <td className="p-3 text-zinc-300">{u.ano || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_UNIDADE[u.status] || 'bg-zinc-700 text-zinc-300'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

function TabMovimentacao({ logs }: { logs: LogEstoque[] }) {
  const TIPO_COR: Record<string, string> = {
    ENTRADA: 'text-green-400', SAIDA: 'text-red-400', PEDIDO_COMPRA: 'text-blue-400',
    TRANSFERENCIA: 'text-purple-400', AJUSTE: 'text-yellow-400', VENDA: 'text-orange-400',
    OS: 'text-orange-400', DEVOLUCAO: 'text-teal-400', PERDA: 'text-red-500',
    AVARIA: 'text-red-500', RESERVA: 'text-yellow-500',
  };
  return (
    <div className="overflow-x-auto">
      {logs.length === 0
        ? <div className="text-center py-12 text-zinc-500">Sem movimentações recentes</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-right p-3 font-medium">Qtd</th>
                <th className="text-right p-3 font-medium">Anterior</th>
                <th className="text-right p-3 font-medium">Novo</th>
                <th className="text-left p-3 font-medium">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-[#27272a] hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 text-zinc-400 text-xs">{fmtDate(l.createdAt)}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium ${TIPO_COR[l.tipo] || 'text-zinc-300'}`}>{l.tipo}</span>
                  </td>
                  <td className="p-3 text-zinc-200">{l.produto?.nome || '—'}</td>
                  <td className={`p-3 text-right font-bold ${l.quantidade > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {l.quantidade > 0 ? '+' : ''}{l.quantidade}
                  </td>
                  <td className="p-3 text-right text-zinc-400">{l.quantidadeAnterior}</td>
                  <td className="p-3 text-right text-white">{l.quantidadeNova}</td>
                  <td className="p-3 text-zinc-400 text-xs">{l.usuario?.nome || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

// ─── View Consolidada (Admin) ─────────────────────────────────────────────────

function ViewConsolidada({ onSelectEmpresa }: {
  onSelectEmpresa: (lojaId: number) => void;
}) {
  const [data, setData] = useState<ConsolidadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.get<ConsolidadoResponse>('/estoque/consolidado')
      .then(d => setData(d && d.totais ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const empresas = useMemo(() => {
    if (!data) return [];
    const q = busca.toLowerCase();
    return q ? data.empresas.filter(e =>
      e.razaoSocial.toLowerCase().includes(q) || e.nomeFantasia.toLowerCase().includes(q) || e.cnpj.includes(q)
    ) : data.empresas;
  }, [data, busca]);

  if (loading) return <div className="p-12 text-center text-zinc-400">Carregando visão consolidada...</div>;
  if (!data) return <div className="p-12 text-center text-red-400">Erro ao carregar dados</div>;

  const t = data.totais;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBlock label="Empresas" value={t.totalEmpresas} color="text-white" />
        <KpiBlock label="Motos" value={t.totalMotos} color="text-orange-400" />
        <KpiBlock label="Peças" value={t.totalPecas} color="text-blue-400" />
        <KpiBlock label="Custo Total" value={fmtBRL(t.valorTotalCusto)} color="text-zinc-200" />
        <KpiBlock label="Valor Venda" value={fmtBRL(t.valorTotalVenda)} color="text-green-400" />
        <KpiBlock label="Alertas" value={t.totalAlertas} color={t.totalAlertas > 0 ? 'text-yellow-400' : 'text-zinc-400'} />
      </div>

      <Card className="p-4">
        <Input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por CNPJ, razão social ou nome fantasia..." />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                <th className="text-left p-4 font-medium">Empresa</th>
                <th className="text-left p-4 font-medium">CNPJ</th>
                <th className="text-left p-4 font-medium">Grupo</th>
                <th className="text-right p-4 font-medium">Motos</th>
                <th className="text-right p-4 font-medium">Peças</th>
                <th className="text-right p-4 font-medium">Custo Total</th>
                <th className="text-right p-4 font-medium">Valor Venda</th>
                <th className="text-right p-4 font-medium">Alertas</th>
                <th className="text-right p-4 font-medium">Ped. Pend.</th>
                <th className="text-left p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.lojaId} className="border-b border-[#27272a] hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  onClick={() => onSelectEmpresa(e.lojaId)}>
                  <td className="p-4">
                    <p className="text-white font-medium">{e.nomeFantasia}</p>
                    <p className="text-xs text-zinc-500">{e.razaoSocial}</p>
                  </td>
                  <td className="p-4 font-mono text-zinc-400 text-xs">{e.cnpj}</td>
                  <td className="p-4 text-zinc-300 text-xs">{e.grupoNome}</td>
                  <td className="p-4 text-right font-bold text-orange-400">{e.totalMotos}</td>
                  <td className="p-4 text-right font-bold text-blue-400">{e.totalPecas}</td>
                  <td className="p-4 text-right text-zinc-200">{fmtBRL(e.valorTotalCusto)}</td>
                  <td className="p-4 text-right text-green-400">{fmtBRL(e.valorTotalVenda)}</td>
                  <td className="p-4 text-right">
                    {e.alertas > 0
                      ? <span className="text-yellow-400 font-bold">{e.alertas}</span>
                      : <span className="text-zinc-500">—</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    {e.pedidosPendentes > 0
                      ? <Badge variant="info">{e.pedidosPendentes}</Badge>
                      : <span className="text-zinc-500">—</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-xs text-orange-400 hover:text-orange-300 font-medium">Ver Detalhe →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── View por Empresa (Loja selecionada) ─────────────────────────────────────

type EmpresaTab = 'gerencial' | 'unitaria' | 'movimentacao';

function ViewEmpresa({ lojaId, onBack }: { lojaId: number; onBack?: () => void; }) {
  const [data, setData] = useState<EmpresaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<EmpresaTab>('gerencial');
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<EmpresaDetalhes>(`/estoque/empresa/${lojaId}`)
      .then(d => setData(d && d.empresa ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [lojaId]);

  if (loading) return <div className="p-12 text-center text-zinc-400">Carregando estoque da empresa...</div>;
  if (!data) return <div className="p-12 text-center text-red-400">Erro ao carregar dados da empresa</div>;

  const t = data.totalizadores;
  const e = data.empresa;

  const gerencialFiltrado = tipoFiltro
    ? data.gerencial.filter(i => i.tipo === tipoFiltro)
    : data.gerencial;

  const TABS: { id: EmpresaTab; label: string; count?: number }[] = [
    { id: 'gerencial', label: 'Gerencial (por Modelo)', count: gerencialFiltrado.length },
    { id: 'unitaria', label: 'Unitária (por Chassi)', count: data.unitaria.length },
    { id: 'movimentacao', label: 'Movimentação', count: data.logsRecentes.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header da empresa */}
      <div className="flex items-start gap-4">
        {onBack && (
          <button onClick={onBack} className="mt-1 text-zinc-400 hover:text-white transition-colors">
            ← Voltar
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{e.nomeFantasia}</h2>
          <p className="text-sm text-zinc-400">{e.razaoSocial} — <span className="font-mono">{e.cnpj}</span></p>
          <p className="text-xs text-zinc-500 mt-0.5">Grupo: {e.grupoNome}</p>
        </div>
        {t.alertasBaixoEstoque > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm">
            ⚠ {t.alertasBaixoEstoque} alerta{t.alertasBaixoEstoque > 1 ? 's' : ''} de estoque baixo
          </div>
        )}
        {t.pedidosPendentes > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm">
            📦 {t.pedidosPendentes} pedido{t.pedidosPendentes > 1 ? 's' : ''} pendente{t.pedidosPendentes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiBlock label="Motos em Estoque" value={t.totalMotos} color="text-orange-400" />
        <KpiBlock label="Peças em Estoque" value={t.totalPecas} color="text-blue-400" />
        <KpiBlock label="Custo Total (CM)" value={fmtBRL(t.valorTotalCusto)} color="text-zinc-200" />
        <KpiBlock label="Valor Venda Total" value={fmtBRL(t.valorTotalVenda)} color="text-green-400"
          sub={`Margem: ${t.valorTotalCusto > 0 ? ((t.valorTotalVenda / t.valorTotalCusto - 1) * 100).toFixed(1) + '%' : '—'}`} />
        <KpiBlock label="Unidades (Total)" value={t.unidadesTotal}
          sub={`${t.unidadesEmEstoque} em estoque · ${t.unidadesVendidas} vendidas`} />
        <KpiBlock label="Sem Giro" value={t.semGiro} color={t.semGiro > 0 ? 'text-red-400' : 'text-zinc-400'} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#27272a]">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setAba(tab.id); setBusca(''); }}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aba === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}>
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filtros contextuais */}
      <div className="flex gap-3">
        <Input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder={aba === 'unitaria' ? 'Buscar por chassi, modelo, cor...' : 'Buscar produto...'}
          className="flex-1" />
        {aba === 'gerencial' && (
          <Select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className="w-36">
            <option value="">Todos</option>
            <option value="MOTO">Motos</option>
            <option value="PECA">Peças</option>
          </Select>
        )}
      </div>

      {/* Conteúdo da tab */}
      <Card>
        {aba === 'gerencial' && <TabGerencial itens={gerencialFiltrado} busca={busca} />}
        {aba === 'unitaria' && <TabUnitaria itens={data.unitaria} busca={busca} />}
        {aba === 'movimentacao' && <TabMovimentacao logs={data.logsRecentes} />}
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Estoque() {
  const { user } = useAuth();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [loadingLojas, setLoadingLojas] = useState(true);

  const role = user?.role || '';
  const isAdmin = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(role);
  // null = consolidado (só para admins); number = empresa específica
  const showConsolidado = isAdmin && lojaId === null;

  useEffect(() => {
    api.get<Loja[]>('/lojas')
      .then(lista => {
        setLojas(lista);
        // Sempre seleciona a loja do usuário ou a primeira da lista
        if (user?.lojaId) {
          setLojaId(user.lojaId);
        } else if (lista.length > 0) {
          setLojaId(lista[0].id);
        }
      })
      .catch(() => setLojas([]))
      .finally(() => setLoadingLojas(false));
  }, []);

  if (loadingLojas) return <div className="p-12 text-center text-zinc-400">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <SectionHeader
          title="Estoque"
          subtitle={showConsolidado
            ? 'Visão consolidada — todas as empresas'
            : 'Gerencial por modelo e unitária por chassi'
          }
        />

        {/* Seletor de empresa */}
        <div className="min-w-72">
          <Select
            value={lojaId ?? ''}
            onChange={e => setLojaId(e.target.value ? Number(e.target.value) : null)}
          >
            {isAdmin && <option value="">📊 Todas as Empresas (Consolidado)</option>}
            {lojas.map(l => (
              <option key={l.id} value={l.id}>
                🏪 {l.nomeFantasia}{l.cnpj ? ` — ${l.cnpj}` : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Conteúdo */}
      {showConsolidado ? (
        <ViewConsolidada onSelectEmpresa={setLojaId} />
      ) : lojaId ? (
        <ViewEmpresa
          lojaId={lojaId}
          onBack={isAdmin ? () => setLojaId(null) : undefined}
        />
      ) : (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-lg font-medium text-zinc-400">Nenhuma empresa disponível</p>
          <p className="text-sm mt-1">Cadastre lojas no sistema para ver o estoque</p>
        </div>
      )}
    </div>
  );
}
