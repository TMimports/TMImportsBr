import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface Loja { id: number; nomeFantasia: string; }

interface UnidadeDisp {
  id: number;
  chassi: string | null;
  cor: string | null;
  ano: number | null;
  status: string;
  produto: { id: number; nome: string; codigo: string; custo: string | number; };
  loja: { id: number; nomeFantasia: string | null; };
}

interface PecaDisp {
  id: number;
  quantidade: number;
  produto: { id: number; nome: string; codigo: string; tipo: string; custo: string | number; preco: string | number; };
  loja: { id: number; nomeFantasia: string | null; };
}

interface LinhaTransf {
  key: number;
  tipo: 'MOTO' | 'PECA';
  unidadeId?: number;
  produtoId?: number;
  chassi: string;
  modelo: string;
  cor: string;
  ano: string;
  quantidade: number;
  custo: string;
}

const sel = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 cursor-pointer';

let keySeq = 0;
const newLinha = (tipo: 'MOTO' | 'PECA' = 'MOTO'): LinhaTransf => ({
  key: ++keySeq, tipo, chassi: '', modelo: '', cor: '', ano: '', quantidade: 1, custo: '',
});

const fmtBRL = (v: string | number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabMovEstoque({ lojas }: { lojas: Loja[] }) {
  const { user } = useAuth();
  const isAdmin = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(user?.role || '');

  const [origemId, setOrigemId]     = useState('');
  const [destinoId, setDestinoId]   = useState('');
  const [linhas, setLinhas]         = useState<LinhaTransf[]>([]);
  const [disponiveis, setDisp]      = useState<UnidadeDisp[]>([]);
  const [pecasDisp, setPecasDisp]   = useState<PecaDisp[]>([]);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [resultado, setResultado]   = useState<{ ok: number; erros: string[] } | null>(null);
  const [erro, setErro]             = useState('');
  const [filtroChassi, setFiltroChassi] = useState('');

  const origemLoja  = lojas.find(l => String(l.id) === origemId);
  const destinoLoja = lojas.find(l => String(l.id) === destinoId);

  useEffect(() => {
    if (!origemId) { setDisp([]); setPecasDisp([]); setLinhas([]); return; }
    setLoadingDisp(true);
    api.get<{ unidades: UnidadeDisp[]; pecas: PecaDisp[] }>(`/estoque/geral?lojaId=${origemId}&statusUni=ESTOQUE`)
      .then(d => { setDisp(d?.unidades || []); setPecasDisp(d?.pecas || []); })
      .catch(() => { setDisp([]); setPecasDisp([]); })
      .finally(() => setLoadingDisp(false));
  }, [origemId]);

  const chassisUsados = useMemo(() => new Set(linhas.map(l => l.chassi).filter(Boolean)), [linhas]);
  const chassisLivres = useMemo(() =>
    disponiveis.filter(u => u.chassi && !chassisUsados.has(u.chassi!)), [disponiveis, chassisUsados]);

  const chassisFiltrados = useMemo(() => {
    if (!filtroChassi.trim()) return chassisLivres;
    const q = filtroChassi.toLowerCase();
    return chassisLivres.filter(u =>
      (u.chassi || '').toLowerCase().includes(q) ||
      u.produto.nome.toLowerCase().includes(q) ||
      (u.cor || '').toLowerCase().includes(q)
    );
  }, [chassisLivres, filtroChassi]);

  function selecionarChassi(key: number, chassiStr: string) {
    const unidade = disponiveis.find(u => u.chassi === chassiStr);
    setLinhas(prev => prev.map(l =>
      l.key === key ? {
        ...l,
        tipo: 'MOTO',
        unidadeId: unidade?.id,
        produtoId: unidade?.produto.id,
        chassi:    chassiStr,
        modelo:    unidade?.produto.nome || '',
        cor:       unidade?.cor || '',
        ano:       String(unidade?.ano || ''),
        custo:     String(unidade?.produto.custo || ''),
      } : l
    ));
  }

  function selecionarPeca(key: number, produtoIdStr: string) {
    const peca = pecasDisp.find(p => String(p.produto.id) === produtoIdStr);
    setLinhas(prev => prev.map(l =>
      l.key === key ? {
        ...l,
        tipo:       'PECA',
        unidadeId:  undefined,
        produtoId:  peca?.produto.id,
        chassi:     '',
        modelo:     peca?.produto.nome || '',
        cor:        '',
        ano:        '',
        custo:      String(peca?.produto.custo || ''),
        quantidade: 1,
      } : l
    ));
  }

  function addLinha(tipo: 'MOTO' | 'PECA') { setLinhas(prev => [...prev, newLinha(tipo)]); }
  function removerLinha(key: number) { setLinhas(prev => prev.filter(l => l.key !== key)); }
  function updateLinha(key: number, field: keyof LinhaTransf, value: any) {
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  }

  async function confirmar() {
    setErro('');
    if (!origemId)                             return setErro('Selecione a loja de origem');
    if (!destinoId)                            return setErro('Selecione a loja de destino');
    if (Number(origemId) === Number(destinoId)) return setErro('Origem e destino não podem ser iguais');
    const validas = linhas.filter(l => l.produtoId && (l.tipo === 'PECA' || l.chassi));
    if (!validas.length)                       return setErro('Adicione ao menos um item válido');

    setSaving(true); setResultado(null);
    let ok = 0; const erros: string[] = [];

    for (const l of validas) {
      try {
        if (isAdmin) {
          await api.post('/transferencias/direto', {
            produtoId:       l.produtoId,
            unidadeFisicaId: l.unidadeId || undefined,
            lojaOrigemId:    Number(origemId),
            lojaDestinoId:   Number(destinoId),
            quantidade:      l.tipo === 'PECA' ? l.quantidade : 1,
          });
        } else {
          await api.post('/transferencias', {
            produtoId:       l.produtoId,
            unidadeFisicaId: l.unidadeId || undefined,
            lojaOrigemId:    Number(origemId),
            lojaDestinoId:   Number(destinoId),
            quantidade:      l.tipo === 'PECA' ? l.quantidade : 1,
          });
        }
        ok++;
      } catch (e: any) {
        erros.push(e?.message || `Erro: "${l.chassi || l.modelo}"`);
      }
    }

    setResultado({ ok, erros });
    if (ok > 0 && erros.length === 0) {
      setLinhas([]);
      setDisp([]);
      setPecasDisp([]);
      setOrigemId('');
      setDestinoId('');
      setFiltroChassi('');
    }
    setSaving(false);
  }

  function limparTudo() {
    setOrigemId(''); setDestinoId(''); setLinhas([]);
    setResultado(null); setErro(''); setFiltroChassi('');
  }

  const totalMotos = linhas.filter(l => l.tipo === 'MOTO' && l.chassi).length;
  const totalPecas = linhas.filter(l => l.tipo === 'PECA' && l.produtoId).length;
  const totalValido = totalMotos + totalPecas;

  return (
    <div className="space-y-5">

      {/* ── Bloco ORIGEM → DESTINO ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">

        {/* ORIGEM */}
        <div className={`rounded-xl border-2 p-4 transition-colors ${origemId ? 'border-orange-500/60 bg-orange-500/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">SAÍDA</span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Estoque de Origem</span>
          </div>
          <select
            value={origemId}
            onChange={e => { setOrigemId(e.target.value); setLinhas([]); setResultado(null); setFiltroChassi(''); }}
            className={sel + ' w-full'}
          >
            <option value="">Selecione a loja de origem...</option>
            {lojas.map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
          </select>
          {origemId && (
            <div className="mt-2 flex gap-3 text-xs">
              {loadingDisp
                ? <span className="text-zinc-500">Carregando estoque...</span>
                : <>
                    <span className="text-orange-400 font-medium">🏍 {disponiveis.length} moto(s)</span>
                    <span className="text-blue-400 font-medium">🔩 {pecasDisp.filter(p => p.quantidade > 0).length} tipo(s) peça</span>
                  </>
              }
            </div>
          )}
        </div>

        {/* Seta central */}
        <div className="flex items-center justify-center pt-4 sm:pt-10">
          <div className={`flex flex-col items-center gap-1 transition-colors ${origemId && destinoId ? 'text-green-400' : 'text-zinc-600'}`}>
            <span className="text-2xl">→</span>
            {totalValido > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{totalValido}</span>
            )}
          </div>
        </div>

        {/* DESTINO */}
        <div className={`rounded-xl border-2 p-4 transition-colors ${destinoId ? 'border-green-500/60 bg-green-500/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">ENTRADA</span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Estoque de Destino</span>
          </div>
          <select
            value={destinoId}
            onChange={e => { setDestinoId(e.target.value); setResultado(null); }}
            className={sel + ' w-full'}
            disabled={!origemId}
          >
            <option value="">Selecione a loja de destino...</option>
            {lojas.filter(l => String(l.id) !== origemId).map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
          </select>
          {destinoId && origemId && origemLoja && destinoLoja && (
            <p className="text-xs text-zinc-400 mt-2">
              <span className="text-orange-300 font-medium">{origemLoja.nomeFantasia}</span>
              <span className="text-zinc-500 mx-1">→</span>
              <span className="text-green-300 font-medium">{destinoLoja.nomeFantasia}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Resultado ─────────────────────────────────────────────────────────── */}
      {resultado && (
        <div className={`rounded-xl p-4 border ${resultado.erros.length && resultado.ok === 0 ? 'bg-red-900/10 border-red-700/30' : resultado.erros.length ? 'bg-yellow-900/10 border-yellow-700/30' : 'bg-green-900/10 border-green-700/30'}`}>
          {resultado.ok > 0 && (
            <p className="text-green-400 font-semibold text-sm">
              ✓ {resultado.ok} item(s) {isAdmin ? 'transferido(s) com sucesso' : 'solicitado(s) — aguardando aprovação'}
            </p>
          )}
          {resultado.erros.map((e, i) => <p key={i} className="text-red-400 text-xs mt-1">{e}</p>)}
        </div>
      )}

      {/* ── Grade de Itens ─────────────────────────────────────────────────────── */}
      {origemId && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">

          {/* Header da grade */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-zinc-200">Grade de Movimentação</p>
              {totalMotos > 0 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">{totalMotos} moto(s)</span>}
              {totalPecas > 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">{totalPecas} peça(s)</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addLinha('MOTO')}
                disabled={loadingDisp}
                className="text-xs bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
              >
                + Moto
              </button>
              <button
                onClick={() => addLinha('PECA')}
                disabled={loadingDisp || pecasDisp.filter(p => p.quantidade > 0).length === 0}
                className="text-xs bg-blue-500 text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
              >
                + Peça
              </button>
            </div>
          </div>

          {/* Filtro de chassi (só aparece se tiver motos disponíveis e ao menos 1 linha moto) */}
          {disponiveis.length > 0 && linhas.some(l => l.tipo === 'MOTO') && (
            <div className="px-4 py-2 border-b border-zinc-700/50 bg-zinc-800/20">
              <input
                value={filtroChassi}
                onChange={e => setFiltroChassi(e.target.value)}
                placeholder="Filtrar chassis disponíveis por chassi, modelo ou cor..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              {filtroChassi && (
                <p className="text-xs text-zinc-500 mt-1">{chassisFiltrados.length} chassi(s) corresponde(m) ao filtro</p>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {linhas.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-500 text-sm mb-3">Nenhum item adicionado à movimentação</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => addLinha('MOTO')}
                  disabled={loadingDisp || disponiveis.length === 0}
                  className="text-sm bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
                >
                  + Adicionar Moto
                </button>
                <button
                  onClick={() => addLinha('PECA')}
                  disabled={loadingDisp || pecasDisp.filter(p => p.quantidade > 0).length === 0}
                  className="text-sm bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-40 transition-colors"
                >
                  + Adicionar Peça
                </button>
              </div>
              {disponiveis.length === 0 && !loadingDisp && (
                <p className="text-zinc-600 text-xs mt-3">Sem motos em estoque nesta loja</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-400 border-b border-zinc-700 bg-zinc-800/30">
                    <th className="text-left p-3 w-8">#</th>
                    <th className="text-left p-3">Chassi / Produto</th>
                    <th className="text-left p-3 min-w-[140px]">Modelo</th>
                    <th className="text-left p-3">Cor</th>
                    <th className="text-left p-3">Ano</th>
                    <th className="text-right p-3">Qtd</th>
                    <th className="text-right p-3 hidden md:table-cell">Custo</th>
                    <th className="text-right p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, idx) => {
                    const isFilled = l.chassi || l.produtoId;
                    return (
                      <tr
                        key={l.key}
                        className={`border-b border-zinc-800 transition-colors ${isFilled ? 'bg-zinc-800/10 hover:bg-zinc-800/30' : 'hover:bg-zinc-800/20'}`}
                      >
                        {/* # */}
                        <td className="p-2 text-center">
                          <span className={`text-xs font-mono font-bold ${l.tipo === 'MOTO' ? 'text-orange-400' : 'text-blue-400'}`}>
                            {idx + 1}
                          </span>
                        </td>

                        {/* Chassi / Produto selector */}
                        {l.tipo === 'MOTO' ? (
                          <td className="p-2">
                            <select
                              value={l.chassi}
                              onChange={e => selecionarChassi(l.key, e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 min-w-[200px] cursor-pointer"
                            >
                              <option value="">🏍 Selecionar chassi...</option>
                              {chassisFiltrados.map(u => (
                                <option key={u.id} value={u.chassi!}>
                                  {u.chassi} — {u.produto.nome}{u.cor ? ` · ${u.cor}` : ''}{u.ano ? ` (${u.ano})` : ''}
                                </option>
                              ))}
                              {/* Se este item já tem chassi mas não aparece nos filtrados */}
                              {l.chassi && !chassisFiltrados.find(u => u.chassi === l.chassi) && (
                                <option value={l.chassi}>{l.chassi} (selecionado)</option>
                              )}
                            </select>
                          </td>
                        ) : (
                          <td className="p-2">
                            <select
                              value={String(l.produtoId || '')}
                              onChange={e => selecionarPeca(l.key, e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 min-w-[220px] cursor-pointer"
                            >
                              <option value="">🔩 Selecionar peça...</option>
                              {pecasDisp.filter(p => p.quantidade > 0).map(p => (
                                <option key={p.produto.id} value={p.produto.id}>
                                  {p.produto.nome} — saldo: {p.quantidade}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}

                        {/* Modelo (preenchido auto) */}
                        <td className="p-2">
                          {l.modelo
                            ? <span className="text-white text-xs font-medium">{l.modelo}</span>
                            : <span className="text-zinc-600 text-xs italic">—</span>
                          }
                        </td>

                        {/* Cor */}
                        <td className="p-2">
                          {l.cor
                            ? <span className="text-zinc-300 text-xs">{l.cor}</span>
                            : <span className="text-zinc-600 text-xs">—</span>
                          }
                        </td>

                        {/* Ano */}
                        <td className="p-2">
                          {l.ano
                            ? <span className="text-zinc-400 text-xs">{l.ano}</span>
                            : <span className="text-zinc-600 text-xs">—</span>
                          }
                        </td>

                        {/* Quantidade */}
                        <td className="p-2 text-right">
                          {l.tipo === 'PECA' ? (
                            <input
                              type="number" min="1"
                              value={l.quantidade}
                              onChange={e => updateLinha(l.key, 'quantidade', Number(e.target.value))}
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-16 text-right focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <span className="text-zinc-500 text-xs">1</span>
                          )}
                        </td>

                        {/* Custo */}
                        <td className="p-2 text-right hidden md:table-cell">
                          {l.custo
                            ? <span className="text-zinc-400 text-xs">{fmtBRL(l.custo)}</span>
                            : <span className="text-zinc-700 text-xs">—</span>
                          }
                        </td>

                        {/* Remover */}
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removerLinha(l.key)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs px-1.5 py-1 rounded transition-colors"
                            title="Remover linha"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Rodapé: erro + confirmar ───────────────────────────────────────────── */}
      {origemId && destinoId && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-zinc-400 text-xs">Itens prontos </span>
              <span className="text-white font-bold text-base">{totalValido}</span>
            </div>
            {totalMotos > 0 && <span className="text-xs text-orange-300">{totalMotos} moto(s)</span>}
            {totalPecas > 0 && <span className="text-xs text-blue-300">{totalPecas} peça(s)</span>}
          </div>
          <div className="flex items-center gap-3">
            {erro && <p className="text-red-400 text-xs max-w-48">{erro}</p>}
            <button
              onClick={limparTudo}
              className="text-sm text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={saving || totalValido === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {saving ? (
                <><span className="animate-pulse">●</span> Processando...</>
              ) : isAdmin ? (
                <>✓ Confirmar Transferência</>
              ) : (
                <>📤 Solicitar Transferência</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Informativo */}
      <p className="text-xs text-zinc-600 px-1">
        {isAdmin
          ? '✓ Como administrador, o estoque é movimentado imediatamente ao confirmar.'
          : 'ℹ Solicitações precisam ser aprovadas pelo Financeiro para o estoque ser movimentado.'}
      </p>
    </div>
  );
}
