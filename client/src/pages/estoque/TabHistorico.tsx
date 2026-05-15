import { useEffect, useState, useMemo } from 'react';
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

const TIPO_CLS: Record<string, string> = {
  ENTRADA:      'bg-green-500/20 text-green-400',
  SAIDA:        'bg-red-500/20 text-red-400',
  VENDA:        'bg-blue-500/20 text-blue-400',
  TRANSFERENCIA:'bg-purple-500/20 text-purple-400',
  AJUSTE:       'bg-yellow-500/20 text-yellow-400',
};

const TIPO_ICON: Record<string, string> = {
  ENTRADA: '📦',
  SAIDA:   '📤',
  VENDA:   '💰',
  TRANSFERENCIA: '🔄',
  AJUSTE:  '⚙️',
};

const fmtDate = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
const sel = inp + ' cursor-pointer';

function origemLabel(origem: string): string {
  if (origem.startsWith('SAIDA_AVULSA'))  return 'Saída Avulsa';
  if (origem === 'ENTRADA_AVULSA')        return 'Entrada Avulsa';
  if (origem === 'IMPORTACAO_ESTOQUE')    return 'Importação';
  if (origem === 'VENDA')                 return 'Venda';
  if (origem === 'TRANSFERENCIA_SAIDA')   return 'Transferência (saída)';
  if (origem === 'TRANSFERENCIA_ENTRADA') return 'Transferência (entrada)';
  return origem;
}

export function TabHistorico({ lojas }: { lojas: Loja[] }) {
  const [logs, setLogs]         = useState<LogItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filtroDias, setFiltroDias] = useState('30');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [busca, setBusca]       = useState('');

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
    if (!busca.trim()) return logs;
    const q = busca.toLowerCase();
    return logs.filter(l =>
      l.produto.nome.toLowerCase().includes(q) ||
      l.produto.codigo.toLowerCase().includes(q) ||
      (l.loja.nomeFantasia || '').toLowerCase().includes(q) ||
      l.usuario.nome.toLowerCase().includes(q) ||
      l.origem.toLowerCase().includes(q)
    );
  }, [logs, busca]);

  const totais = useMemo(() => {
    return {
      entradas:      logsFilt.filter(l => l.tipo === 'ENTRADA').length,
      saidas:        logsFilt.filter(l => l.tipo === 'SAIDA').length,
      vendas:        logsFilt.filter(l => l.tipo === 'VENDA').length,
      transferencias:logsFilt.filter(l => l.tipo === 'TRANSFERENCIA').length,
    };
  }, [logsFilt]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por produto, loja, usuário, origem..."
          className={inp + ' flex-1 min-w-48'}
        />
        <select value={filtroDias} onChange={e => setFiltroDias(e.target.value)} className={sel}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 180 dias</option>
          <option value="">Todos</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={sel}>
          <option value="">Todos os tipos</option>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
          <option value="VENDA">Venda</option>
          <option value="TRANSFERENCIA">Transferência</option>
        </select>
        <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className={sel}>
          <option value="">Todas as lojas</option>
          {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
        </select>
        <button onClick={load} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          🔄 Atualizar
        </button>
      </div>

      {/* KPIs rápidos */}
      {logsFilt.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Entradas',       val: totais.entradas,       cls: 'text-green-400' },
            { label: 'Saídas',         val: totais.saidas,         cls: 'text-red-400' },
            { label: 'Vendas',         val: totais.vendas,         cls: 'text-blue-400' },
            { label: 'Transferências', val: totais.transferencias, cls: 'text-purple-400' },
          ].map(k => (
            <div key={k.label} className="bg-zinc-800/50 rounded-lg px-4 py-3">
              <p className="text-xs text-zinc-400">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="py-10 text-center text-zinc-400 text-sm">Carregando histórico...</div>}

      {/* Tabela */}
      {!loading && (
        <div className="overflow-x-auto">
          {logsFilt.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Nenhuma movimentação encontrada</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                    <th className="text-left p-3">Data/Hora</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Produto</th>
                    <th className="text-left p-3">Loja</th>
                    <th className="text-right p-3">Qtd</th>
                    <th className="text-left p-3 hidden md:table-cell">Origem</th>
                    <th className="text-left p-3 hidden lg:table-cell">Usuário</th>
                    <th className="text-right p-3 hidden lg:table-cell">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {logsFilt.map(l => {
                    const tipoClasse = TIPO_CLS[l.tipo] || 'bg-zinc-700/30 text-zinc-400';
                    const delta      = l.tipo === 'ENTRADA' ? `+${l.quantidade}` : `-${l.quantidade}`;
                    const deltaClasse = l.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400';
                    return (
                      <tr key={l.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                        <td className="p-3 text-zinc-400 text-xs whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${tipoClasse}`}>
                            {TIPO_ICON[l.tipo] || ''} {l.tipo}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="text-white text-sm font-medium">{l.produto.nome}</p>
                          <p className="text-zinc-500 text-xs font-mono">{l.produto.codigo}</p>
                        </td>
                        <td className="p-3 text-zinc-300 text-xs">{l.loja.nomeFantasia || '—'}</td>
                        <td className={`p-3 text-right font-bold text-sm ${deltaClasse}`}>{delta}</td>
                        <td className="p-3 text-zinc-400 text-xs hidden md:table-cell max-w-[180px]">
                          <span className="truncate block" title={l.origem}>{origemLabel(l.origem)}</span>
                        </td>
                        <td className="p-3 text-zinc-400 text-xs hidden lg:table-cell">{l.usuario.nome}</td>
                        <td className="p-3 text-right text-zinc-500 text-xs hidden lg:table-cell">{l.quantidadeNova}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-zinc-600 mt-2 px-1">{logsFilt.length} registro(s) exibido(s)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
