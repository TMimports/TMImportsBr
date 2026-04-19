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

const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
const sel = inp + ' cursor-pointer';
const fmtBRL = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

let keySeq = 0;
const newLinha = (): LinhaTransf => ({ key: ++keySeq, tipo: 'MOTO', chassi: '', modelo: '', cor: '', ano: '', quantidade: 1, custo: '' });

export function TabMovEstoque({ lojas }: { lojas: Loja[] }) {
  const { user } = useAuth();
  const isAdmin = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(user?.role || '');

  const [origemId, setOrigemId]     = useState('');
  const [destinoId, setDestinoId]   = useState('');
  const [linhas, setLinhas]         = useState<LinhaTransf[]>([newLinha()]);
  const [disponiveis, setDisp]      = useState<UnidadeDisp[]>([]);
  const [pecasDisp, setPecasDisp]   = useState<PecaDisp[]>([]);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [resultado, setResultado]   = useState<{ ok: number; erros: string[] } | null>(null);
  const [erro, setErro]             = useState('');

  const origemNome  = lojas.find(l => l.id === Number(origemId))?.nomeFantasia || '';
  const destinoNome = lojas.find(l => l.id === Number(destinoId))?.nomeFantasia || '';

  useEffect(() => {
    if (!origemId) { setDisp([]); setPecasDisp([]); return; }
    setLoadingDisp(true);
    api.get<{ unidades: UnidadeDisp[]; pecas: PecaDisp[] }>(`/estoque/geral?lojaId=${origemId}&statusUni=ESTOQUE`)
      .then(d => { setDisp(d?.unidades || []); setPecasDisp(d?.pecas || []); })
      .catch(() => { setDisp([]); setPecasDisp([]); })
      .finally(() => setLoadingDisp(false));
  }, [origemId]);

  const chassisUsados = useMemo(() => new Set(linhas.map(l => l.chassi).filter(Boolean)), [linhas]);
  const chassisLivres = useMemo(() => disponiveis.filter(u => u.chassi && !chassisUsados.has(u.chassi!)), [disponiveis, chassisUsados]);

  function selecionarChassi(key: number, chassiStr: string) {
    const unidade = disponiveis.find(u => u.chassi === chassiStr);
    setLinhas(prev => prev.map(l =>
      l.key === key ? {
        ...l,
        tipo: 'MOTO',
        unidadeId: unidade?.id,
        produtoId: unidade?.produto.id,
        chassi: chassiStr,
        modelo: unidade?.produto.nome || l.modelo,
        cor:    unidade?.cor || '',
        ano:    String(unidade?.ano || ''),
        custo:  String(unidade?.produto.custo || ''),
      } : l
    ));
  }

  function selecionarPeca(key: number, produtoIdStr: string) {
    const peca = pecasDisp.find(p => String(p.produto.id) === produtoIdStr);
    setLinhas(prev => prev.map(l =>
      l.key === key ? {
        ...l,
        tipo: 'PECA',
        unidadeId: undefined,
        produtoId: peca?.produto.id,
        chassi:    '',
        modelo:    peca?.produto.nome || '',
        cor:       '',
        ano:       '',
        custo:     String(peca?.produto.custo || ''),
        quantidade: 1,
      } : l
    ));
  }

  function addLinhaMoto()  { setLinhas(prev => [...prev, { ...newLinha(), tipo: 'MOTO' }]); }
  function addLinhaPeca()  { setLinhas(prev => [...prev, { ...newLinha(), tipo: 'PECA' }]); }
  function removerLinha(key: number) { setLinhas(prev => prev.filter(l => l.key !== key)); }
  function updateLinha(key: number, field: keyof LinhaTransf, value: any) {
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  }

  async function confirmar() {
    if (!origemId)                return setErro('Selecione a loja de origem');
    if (!destinoId)               return setErro('Selecione a loja de destino');
    if (Number(origemId) === Number(destinoId)) return setErro('Origem e destino não podem ser iguais');
    const linhasValidas = linhas.filter(l => l.produtoId && (l.tipo === 'PECA' || l.chassi));
    if (!linhasValidas.length)    return setErro('Adicione ao menos um item válido');

    setSaving(true); setErro(''); setResultado(null);
    let ok = 0; const erros: string[] = [];

    for (const l of linhasValidas) {
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
        erros.push(e?.message || `Erro no item "${l.chassi || l.modelo}"`);
      }
    }

    setResultado({ ok, erros });
    if (ok > 0) {
      setLinhas([newLinha()]);
      setDisp([]);
      setPecasDisp([]);
      setOrigemId('');
      setDestinoId('');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Origem / Destino */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">📤 Origem</p>
          <select
            value={origemId}
            onChange={e => { setOrigemId(e.target.value); setLinhas([newLinha()]); setResultado(null); }}
            className={sel + ' w-full'}
          >
            <option value="">Selecione a loja de origem...</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
          </select>
          {origemId && (
            <p className="text-xs text-zinc-500 mt-2">
              {loadingDisp ? 'Carregando estoque...' : `${disponiveis.length} moto(s) disponível(is) · ${pecasDisp.filter(p => p.quantidade > 0).length} tipo(s) de peça`}
            </p>
          )}
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">📥 Destino</p>
          <select
            value={destinoId}
            onChange={e => { setDestinoId(e.target.value); setResultado(null); }}
            className={sel + ' w-full'}
          >
            <option value="">Selecione a loja de destino...</option>
            {lojas.filter(l => String(l.id) !== origemId).map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
          </select>
          {destinoId && origemId && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-orange-400 text-sm font-medium">{origemNome}</span>
              <span className="text-zinc-500">→</span>
              <span className="text-green-400 text-sm font-medium">{destinoNome}</span>
            </div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`rounded-xl p-4 border ${resultado.erros.length ? 'bg-yellow-900/10 border-yellow-700/30' : 'bg-green-900/10 border-green-700/30'}`}>
          <p className={`font-semibold text-sm mb-1 ${resultado.erros.length ? 'text-yellow-400' : 'text-green-400'}`}>
            {resultado.ok > 0 && `✓ ${resultado.ok} item(s) ${isAdmin ? 'transferido(s) com sucesso' : 'solicitado(s) com sucesso'}.`}
          </p>
          {resultado.erros.map((e, i) => <p key={i} className="text-red-400 text-xs mt-1">{e}</p>)}
          {!isAdmin && resultado.ok > 0 && (
            <p className="text-zinc-400 text-xs mt-2">Aguardando aprovação do Financeiro para conclusão.</p>
          )}
        </div>
      )}

      {/* Tabela de itens */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <p className="text-sm font-semibold text-zinc-200">Itens da Transferência</p>
          <div className="flex gap-2">
            <button onClick={addLinhaMoto} disabled={!origemId} className="text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30 px-2.5 py-1 rounded-lg disabled:opacity-40">+ Moto</button>
            <button onClick={addLinhaPeca} disabled={!origemId} className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 px-2.5 py-1 rounded-lg disabled:opacity-40">+ Peça</button>
          </div>
        </div>

        {!origemId ? (
          <div className="py-10 text-center text-zinc-500 text-sm">Selecione a loja de origem para adicionar itens</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-700">
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Chassi / Produto</th>
                  <th className="text-left p-3">Modelo</th>
                  <th className="text-left p-3">Cor</th>
                  <th className="text-left p-3">Ano</th>
                  <th className="text-right p-3">Qtd</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.key} className="border-b border-zinc-800 hover:bg-zinc-800/20">
                    <td className="p-2">
                      <select
                        value={l.tipo}
                        onChange={e => updateLinha(l.key, 'tipo', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="MOTO">Moto</option>
                        <option value="PECA">Peça</option>
                      </select>
                    </td>

                    {l.tipo === 'MOTO' ? (
                      <td className="p-2">
                        <select
                          value={l.chassi}
                          onChange={e => selecionarChassi(l.key, e.target.value)}
                          className={sel + ' min-w-[160px] text-xs py-1.5'}
                        >
                          <option value="">-- Selecionar Chassi --</option>
                          {chassisLivres.concat(l.chassi && disponiveis.find(u => u.chassi === l.chassi) ? [disponiveis.find(u => u.chassi === l.chassi)!] : []).map(u => (
                            <option key={u.id} value={u.chassi!}>{u.chassi} — {u.produto.nome}{u.cor ? ` · ${u.cor}` : ''}</option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="p-2">
                        <select
                          value={String(l.produtoId || '')}
                          onChange={e => selecionarPeca(l.key, e.target.value)}
                          className={sel + ' min-w-[200px] text-xs py-1.5'}
                        >
                          <option value="">-- Selecionar Peça --</option>
                          {pecasDisp.filter(p => p.quantidade > 0).map(p => (
                            <option key={p.produto.id} value={p.produto.id}>{p.produto.nome} (saldo: {p.quantidade})</option>
                          ))}
                        </select>
                      </td>
                    )}

                    <td className="p-2 text-zinc-300 text-xs min-w-[120px]">{l.modelo || '—'}</td>
                    <td className="p-2 text-zinc-400 text-xs">{l.cor || '—'}</td>
                    <td className="p-2 text-zinc-400 text-xs">{l.ano || '—'}</td>

                    <td className="p-2 text-right">
                      {l.tipo === 'PECA' ? (
                        <input
                          type="number" min="1"
                          value={l.quantidade}
                          onChange={e => updateLinha(l.key, 'quantidade', Number(e.target.value))}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-16 text-right"
                        />
                      ) : (
                        <span className="text-zinc-500 text-xs">1</span>
                      )}
                    </td>

                    <td className="p-2 text-right">
                      {linhas.length > 1 && (
                        <button onClick={() => removerLinha(l.key)} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1 rounded hover:bg-red-500/10">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo + Confirmar */}
      {origemId && destinoId && (
        <div className="flex items-center justify-between bg-zinc-800/30 border border-zinc-700 rounded-xl px-4 py-3">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-400">Total de itens: </span>
            <span className="text-white font-bold">{linhas.filter(l => l.produtoId && (l.tipo === 'PECA' || l.chassi)).length}</span>
          </div>
          <div className="flex items-center gap-3">
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <button
              onClick={confirmar}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Processando...' : isAdmin ? '✓ Transferir Agora' : '📤 Solicitar Transferência'}
            </button>
          </div>
        </div>
      )}

      {/* Informativo */}
      <div className="text-xs text-zinc-600 space-y-0.5 px-1">
        {isAdmin ? (
          <p>✓ Como administrador, as transferências são concluídas imediatamente (estoque movimentado na hora).</p>
        ) : (
          <p>ℹ As solicitações precisam ser aprovadas pelo Financeiro antes de o estoque ser movimentado.</p>
        )}
      </div>
    </div>
  );
}
