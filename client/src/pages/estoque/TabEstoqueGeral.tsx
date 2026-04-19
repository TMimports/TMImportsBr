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
  ESTOQUE:     'bg-green-500/20 text-green-400',
  VENDIDA:     'bg-zinc-500/20 text-zinc-400',
  RESERVADA:   'bg-yellow-500/20 text-yellow-400',
  TRANSFERIDA: 'bg-blue-500/20 text-blue-400',
};

const fmtBRL = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const inp  = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
const sel  = inp + ' cursor-pointer';

export function TabEstoqueGeral({ lojas }: { lojas: Loja[] }) {
  const [data, setData]         = useState<GeralResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [busca, setBusca]       = useState('');
  const [filtroLoja, setFiltroLoja]     = useState('');
  const [filtroTipo, setFiltroTipo]     = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [secao, setSecao]       = useState<'motos' | 'pecas'>('motos');

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
    const q = busca.toLowerCase();
    let items = data.unidades;
    if (filtroStatus) items = items.filter(u => u.status === filtroStatus);
    if (!q) return items;
    return items.filter(u =>
      (u.chassi || '').toLowerCase().includes(q) ||
      u.produto.nome.toLowerCase().includes(q) ||
      (u.cor || '').toLowerCase().includes(q) ||
      (u.codigoMotor || '').toLowerCase().includes(q)
    );
  }, [data, busca, filtroStatus]);

  const pecasFilt = useMemo(() => {
    if (!data) return [];
    const q = busca.toLowerCase();
    if (!q) return data.pecas;
    return data.pecas.filter(p =>
      p.produto.nome.toLowerCase().includes(q) ||
      p.produto.codigo.toLowerCase().includes(q) ||
      (p.loja.nomeFantasia || '').toLowerCase().includes(q)
    );
  }, [data, busca]);

  const verCustos = data?.verCustos ?? false;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por chassi, modelo, cor, código..."
          className={inp + ' flex-1 min-w-48'}
        />
        <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className={sel}>
          <option value="">Todas as lojas</option>
          {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setSecao(e.target.value === 'PECA' ? 'pecas' : 'motos'); }} className={sel}>
          <option value="">Motos + Peças</option>
          <option value="MOTO">Motos</option>
          <option value="PECA">Peças</option>
        </select>
        {filtroTipo !== 'PECA' && (
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={sel}>
            <option value="">Todos os status</option>
            <option value="ESTOQUE">Em Estoque</option>
            <option value="VENDIDA">Vendida</option>
            <option value="RESERVADA">Reservada</option>
            <option value="TRANSFERIDA">Transferida</option>
          </select>
        )}
        <button onClick={load} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          🔄 Atualizar
        </button>
      </div>

      {/* Toggle seção */}
      {!filtroTipo && (
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setSecao('motos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${secao === 'motos' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🏍️ Motos ({data?.unidades.length ?? '—'})
          </button>
          <button
            onClick={() => setSecao('pecas')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${secao === 'pecas' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🔩 Peças ({data?.pecas.length ?? '—'})
          </button>
        </div>
      )}

      {loading && <div className="py-10 text-center text-zinc-400 text-sm">Carregando...</div>}

      {/* Tabela Motos */}
      {!loading && (secao === 'motos' || filtroTipo === 'MOTO') && (
        <div className="overflow-x-auto">
          {unidadesFilt.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Nenhuma moto encontrada</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                  <th className="text-left p-3">Chassi</th>
                  <th className="text-left p-3">Modelo</th>
                  <th className="text-left p-3">Cor</th>
                  <th className="text-left p-3">Ano</th>
                  <th className="text-left p-3">Loja</th>
                  {verCustos && <th className="text-left p-3">Custo</th>}
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Entrada</th>
                </tr>
              </thead>
              <tbody>
                {unidadesFilt.map(u => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 font-mono text-orange-400 text-xs">{u.chassi || '—'}</td>
                    <td className="p-3 text-white font-medium">{u.produto.nome}</td>
                    <td className="p-3 text-zinc-300">{u.cor || '—'}</td>
                    <td className="p-3 text-zinc-300">{u.ano || '—'}</td>
                    <td className="p-3 text-zinc-300 text-xs">{u.loja.nomeFantasia || '—'}</td>
                    {verCustos && <td className="p-3 text-zinc-300 text-xs">{fmtBRL(u.produto.custo)}</td>}
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CLS[u.status] || 'bg-zinc-700 text-zinc-400'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 text-xs">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-zinc-600 mt-2 px-1">{unidadesFilt.length} unidade(s) exibida(s)</p>
        </div>
      )}

      {/* Tabela Peças */}
      {!loading && (secao === 'pecas' || filtroTipo === 'PECA') && (
        <div className="overflow-x-auto">
          {pecasFilt.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Nenhuma peça encontrada</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-left p-3">Loja</th>
                  <th className="text-right p-3">Qtd</th>
                  {verCustos && <th className="text-right p-3">Custo Unit.</th>}
                  <th className="text-right p-3">Preço Venda</th>
                </tr>
              </thead>
              <tbody>
                {pecasFilt.map(p => (
                  <tr key={p.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors ${p.quantidade === 0 ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-mono text-zinc-400 text-xs">{p.produto.codigo}</td>
                    <td className="p-3 text-white font-medium">{p.produto.nome}</td>
                    <td className="p-3 text-zinc-300 text-xs">{p.loja.nomeFantasia || '—'}</td>
                    <td className="p-3 text-right">
                      <span className={`font-bold text-sm ${p.quantidade === 0 ? 'text-red-400' : p.quantidade <= 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {p.quantidade}
                      </span>
                    </td>
                    {verCustos && <td className="p-3 text-right text-zinc-300 text-xs">{fmtBRL(p.produto.custo)}</td>}
                    <td className="p-3 text-right text-zinc-300 text-xs">{fmtBRL(p.produto.preco)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-zinc-600 mt-2 px-1">{pecasFilt.length} produto(s) exibido(s)</p>
        </div>
      )}
    </div>
  );
}
