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

interface Loja { id: number; nomeFantasia: string; razaoSocial: string; cnpj: string; endereco?: string | null; }

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

interface Transferencia {
  id: number;
  status: 'SOLICITADA' | 'APROVADA' | 'REJEITADA' | 'CONCLUIDA';
  quantidade: number;
  createdAt: string;
  lojaOrigem: { id: number; nomeFantasia: string; };
  lojaDestino: { id: number; nomeFantasia: string; };
  produto: { id: number; nome: string; tipo: string; };
  solicitadoPorUser: { id: number; nome: string; };
  aprovadoPorUser?: { id: number; nome: string; } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const STATUS_UNIDADE: Record<string, string> = {
  ESTOQUE: 'bg-green-500/20 text-green-400',
  VENDIDA: 'bg-zinc-500/20 text-zinc-400',
  RESERVADA: 'bg-yellow-500/20 text-yellow-400',
  TRANSFERIDA: 'bg-blue-500/20 text-blue-400',
};
const STATUS_TRANSFERENCIA: Record<string, { label: string; cls: string }> = {
  SOLICITADA: { label: 'Aguardando', cls: 'bg-yellow-500/20 text-yellow-400' },
  APROVADA:   { label: 'Aprovada',   cls: 'bg-green-500/20 text-green-400' },
  REJEITADA:  { label: 'Rejeitada',  cls: 'bg-red-500/20 text-red-400' },
  CONCLUIDA:  { label: 'Concluída',  cls: 'bg-blue-500/20 text-blue-400' },
};

const LOJA_IMPORTACAO_ID = 4;

// ─── KpiBlock ─────────────────────────────────────────────────────────────────

function KpiBlock({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </Card>
  );
}

// ─── Modal de Solicitação de Transferência ────────────────────────────────────

function ModalSolicitacao({
  unidade, lojaOrigemId, lojaDestinoId, lojaOrigemNome, lojaDestinoNome, onClose, onSuccess
}: {
  unidade: ItemUnitario;
  lojaOrigemId: number;
  lojaDestinoId: number;
  lojaOrigemNome: string;
  lojaDestinoNome: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function solicitar() {
    setLoading(true);
    setErro('');
    try {
      await api.post('/transferencias', {
        produtoId: unidade.produtoId,
        lojaOrigemId,
        lojaDestinoId,
        quantidade: 1,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao solicitar transferência');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4">Solicitar Transferência</h2>

        <div className="space-y-3 mb-6 text-sm">
          <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
            <p className="text-zinc-400">Modelo</p>
            <p className="text-white font-medium">{unidade.modeloNome}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 space-y-2">
            <p className="text-zinc-400">Chassi</p>
            <p className="text-white font-mono text-xs">{unidade.chassi}</p>
          </div>
          {unidade.cor && (
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-zinc-400">Cor</p>
              <p className="text-white">{unidade.cor}</p>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 bg-zinc-900 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">De</p>
              <p className="text-orange-400 font-medium">{lojaOrigemNome}</p>
            </div>
            <div className="flex items-center text-zinc-500">→</div>
            <div className="flex-1 bg-zinc-900 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">Para</p>
              <p className="text-green-400 font-medium">{lojaDestinoNome}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          A solicitação ficará pendente até ser aprovada ou rejeitada pelo Financeiro.
        </p>

        {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button variant="primary" onClick={solicitar} disabled={loading} className="flex-1">
            {loading ? 'Enviando...' : 'Confirmar Solicitação'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── TabGerencial ─────────────────────────────────────────────────────────────

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

// ─── TabUnitaria ──────────────────────────────────────────────────────────────

function TabUnitaria({
  itens, busca, onSolicitar
}: {
  itens: ItemUnitario[];
  busca: string;
  onSolicitar?: (u: ItemUnitario) => void;
}) {
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return q ? itens.filter(i =>
      i.modeloNome.toLowerCase().includes(q) || i.chassi.toLowerCase().includes(q) ||
      (i.cor?.toLowerCase().includes(q)) || (i.codigoMotor?.toLowerCase().includes(q))
    ) : itens;
  }, [itens, busca]);

  const disponíveis = filtrados.filter(u => u.status === 'ESTOQUE');
  const lista = onSolicitar ? disponíveis : filtrados;

  return (
    <div className="overflow-x-auto">
      {onSolicitar && disponíveis.length === 0 && (
        <div className="text-center py-12 text-zinc-500">Nenhuma unidade disponível nesta loja</div>
      )}
      {lista.length === 0 && !onSolicitar && (
        <div className="text-center py-12 text-zinc-500">Nenhuma unidade encontrada</div>
      )}
      {lista.length > 0 && (
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
              {onSolicitar && <th className="text-center p-3 font-medium">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map(u => (
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
                {onSolicitar && (
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSolicitar(u)}
                      className="text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 px-3 py-1 rounded-lg font-medium transition-colors"
                    >
                      Solicitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── TabMovimentacao ──────────────────────────────────────────────────────────

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

// ─── TabSolicitacoes ──────────────────────────────────────────────────────────

function TabSolicitacoes({
  isAprovador, lojaId: _lojaId, refreshKey
}: {
  isAprovador: boolean;
  lojaId: number | null;
  refreshKey: number;
}) {
  const [items, setItems] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<Transferencia[]>('/transferencias')
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function aprovar(id: number) {
    setAcao(id);
    try {
      await api.put(`/transferencias/${id}/aprovar`, {});
      setItems(prev => prev.map(t => t.id === id ? { ...t, status: 'APROVADA' } : t));
    } catch {}
    setAcao(null);
  }

  async function rejeitar(id: number) {
    setAcao(id);
    try {
      await api.put(`/transferencias/${id}/rejeitar`, {});
      setItems(prev => prev.map(t => t.id === id ? { ...t, status: 'REJEITADA' } : t));
    } catch {}
    setAcao(null);
  }

  if (loading) return <div className="py-10 text-center text-zinc-400 text-sm">Carregando solicitações...</div>;
  if (!items.length) return <div className="py-10 text-center text-zinc-500 text-sm">Nenhuma solicitação de transferência</div>;

  const pendentes = items.filter(t => t.status === 'SOLICITADA');
  const historico = items.filter(t => t.status !== 'SOLICITADA');

  return (
    <div className="space-y-6">
      {isAprovador && pendentes.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            ⏳ Aguardando Aprovação ({pendentes.length})
          </p>
          <div className="space-y-2">
            {pendentes.map(t => (
              <div key={t.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{t.produto?.nome}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    De: <span className="text-orange-400">{t.lojaOrigem?.nomeFantasia}</span>
                    {' → '}
                    Para: <span className="text-green-400">{t.lojaDestino?.nomeFantasia}</span>
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Solicitado por: {t.solicitadoPorUser?.nome} — {fmtDate(t.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => rejeitar(t.id)}
                    disabled={acao === t.id}
                    className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => aprovar(t.id)}
                    disabled={acao === t.id}
                    className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAprovador && pendentes.length === 0 && historico.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">Nenhuma solicitação feita ainda</div>
      )}

      {historico.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-zinc-400 mb-3">Histórico</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                  <th className="text-left p-3">Produto</th>
                  <th className="text-left p-3">Origem</th>
                  <th className="text-left p-3">Destino</th>
                  <th className="text-left p-3">Solicitado por</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {historico.map(t => {
                  const st = STATUS_TRANSFERENCIA[t.status] || { label: t.status, cls: '' };
                  return (
                    <tr key={t.id} className="border-b border-[#27272a] hover:bg-zinc-800/20">
                      <td className="p-3 text-white">{t.produto?.nome}</td>
                      <td className="p-3 text-zinc-300 text-xs">{t.lojaOrigem?.nomeFantasia}</td>
                      <td className="p-3 text-zinc-300 text-xs">{t.lojaDestino?.nomeFantasia}</td>
                      <td className="p-3 text-zinc-400 text-xs">{t.solicitadoPorUser?.nome}</td>
                      <td className="p-3 text-zinc-400 text-xs">{fmtDate(t.createdAt)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── View Consolidada (Admin) ─────────────────────────────────────────────────

function ViewConsolidada({ onSelectEmpresa }: { onSelectEmpresa: (lojaId: number) => void; }) {
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

// ─── View por Empresa ─────────────────────────────────────────────────────────

type EmpresaTab = 'gerencial' | 'unitaria' | 'movimentacao' | 'solicitacoes';

function ViewEmpresa({
  lojaId, minhaLojaId, isAprovador, onBack, refreshSolicitacoes, onSolicitacaoFeita
}: {
  lojaId: number;
  minhaLojaId: number | null;
  isAprovador: boolean;
  onBack?: () => void;
  refreshSolicitacoes: number;
  onSolicitacaoFeita: () => void;
}) {
  const [data, setData] = useState<EmpresaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<EmpresaTab>('gerencial');
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [modalUnidade, setModalUnidade] = useState<ItemUnitario | null>(null);

  const isOutraLoja = minhaLojaId !== null && lojaId !== minhaLojaId;

  useEffect(() => {
    setLoading(true);
    setAba('gerencial');
    setBusca('');
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

  const TABS: { id: EmpresaTab; label: string; count?: number; highlight?: boolean }[] = [
    { id: 'gerencial', label: 'Gerencial', count: gerencialFiltrado.length },
    { id: 'unitaria', label: isOutraLoja ? 'Unidades Disponíveis' : 'Unitária (Chassi)', count: data.unitaria.filter(u => isOutraLoja ? u.status === 'ESTOQUE' : true).length },
    { id: 'movimentacao', label: 'Movimentação', count: data.logsRecentes.length },
    { id: 'solicitacoes', label: isAprovador ? 'Solicitações' : 'Minhas Solicitações', highlight: isAprovador },
  ];

  return (
    <div className="space-y-6">
      {modalUnidade && minhaLojaId && (
        <ModalSolicitacao
          unidade={modalUnidade}
          lojaOrigemId={lojaId}
          lojaDestinoId={minhaLojaId}
          lojaOrigemNome={e.nomeFantasia}
          lojaDestinoNome="Minha Loja"
          onClose={() => setModalUnidade(null)}
          onSuccess={onSolicitacaoFeita}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        {onBack && (
          <button onClick={onBack} className="mt-1 text-zinc-400 hover:text-white transition-colors text-sm">
            ← Voltar
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white">{e.nomeFantasia}</h2>
            {lojaId === LOJA_IMPORTACAO_ID && (
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                🏭 Estoque Central
              </span>
            )}
            {isOutraLoja && lojaId !== LOJA_IMPORTACAO_ID && (
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                📍 Outra Loja
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400">{e.razaoSocial} — <span className="font-mono">{e.cnpj}</span></p>
          <p className="text-xs text-zinc-500 mt-0.5">Grupo: {e.grupoNome}</p>
        </div>
        {t.alertasBaixoEstoque > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm">
            ⚠ {t.alertasBaixoEstoque} alerta{t.alertasBaixoEstoque > 1 ? 's' : ''} de estoque baixo
          </div>
        )}
      </div>

      {/* Aviso de outra loja */}
      {isOutraLoja && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-sm">
          <p className="text-orange-400 font-medium mb-1">
            {lojaId === LOJA_IMPORTACAO_ID ? '🏭 Estoque Central (TM Importação)' : '📍 Consultando estoque de outra loja'}
          </p>
          <p className="text-zinc-400">
            Você pode solicitar a transferência de unidades disponíveis para sua loja.
            A solicitação será analisada pelo Financeiro.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiBlock label="Motos" value={t.totalMotos} color="text-orange-400" />
        <KpiBlock label="Peças" value={t.totalPecas} color="text-blue-400" />
        <KpiBlock label="Custo Total (CM)" value={fmtBRL(t.valorTotalCusto)} color="text-zinc-200" />
        <KpiBlock label="Valor Venda" value={fmtBRL(t.valorTotalVenda)} color="text-green-400"
          sub={`Margem: ${t.valorTotalCusto > 0 ? ((t.valorTotalVenda / t.valorTotalCusto - 1) * 100).toFixed(1) + '%' : '—'}`} />
        <KpiBlock label="Unidades" value={t.unidadesTotal}
          sub={`${t.unidadesEmEstoque} em estoque · ${t.unidadesVendidas} vendidas`} />
        <KpiBlock label="Sem Giro" value={t.semGiro} color={t.semGiro > 0 ? 'text-red-400' : 'text-zinc-400'} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#27272a] overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setAba(tab.id); setBusca(''); }}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              aba === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}>
            {tab.label}
            {tab.highlight && (
              <span className="ml-1.5 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">!</span>
            )}
            {tab.count !== undefined && (
              <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {aba !== 'movimentacao' && aba !== 'solicitacoes' && (
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
      )}

      {/* Conteúdo */}
      <Card>
        {aba === 'gerencial' && <TabGerencial itens={gerencialFiltrado} busca={busca} />}
        {aba === 'unitaria' && (
          <TabUnitaria
            itens={data.unitaria}
            busca={busca}
            onSolicitar={isOutraLoja ? (u) => setModalUnidade(u) : undefined}
          />
        )}
        {aba === 'movimentacao' && <TabMovimentacao logs={data.logsRecentes} />}
        {aba === 'solicitacoes' && (
          <TabSolicitacoes
            isAprovador={isAprovador}
            lojaId={lojaId}
            refreshKey={refreshSolicitacoes}
          />
        )}
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// Ordem de proximidade por bairro para Rio de Janeiro (simplificada)
// Quanto menor o índice, mais central/próximo da TM Importação
const LOJA_ORDER: Record<number, number> = {
  4: 0,   // TM Importação — sempre primeiro
  1: 1,   // Centro
  8: 2,   // Copacabana
  7: 3,   // Botafogo
  6: 4,   // Barra
  2: 5,   // Recreio
  9: 6,   // Vila Isabel
  11: 7,  // Bangu
  5: 8,   // Campo Grande
  12: 9,  // Paciência
  10: 10, // Nilopólis
  3: 11,  // Itaipuaçu
};

export function Estoque() {
  const { user } = useAuth();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [loadingLojas, setLoadingLojas] = useState(true);
  const [refreshSolicitacoes, setRefreshSolicitacoes] = useState(0);

  const role = user?.role || '';
  const isAdmin = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(role);
  const isAprovador = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(role);
  const minhaLojaId = user?.lojaId ?? null;
  const showConsolidado = isAdmin && lojaId === null;

  useEffect(() => {
    api.get<Loja[]>('/lojas')
      .then(lista => {
        setLojas(lista);
        if (user?.lojaId) {
          setLojaId(user.lojaId);
        } else if (!isAdmin && lista.length > 0) {
          setLojaId(lista[0].id);
        }
      })
      .catch(() => setLojas([]))
      .finally(() => setLoadingLojas(false));
  }, []);

  const lojasSorted = useMemo(() => {
    if (!lojas.length) return [];
    // Para não-admin: mostra a loja do usuário primeiro, depois Importação, depois as outras
    if (!isAdmin && minhaLojaId) {
      const minhaLoja = lojas.find(l => l.id === minhaLojaId);
      const importacao = lojas.find(l => l.id === LOJA_IMPORTACAO_ID && l.id !== minhaLojaId);
      const outras = lojas
        .filter(l => l.id !== minhaLojaId && l.id !== LOJA_IMPORTACAO_ID)
        .sort((a, b) => (LOJA_ORDER[a.id] ?? 99) - (LOJA_ORDER[b.id] ?? 99));
      return [
        ...(minhaLoja ? [minhaLoja] : []),
        ...(importacao ? [importacao] : []),
        ...outras,
      ];
    }
    return [...lojas].sort((a, b) => (LOJA_ORDER[a.id] ?? 99) - (LOJA_ORDER[b.id] ?? 99));
  }, [lojas, isAdmin, minhaLojaId]);

  if (loadingLojas) return <div className="p-12 text-center text-zinc-400">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <SectionHeader
          title="Estoque"
          subtitle={
            showConsolidado
              ? 'Visão consolidada — todas as empresas'
              : lojaId === minhaLojaId
                ? 'Estoque da sua loja'
                : lojaId === LOJA_IMPORTACAO_ID
                  ? 'Estoque Central — TM Importação'
                  : 'Consultando outra loja'
          }
        />

        {/* Seletor de empresa */}
        <div className="min-w-72">
          <Select
            value={lojaId ?? ''}
            onChange={e => setLojaId(e.target.value ? Number(e.target.value) : null)}
          >
            {isAdmin && <option value="">📊 Todas as Empresas (Consolidado)</option>}
            {lojasSorted.map(l => (
              <option key={l.id} value={l.id}>
                {l.id === minhaLojaId
                  ? `🏠 ${l.nomeFantasia} (Minha Loja)`
                  : l.id === LOJA_IMPORTACAO_ID
                    ? `🏭 ${l.nomeFantasia} — Estoque Central`
                    : `🏪 ${l.nomeFantasia}`
                }
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
          minhaLojaId={minhaLojaId}
          isAprovador={isAprovador}
          onBack={isAdmin ? () => setLojaId(null) : undefined}
          refreshSolicitacoes={refreshSolicitacoes}
          onSolicitacaoFeita={() => setRefreshSolicitacoes(k => k + 1)}
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
