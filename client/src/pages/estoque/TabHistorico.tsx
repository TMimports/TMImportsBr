import { useEffect, useState, useMemo, Fragment } from 'react';
import { api } from '../../services/api';

interface Loja { id: number; nomeFantasia: string; }

interface LogItem {
  id: number;
  tipo: string;
  origem: string;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  createdAt: string;
  produto: { nome: string; tipo: string; codigo: string; };
  loja:    { id: number; nomeFantasia: string | null; };
  usuario: { id: number; nome: string; };
}

// ── Helpers de classificação ──────────────────────────────────────────────────
function parseTipoDisplay(origem: string, tipo: string): { label: string; cls: string; icon: string } {
  if (origem.startsWith('SAIDA_AVULSA')) {
    const hasAjuste = origem.includes('[AJUSTE]');
    return hasAjuste
      ? { label: 'Ajuste',         cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚙️' }
      : { label: 'Saída Avulsa',   cls: 'bg-red-500/20 text-red-400 border-red-500/30',          icon: '📤' };
  }
  if (origem === 'ENTRADA_AVULSA')        return { label: 'Entrada Avulsa',    cls: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: '📦' };
  if (origem === 'IMPORTACAO_ESTOQUE')    return { label: 'Importação',         cls: 'bg-teal-500/20 text-teal-400 border-teal-500/30',      icon: '📊' };
  if (origem === 'VENDA')                 return { label: 'Venda',              cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',      icon: '💰' };
  if (origem === 'TRANSFERENCIA_SAIDA')   return { label: 'Transferência ↑',    cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🔄' };
  if (origem === 'TRANSFERENCIA_ENTRADA') return { label: 'Transferência ↓',    cls: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: '🔄' };
  if (tipo === 'ENTRADA')                 return { label: 'Entrada',            cls: 'bg-green-500/20 text-green-400 border-green-500/30',   icon: '📦' };
  if (tipo === 'SAIDA')                   return { label: 'Saída',              cls: 'bg-red-500/20 text-red-400 border-red-500/30',         icon: '📤' };
  return { label: tipo, cls: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30', icon: '○' };
}

function parseMotivoObs(origem: string): { motivo: string; obs: string } {
  if (!origem.startsWith('SAIDA_AVULSA')) return { motivo: '', obs: '' };
  const rest = origem.replace(/^SAIDA_AVULSA\s*\|\s*/, '').replace('[AJUSTE] ', '');
  const [motivo, obs = ''] = rest.split(' — ');
  return { motivo: motivo.trim(), obs: obs.trim() };
}

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
const sel = inp + ' cursor-pointer';

export function TabHistorico({ lojas }: { lojas: Loja[] }) {
  const [logs, setLogs]         = useState<LogItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filtroDias, setFiltroDias] = useState('30');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [buscaLivre, setBuscaLivre] = useState('');
  const [buscaChassi, setBuscaChassi] = useState('');
  const [expandido, setExpandido] = useState<number | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroDias) params.set('dias', filtroDias);
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroLoja) params.set('lojaId', filtroLoja);
    api.get<LogItem[]>(`/estoque/historico?${params}`)
      .then(d => setLogs(d || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filtroDias, filtroTipo, filtroLoja]);

  const logsFilt = useMemo(() => {
    let items = logs;
    if (buscaChassi.trim()) {
      const q = buscaChassi.toLowerCase().trim();
      return items.filter(l => l.origem.toLowerCase().includes(q) || l.produto.nome.toLowerCase().includes(q));
    }
    if (!buscaLivre.trim()) return items;
    const q = buscaLivre.toLowerCase();
    return items.filter(l =>
      l.produto.nome.toLowerCase().includes(q) ||
      l.produto.codigo.toLowerCase().includes(q) ||
      (l.loja.nomeFantasia || '').toLowerCase().includes(q) ||
      l.usuario.nome.toLowerCase().includes(q) ||
      l.origem.toLowerCase().includes(q)
    );
  }, [logs, buscaLivre, buscaChassi]);

  const totais = useMemo(() => ({
    entradas:       logsFilt.filter(l => l.tipo === 'ENTRADA').length,
    saidas:         logsFilt.filter(l => l.tipo === 'SAIDA').length,
    transferencias: logsFilt.filter(l => l.origem.startsWith('TRANSFERENCIA')).length,
  }), [logsFilt]);

  return (
    <div className="space-y-4">

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={buscaLivre}
            onChange={e => { setBuscaLivre(e.target.value); setBuscaChassi(''); }}
            placeholder="Buscar por produto, loja, usuário, origem..."
            className={inp + ' flex-1 min-w-48 text-sm'}
          />
          <input
            value={buscaChassi}
            onChange={e => { setBuscaChassi(e.target.value); setBuscaLivre(''); }}
            placeholder="🔍 Chassi..."
            className={inp + ' w-36 font-mono text-sm'}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtroDias} onChange={e => setFiltroDias(e.target.value)} className={sel + ' text-sm'}>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 6 meses</option>
            <option value="">Todo o período</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={sel + ' text-sm'}>
            <option value="">Todos os tipos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </select>
          <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className={sel + ' text-sm flex-1 min-w-36'}>
            <option value="">Todas as lojas</option>
            {lojas.map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
          </select>
          <button onClick={load} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      {logsFilt.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-2xl font-bold text-green-400">{totais.entradas}</span>
            <span className="text-xs text-zinc-400">Entradas</span>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-2xl font-bold text-red-400">{totais.saidas}</span>
            <span className="text-xs text-zinc-400">Saídas</span>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-2xl font-bold text-purple-400">{totais.transferencias}</span>
            <span className="text-xs text-zinc-400">Transferências</span>
          </div>
        </div>
      )}

      {loading && <div className="py-12 text-center text-zinc-400 text-sm">Carregando histórico...</div>}

      {/* ── Tabela ────────────────────────────────────────────────────────────── */}
      {!loading && (
        logsFilt.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            <p>Nenhuma movimentação encontrada</p>
            {(buscaLivre || buscaChassi || filtroTipo || filtroLoja) && (
              <button onClick={() => { setBuscaLivre(''); setBuscaChassi(''); setFiltroTipo(''); setFiltroLoja(''); }} className="text-xs text-orange-400 hover:text-orange-300 mt-2 underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30 text-zinc-400 text-xs">
                  <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-3 py-2.5 font-medium">Operação</th>
                  <th className="text-left px-3 py-2.5 font-medium">Produto</th>
                  <th className="text-left px-3 py-2.5 font-medium">Loja</th>
                  <th className="text-right px-3 py-2.5 font-medium">Qtd</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Saldo</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Usuário</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logsFilt.map(l => {
                  const disp    = parseTipoDisplay(l.origem, l.tipo);
                  const { motivo, obs } = parseMotivoObs(l.origem);
                  const delta   = l.tipo === 'ENTRADA' ? `+${l.quantidade}` : `-${l.quantidade}`;
                  const deltaCls = l.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400';
                  const isExpanded = expandido === l.id;

                  return (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => setExpandido(isExpanded ? null : l.id)}
                        className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                          {fmtDateTime(l.createdAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${disp.cls}`}>
                            {disp.icon} {disp.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-white text-sm font-medium">{l.produto.nome}</p>
                          <p className="text-zinc-600 text-xs font-mono">{l.produto.codigo}</p>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-300 text-xs">{l.loja.nomeFantasia || '—'}</td>
                        <td className={`px-3 py-2.5 text-right font-bold text-sm ${deltaCls}`}>{delta}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-500 text-xs hidden sm:table-cell">{l.quantidadeNova}</td>
                        <td className="px-3 py-2.5 text-zinc-400 text-xs hidden md:table-cell">{l.usuario.nome}</td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          {motivo && (
                            <span className="text-xs text-zinc-500 italic truncate max-w-[180px] block" title={obs || motivo}>
                              {motivo}
                            </span>
                          )}
                          {!motivo && l.origem !== 'VENDA' && !l.origem.startsWith('TRANSFERENCIA') && (
                            <span className="text-xs text-zinc-700 italic">{l.origem}</span>
                          )}
                          <span className="text-zinc-700 text-xs group-hover:text-zinc-500 transition-colors ml-1">
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>
                      </tr>

                      {/* Linha expandida */}
                      {isExpanded && (
                        <tr key={`${l.id}-exp`} className="border-b border-zinc-800/40 bg-zinc-800/10">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Tipo</p>
                                <p className="text-zinc-200">{l.produto.tipo}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Saldo anterior</p>
                                <p className="text-zinc-200">{l.quantidadeAnterior} → {l.quantidadeNova}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Usuário responsável</p>
                                <p className="text-zinc-200">{l.usuario.nome}</p>
                              </div>
                              {motivo && (
                                <div>
                                  <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Motivo</p>
                                  <p className="text-zinc-200">{motivo}</p>
                                </div>
                              )}
                              {obs && (
                                <div className="col-span-2">
                                  <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Observação</p>
                                  <p className="text-zinc-300">{obs}</p>
                                </div>
                              )}
                              <div className="col-span-2 sm:col-span-4">
                                <p className="text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Origem técnica</p>
                                <p className="text-zinc-600 font-mono">{l.origem}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-zinc-700 mt-1.5 px-1">{logsFilt.length} registro(s) · clique em uma linha para expandir detalhes</p>
          </div>
        )
      )}
    </div>
  );
}
