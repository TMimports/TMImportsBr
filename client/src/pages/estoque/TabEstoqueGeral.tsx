import { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';

interface Loja { id: number; nomeFantasia: string; }

interface UnidadeItem {
  id: number;
  chassi: string | null;
  codigoMotor: string | null;
  cor: string | null;
  ano: number | null;
  status: string;
  createdAt: string;
  produto: { id: number; nome: string; codigo: string; custo: string | number; preco: string | number; };
  loja: { id: number; nomeFantasia: string | null; };
}

interface PecaItem {
  id: number;
  quantidade: number;
  custoMedio: string | number | null;
  produto: { id: number; nome: string; codigo: string; tipo: string; custo: string | number; preco: string | number; };
  loja: { id: number; nomeFantasia: string | null; };
}

interface GeralResponse {
  unidades: UnidadeItem[];
  pecas: PecaItem[];
  verCustos: boolean;
}

const STATUS_CLS: Record<string, string> = {
  ESTOQUE:     'bg-green-500/20 text-green-400 border border-green-500/30',
  VENDIDA:     'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30',
  RESERVADA:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  TRANSFERIDA: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  ESTOQUE:     '● Disponível',
  VENDIDA:     '● Vendida',
  RESERVADA:   '● Reservada',
  TRANSFERIDA: '● Transferida',
};

const fmtBRL  = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');
const inp     = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
const sel     = inp + ' cursor-pointer';

export function TabEstoqueGeral({ lojas }: { lojas: Loja[] }) {
  const [data, setData]       = useState<GeralResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca]     = useState('');
  const [filtroLoja, setFiltroLoja]     = useState('');
  const [filtroTipo, setFiltroTipo]     = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ESTOQUE');
  const [secao, setSecao]     = useState<'motos' | 'pecas'>('motos');
  const [buscaChassi, setBuscaChassi]   = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroLoja) params.set('lojaId', filtroLoja);
    if (filtroTipo) params.set('tipo', filtroTipo);
    api.get<GeralResponse>(`/estoque/geral?${params}`)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filtroLoja, filtroTipo]);

  const unidadesFilt = useMemo(() => {
    if (!data) return [];
    let items = data.unidades;
    if (filtroStatus) items = items.filter(u => u.status === filtroStatus);
    const q = busca.toLowerCase().trim();
    if (!q && !buscaChassi.trim()) return items;
    return items.filter(u => {
      if (buscaChassi.trim()) {
        return (u.chassi || '').toLowerCase().includes(buscaChassi.toLowerCase().trim());
      }
      return (
        (u.chassi || '').toLowerCase().includes(q) ||
        u.produto.nome.toLowerCase().includes(q) ||
        (u.cor || '').toLowerCase().includes(q) ||
        (u.codigoMotor || '').toLowerCase().includes(q) ||
        (u.loja.nomeFantasia || '').toLowerCase().includes(q)
      );
    });
  }, [data, busca, filtroStatus, buscaChassi]);

  const pecasFilt = useMemo(() => {
    if (!data) return [];
    const q = busca.toLowerCase().trim();
    let items = data.pecas;
    if (filtroStatus === 'ESTOQUE') items = items.filter(p => p.quantidade > 0);
    if (!q) return items;
    return items.filter(p =>
      p.produto.nome.toLowerCase().includes(q) ||
      p.produto.codigo.toLowerCase().includes(q) ||
      (p.loja.nomeFantasia || '').toLowerCase().includes(q)
    );
  }, [data, busca, filtroStatus]);

  // KPIs
  const totalMotosDisp = data?.unidades.filter(u => u.status === 'ESTOQUE').length ?? 0;
  const totalPecasDisp = data?.pecas.filter(p => p.quantidade > 0).length ?? 0;
  const totalPecasBaixo = data?.pecas.filter(p => p.quantidade > 0 && p.quantidade <= 2).length ?? 0;

  const verCustos = data?.verCustos ?? false;

  return (
    <div className="space-y-4">

      {/* ── KPIs rápidos ──────────────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Motos disponíveis</p>
            <p className="text-2xl font-bold text-green-400">{totalMotosDisp}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Tipos de peça</p>
            <p className="text-2xl font-bold text-blue-400">{totalPecasDisp}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Total de motos</p>
            <p className="text-2xl font-bold text-zinc-300">{data.unidades.length}</p>
          </div>
          {totalPecasBaixo > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-3">
              <p className="text-xs text-yellow-500 mb-1">⚠ Peças com saldo baixo</p>
              <p className="text-2xl font-bold text-yellow-400">{totalPecasBaixo}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setBuscaChassi(''); }}
            placeholder="Buscar por modelo, chassi, cor, loja..."
            className={inp + ' flex-1 min-w-48 text-sm'}
          />
          <input
            value={buscaChassi}
            onChange={e => { setBuscaChassi(e.target.value); setBusca(''); }}
            placeholder="🔍 Chassi exato..."
            className={inp + ' w-44 font-mono text-sm'}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className={sel + ' text-sm flex-1 min-w-36'}>
            <option value="">Todas as lojas</option>
            {lojas.map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setSecao(e.target.value === 'PECA' ? 'pecas' : 'motos'); }} className={sel + ' text-sm'}>
            <option value="">Motos + Peças</option>
            <option value="MOTO">🏍 Somente Motos</option>
            <option value="PECA">🔩 Somente Peças</option>
          </select>
          {filtroTipo !== 'PECA' && (
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={sel + ' text-sm'}>
              <option value="">Todos os status</option>
              <option value="ESTOQUE">Disponível</option>
              <option value="VENDIDA">Vendida</option>
              <option value="RESERVADA">Reservada</option>
              <option value="TRANSFERIDA">Transferida</option>
            </select>
          )}
          <button onClick={load} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* ── Toggle secção ────────────────────────────────────────────────────── */}
      {!filtroTipo && (
        <div className="flex gap-1 bg-zinc-800/50 border border-zinc-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => setSecao('motos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${secao === 'motos' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏍 Motos {data ? `(${unidadesFilt.length})` : ''}
          </button>
          <button
            onClick={() => setSecao('pecas')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${secao === 'pecas' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🔩 Peças {data ? `(${pecasFilt.length})` : ''}
          </button>
        </div>
      )}

      {loading && <div className="py-12 text-center text-zinc-400 text-sm">Carregando estoque...</div>}

      {/* ── Tabela Motos ──────────────────────────────────────────────────────── */}
      {!loading && (secao === 'motos' || filtroTipo === 'MOTO') && (
        <div className="overflow-x-auto">
          {unidadesFilt.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-500 text-sm">Nenhuma moto encontrada</p>
              {(busca || buscaChassi || filtroStatus) && (
                <button onClick={() => { setBusca(''); setBuscaChassi(''); setFiltroStatus(''); }} className="text-xs text-orange-400 hover:text-orange-300 mt-2 underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30 text-zinc-400 text-xs">
                  <th className="text-left px-3 py-2.5 font-medium">Chassi</th>
                  <th className="text-left px-3 py-2.5 font-medium">Modelo</th>
                  <th className="text-left px-3 py-2.5 font-medium">Cor</th>
                  <th className="text-left px-3 py-2.5 font-medium">Ano</th>
                  <th className="text-left px-3 py-2.5 font-medium">Localização</th>
                  {verCustos && <th className="text-right px-3 py-2.5 font-medium">Custo</th>}
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Entrada</th>
                </tr>
              </thead>
              <tbody>
                {unidadesFilt.map(u => (
                  <tr key={u.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-orange-400 text-xs font-bold tracking-wider group-hover:text-orange-300">
                        {u.chassi || <span className="text-zinc-600 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-white text-sm font-medium">{u.produto.nome}</span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{u.cor || '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-400 text-xs">{u.ano || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-zinc-300">{u.loja.nomeFantasia || '—'}</span>
                    </td>
                    {verCustos && (
                      <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">{fmtBRL(u.produto.custo)}</td>
                    )}
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[u.status] || 'bg-zinc-700 text-zinc-400'}`}>
                        {STATUS_LABEL[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 text-xs hidden lg:table-cell">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-zinc-700 mt-1.5 px-1">{unidadesFilt.length} moto(s) exibida(s)</p>
        </div>
      )}

      {/* ── Tabela Peças ──────────────────────────────────────────────────────── */}
      {!loading && (secao === 'pecas' || filtroTipo === 'PECA') && (
        <div className="overflow-x-auto">
          {pecasFilt.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Nenhuma peça encontrada</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30 text-zinc-400 text-xs">
                  <th className="text-left px-3 py-2.5 font-medium">Código</th>
                  <th className="text-left px-3 py-2.5 font-medium">Produto</th>
                  <th className="text-left px-3 py-2.5 font-medium">Localização</th>
                  <th className="text-right px-3 py-2.5 font-medium">Saldo</th>
                  {verCustos && <th className="text-right px-3 py-2.5 font-medium">Custo Unit.</th>}
                  <th className="text-right px-3 py-2.5 font-medium">Preço Venda</th>
                </tr>
              </thead>
              <tbody>
                {pecasFilt.map(p => (
                  <tr key={p.id} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors ${p.quantidade === 0 ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-zinc-500 text-xs">{p.produto.codigo}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-white text-sm font-medium">{p.produto.nome}</span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{p.loja.nomeFantasia || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-bold text-sm ${p.quantidade === 0 ? 'text-red-400' : p.quantidade <= 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {p.quantidade}
                      </span>
                      {p.quantidade <= 2 && p.quantidade > 0 && (
                        <span className="text-yellow-600 text-xs ml-1">⚠</span>
                      )}
                    </td>
                    {verCustos && (
                      <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">{fmtBRL(p.produto.custo)}</td>
                    )}
                    <td className="px-3 py-2.5 text-right text-zinc-300 text-xs">{fmtBRL(p.produto.preco)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-zinc-700 mt-1.5 px-1">{pecasFilt.length} produto(s) exibido(s)</p>
        </div>
      )}
    </div>
  );
}
