import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface Loja    { id: number; nomeFantasia: string; }
interface Produto { id: number; nome: string; tipo: string; codigo: string; }
interface UnidadeDisp { id: number; chassi: string | null; cor: string | null; ano: number | null; status: string; produto: { id: number; nome: string; }; }

/* ── Entrada (MOTO): grade de chassis ───────────────────────────── */
interface ChassiRow { chassi: string; cor: string; ano: string; custo: string; }
const emptyRow = (): ChassiRow => ({ chassi: '', cor: '', ano: String(new Date().getFullYear()), custo: '' });

/* ── Saída: múltiplos itens ─────────────────────────────────────── */
interface SaidaItem { id: number; produtoId: string; chassis: UnidadeDisp[]; chassiSel: string; quantidade: string; }
let nextSaidaId = 1;
const emptySaidaItem = (): SaidaItem => ({ id: nextSaidaId++, produtoId: '', chassis: [], chassiSel: '', quantidade: '1' });

const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-full';
const sel = inp + ' cursor-pointer';

const MOTIVOS_SAIDA  = ['Perda / Sinistro', 'Roubo / Furto', 'Devolução ao Fornecedor', 'Demonstração', 'Outro'];
const MOTIVOS_AJUSTE = ['Contagem Física', 'Correção de Lançamento', 'Acerto de Inventário', 'Outro'];

type Operacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

const OP_CONFIG: Record<Operacao, { label: string; icon: string; activeCls: string; btnCls: string }> = {
  ENTRADA: { label: 'Entrada',  icon: '📦', activeCls: 'bg-green-500 text-white border-green-500',  btnCls: 'bg-green-500 hover:bg-green-600 text-white' },
  SAIDA:   { label: 'Saída',    icon: '📤', activeCls: 'bg-red-500 text-white border-red-500',       btnCls: 'bg-red-500 hover:bg-red-600 text-white' },
  AJUSTE:  { label: 'Ajuste',   icon: '⚙️', activeCls: 'bg-yellow-500 text-white border-yellow-500', btnCls: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
};

export function TabMovAvulsa({ lojas }: { lojas: Loja[] }) {
  const { user } = useAuth();

  const [operacao, setOperacao]     = useState<Operacao>('ENTRADA');
  const [lojaId, setLojaId]         = useState(String(user?.lojaId || ''));
  const [produtos, setProdutos]     = useState<Produto[]>([]);
  const [motivo, setMotivo]         = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving]         = useState(false);
  const [sucesso, setSucesso]       = useState('');
  const [erro, setErro]             = useState('');

  /* ── Estado ENTRADA ─────────────────────────────────────────────── */
  const [entProdutoId, setEntProdutoId] = useState('');
  const [entChassis, setEntChassis]     = useState<ChassiRow[]>([emptyRow()]);
  const [entQtd, setEntQtd]             = useState('1');

  /* ── Estado SAÍDA multi-linha ───────────────────────────────────── */
  const [saidaItems, setSaidaItems] = useState<SaidaItem[]>([emptySaidaItem()]);
  const loadingChassis = useRef<Record<number, boolean>>({});

  /* ── Estado AJUSTE (single) ─────────────────────────────────────── */
  const [adjProdutoId, setAdjProdutoId]   = useState('');
  const [adjProdutoSel, setAdjProdutoSel] = useState<Produto | null>(null);
  const [adjChassis, setAdjChassis]       = useState<UnidadeDisp[]>([]);
  const [adjChassiSel, setAdjChassiSel]   = useState('');
  const [adjQtd, setAdjQtd]              = useState('1');

  const isEntrada = operacao === 'ENTRADA';
  const isSaida   = operacao === 'SAIDA';
  const isAjuste  = operacao === 'AJUSTE';

  const entProdutoSel = produtos.find(p => String(p.id) === entProdutoId) || null;

  useEffect(() => {
    api.get<Produto[]>('/produtos?ativo=true')
      .then(lista => setProdutos(lista || []))
      .catch(() => setProdutos([]));
  }, []);

  /* ── Carregar chassis AJUSTE ─────────────────────────────────────── */
  useEffect(() => {
    const p = produtos.find(x => String(x.id) === adjProdutoId) || null;
    setAdjProdutoSel(p);
    setAdjChassis([]);
    setAdjChassiSel('');
    if (!p || p.tipo !== 'MOTO' || !lojaId || !adjProdutoId) return;
    api.get<{ unidades: UnidadeDisp[] }>(`/estoque/geral?lojaId=${lojaId}&statusUni=ESTOQUE`)
      .then(d => {
        const prod = Number(adjProdutoId);
        setAdjChassis((d?.unidades || []).filter(u => u.produto.id === prod && u.chassi));
      })
      .catch(() => setAdjChassis([]));
  }, [adjProdutoId, lojaId, produtos]);

  /* ── Carregar chassis por item de SAÍDA ─────────────────────────── */
  async function carregarChassisSaida(itemId: number, produtoId: string) {
    if (!lojaId || !produtoId || loadingChassis.current[itemId]) return;
    const prod = produtos.find(p => String(p.id) === produtoId);
    if (!prod || prod.tipo !== 'MOTO') return;
    loadingChassis.current[itemId] = true;
    try {
      const d = await api.get<{ unidades: UnidadeDisp[] }>(`/estoque/geral?lojaId=${lojaId}&statusUni=ESTOQUE`);
      const prodNum = Number(produtoId);
      const disponiveis = (d?.unidades || []).filter(u => u.produto.id === prodNum && u.chassi);
      setSaidaItems(prev => prev.map(si => si.id === itemId ? { ...si, chassis: disponiveis, chassiSel: '' } : si));
    } catch {
      setSaidaItems(prev => prev.map(si => si.id === itemId ? { ...si, chassis: [], chassiSel: '' } : si));
    } finally {
      loadingChassis.current[itemId] = false;
    }
  }

  /* ── Helpers de SAÍDA ────────────────────────────────────────────── */
  const addSaidaItem = () => setSaidaItems(prev => [...prev, emptySaidaItem()]);
  const removeSaidaItem = (id: number) => setSaidaItems(prev => prev.length > 1 ? prev.filter(si => si.id !== id) : prev);
  const updateSaidaItem = (id: number, field: keyof SaidaItem, value: string) => {
    setSaidaItems(prev => prev.map(si => {
      if (si.id !== id) return si;
      if (field === 'produtoId') {
        const updated = { ...si, produtoId: value, chassiSel: '', chassis: [], quantidade: '1' };
        carregarChassisSaida(id, value);
        return updated;
      }
      return { ...si, [field]: value };
    }));
  };

  /* ── Helpers ENTRADA ─────────────────────────────────────────────── */
  const addChassi    = () => setEntChassis(prev => [...prev, emptyRow()]);
  const removeChassi = (i: number) => setEntChassis(prev => prev.filter((_, idx) => idx !== i));
  const updChassi    = (i: number, field: keyof ChassiRow, v: string) =>
    setEntChassis(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: v } : r));

  function reset() {
    setEntProdutoId(''); setEntChassis([emptyRow()]); setEntQtd('1');
    setSaidaItems([emptySaidaItem()]);
    setAdjProdutoId(''); setAdjChassiSel(''); setAdjQtd('1');
    setMotivo(''); setMotivoCustom(''); setObservacao('');
    setErro(''); setSucesso('');
  }

  async function handleSubmit() {
    setErro(''); setSucesso('');
    if (!lojaId) return setErro('Selecione a loja');

    const motivoFinal = motivo === 'Outro' ? motivoCustom.trim() : motivo;
    if ((isSaida || isAjuste) && !motivoFinal) return setErro('Motivo é obrigatório');

    setSaving(true);
    try {
      if (isEntrada) {
        if (!entProdutoId) { setErro('Selecione o produto'); setSaving(false); return; }
        if (entProdutoSel?.tipo === 'MOTO') {
          if (entChassis.every(c => !c.chassi.trim())) { setErro('Informe ao menos um chassi'); setSaving(false); return; }
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(entProdutoId),
            lojaId: Number(lojaId),
            tipo: 'MOTO',
            chassis: entChassis.map(c => ({
              chassi: c.chassi.trim() || undefined,
              cor:    c.cor.trim() || undefined,
              ano:    c.ano ? Number(c.ano) : undefined,
              custo:  c.custo ? Number(c.custo.replace(',', '.')) : undefined,
            })),
            observacao: observacao || undefined,
          });
          setSucesso(`✓ ${entChassis.filter(c => c.chassi.trim()).length} chassi(s) cadastrado(s) com sucesso`);
        } else {
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(entProdutoId),
            lojaId: Number(lojaId),
            tipo: 'PECA',
            quantidade: Number(entQtd),
            observacao: observacao || undefined,
          });
          setSucesso(`✓ Entrada de ${entQtd} unidade(s) registrada`);
        }

      } else if (isSaida) {
        const itensValidos = saidaItems.filter(si => si.produtoId);
        if (itensValidos.length === 0) { setErro('Adicione pelo menos um item'); setSaving(false); return; }
        let erroItem = '';
        for (const si of itensValidos) {
          const prod = produtos.find(p => String(p.id) === si.produtoId);
          if (prod?.tipo === 'MOTO' && !si.chassiSel.trim()) {
            erroItem = `Selecione o chassi da moto "${prod.nome}"`;
            break;
          }
        }
        if (erroItem) { setErro(erroItem); setSaving(false); return; }

        let count = 0;
        for (const si of itensValidos) {
          const prod = produtos.find(p => String(p.id) === si.produtoId);
          await api.post('/estoque/saida-avulsa', {
            produtoId:  Number(si.produtoId),
            lojaId:     Number(lojaId),
            tipo:       prod?.tipo,
            quantidade: prod?.tipo === 'MOTO' ? 1 : Number(si.quantidade),
            chassi:     prod?.tipo === 'MOTO' ? si.chassiSel.trim() : undefined,
            motivo:     motivoFinal,
            observacao: observacao || undefined,
          });
          count++;
        }
        setSucesso(`✓ ${count} item(ns) de saída registrado(s) com sucesso`);

      } else {
        // AJUSTE
        if (!adjProdutoId) { setErro('Selecione o produto'); setSaving(false); return; }
        if (adjProdutoSel?.tipo === 'MOTO' && !adjChassiSel.trim()) { setErro('Informe o chassi'); setSaving(false); return; }
        await api.post('/estoque/saida-avulsa', {
          produtoId:  Number(adjProdutoId),
          lojaId:     Number(lojaId),
          tipo:       adjProdutoSel?.tipo,
          quantidade: adjProdutoSel?.tipo === 'MOTO' ? 1 : Number(adjQtd),
          chassi:     adjProdutoSel?.tipo === 'MOTO' ? adjChassiSel.trim() : undefined,
          motivo:     `[AJUSTE] ${motivoFinal}`,
          observacao: observacao || undefined,
        });
        setSucesso('✓ Ajuste registrado no histórico');
      }
      reset();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  const motivosOpts = isAjuste ? MOTIVOS_AJUSTE : MOTIVOS_SAIDA;
  const opConf = OP_CONFIG[operacao];

  const canSubmit = lojaId && (
    isEntrada ? !!entProdutoId :
    isSaida   ? saidaItems.some(si => si.produtoId) :
    !!adjProdutoId
  );

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Tipo de operação ─────────────────────────────────── */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Tipo de Movimentação</p>
        <div className="flex flex-wrap gap-2 bg-zinc-800/50 border border-zinc-700 rounded-xl p-1.5 w-fit">
          {(Object.entries(OP_CONFIG) as [Operacao, typeof OP_CONFIG[Operacao]][]).map(([op, conf]) => (
            <button
              key={op}
              onClick={() => { setOperacao(op); setMotivo(''); setErro(''); setSucesso(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                operacao === op ? conf.activeCls : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>
        {isAjuste && (
          <p className="text-xs text-yellow-600 mt-2 px-1">
            ⚙️ Ajuste manual — registra no histórico sem gerar movimentação financeira.
          </p>
        )}
      </div>

      {/* ── Loja ─────────────────────────────────────────────── */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">1 — Loja / Estoque</p>
        <select value={lojaId} onChange={e => setLojaId(e.target.value)} className={sel}>
          <option value="">Selecione a loja...</option>
          {lojas.map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
        </select>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── ENTRADA ────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isEntrada && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">2 — Produto e Dados da Entrada</p>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Produto / Modelo *</label>
            <select value={entProdutoId} onChange={e => { setEntProdutoId(e.target.value); setEntChassis([emptyRow()]); setEntQtd('1'); }} className={sel}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
            </select>
          </div>

          {entProdutoSel && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${entProdutoSel.tipo === 'MOTO' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                {entProdutoSel.tipo === 'MOTO' ? '🏍 MOTO' : '🔩 PEÇA'}
              </span>
              <span className="text-sm text-white font-medium">{entProdutoSel.nome}</span>
            </div>
          )}

          {entProdutoSel?.tipo === 'MOTO' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Chassis a cadastrar</label>
                <button onClick={addChassi} className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-400 px-2.5 py-1 rounded-lg transition-colors">
                  + Chassi
                </button>
              </div>
              {entChassis.map((row, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                  <div>
                    <label className="text-xs text-zinc-500 mb-0.5 block">Chassi *</label>
                    <input value={row.chassi} onChange={e => updChassi(i, 'chassi', e.target.value)} className={inp} placeholder="9C2JKD..." />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-0.5 block">Cor</label>
                    <input value={row.cor} onChange={e => updChassi(i, 'cor', e.target.value)} className={inp} placeholder="Preto" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-0.5 block">Ano</label>
                    <input type="number" value={row.ano} onChange={e => updChassi(i, 'ano', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-0.5 block">Custo (R$)</label>
                    <input value={row.custo} onChange={e => updChassi(i, 'custo', e.target.value)} className={inp} placeholder="0,00" />
                  </div>
                  {entChassis.length > 1 && (
                    <button onClick={() => removeChassi(i)} className="absolute top-1.5 right-2 text-red-400 hover:text-red-300 text-xs">✕</button>
                  )}
                </div>
              ))}
              <p className="text-xs text-zinc-600">{entChassis.length} chassi(s) a cadastrar</p>
            </div>
          )}

          {entProdutoSel?.tipo !== 'MOTO' && entProdutoSel && (
            <div className="w-32">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quantidade *</label>
              <input type="number" min="1" value={entQtd} onChange={e => setEntQtd(e.target.value)} className={inp} />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── SAÍDA MULTI-LINHA ──────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isSaida && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">2 — Itens de Saída</p>
            <button
              onClick={addSaidaItem}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors"
            >
              + Item
            </button>
          </div>

          <div className="space-y-3">
            {saidaItems.map((si, idx) => {
              const prod = produtos.find(p => String(p.id) === si.produtoId);
              const isMoto = prod?.tipo === 'MOTO';
              return (
                <div key={si.id} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
                  {/* Cabeçalho da linha */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium">Item {idx + 1}</span>
                    {saidaItems.length > 1 && (
                      <button onClick={() => removeSaidaItem(si.id)} className="text-red-400 hover:text-red-300 text-xs">✕ Remover</button>
                    )}
                  </div>

                  {/* Produto */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Produto / Modelo *</label>
                    <select
                      value={si.produtoId}
                      onChange={e => updateSaidaItem(si.id, 'produtoId', e.target.value)}
                      className={sel}
                    >
                      <option value="">Selecione...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
                    </select>
                  </div>

                  {/* Tipo badge + campos específicos */}
                  {prod && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${isMoto ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                        {isMoto ? '🏍 MOTO' : '🔩 PEÇA'}
                      </span>
                      <span className="text-xs text-zinc-300">{prod.nome}</span>
                    </div>
                  )}

                  {/* MOTO: chassi */}
                  {isMoto && si.produtoId && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Chassi da moto a retirar *</label>
                      {si.chassis.length > 0 ? (
                        <select
                          value={si.chassiSel}
                          onChange={e => updateSaidaItem(si.id, 'chassiSel', e.target.value)}
                          className={sel}
                        >
                          <option value="">Selecionar chassi disponível...</option>
                          {si.chassis.map(u => (
                            <option key={u.id} value={u.chassi!}>
                              {u.chassi}{u.cor ? ` · ${u.cor}` : ''}{u.ano ? ` (${u.ano})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={si.chassiSel}
                          onChange={e => updateSaidaItem(si.id, 'chassiSel', e.target.value)}
                          className={inp}
                          placeholder="Informe o chassi..."
                        />
                      )}
                      {si.chassis.length === 0 && lojaId && si.produtoId && (
                        <p className="text-xs text-yellow-600 mt-1">⚠ Nenhuma moto deste modelo em estoque nesta loja</p>
                      )}
                    </div>
                  )}

                  {/* PEÇA: quantidade */}
                  {!isMoto && prod && (
                    <div className="w-32">
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Quantidade *</label>
                      <input
                        type="number" min="1"
                        value={si.quantidade}
                        onChange={e => updateSaidaItem(si.id, 'quantidade', e.target.value)}
                        className={inp}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-zinc-600">{saidaItems.filter(si => si.produtoId).length} item(ns) preenchido(s)</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── AJUSTE ────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isAjuste && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">2 — Produto e Dados do Ajuste</p>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Produto / Modelo *</label>
            <select value={adjProdutoId} onChange={e => setAdjProdutoId(e.target.value)} className={sel}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
            </select>
          </div>

          {adjProdutoSel && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${adjProdutoSel.tipo === 'MOTO' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                {adjProdutoSel.tipo === 'MOTO' ? '🏍 MOTO' : '🔩 PEÇA'}
              </span>
              <span className="text-sm text-white font-medium">{adjProdutoSel.nome}</span>
            </div>
          )}

          {adjProdutoSel?.tipo === 'MOTO' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Chassi a ajustar *</label>
              {adjChassis.length > 0 ? (
                <select value={adjChassiSel} onChange={e => setAdjChassiSel(e.target.value)} className={sel}>
                  <option value="">Selecionar chassi disponível...</option>
                  {adjChassis.map(u => (
                    <option key={u.id} value={u.chassi!}>
                      {u.chassi}{u.cor ? ` · ${u.cor}` : ''}{u.ano ? ` (${u.ano})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={adjChassiSel} onChange={e => setAdjChassiSel(e.target.value)} className={inp} placeholder="Informe o chassi..." />
              )}
              {adjChassis.length === 0 && lojaId && adjProdutoId && (
                <p className="text-xs text-yellow-600 mt-1">⚠ Nenhuma moto deste modelo em estoque nesta loja</p>
              )}
            </div>
          )}

          {adjProdutoSel?.tipo !== 'MOTO' && adjProdutoSel && (
            <div className="w-32">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quantidade *</label>
              <input type="number" min="1" value={adjQtd} onChange={e => setAdjQtd(e.target.value)} className={inp} />
            </div>
          )}
        </div>
      )}

      {/* ── Motivo + Observação ─────────────────────────────────────── */}
      {(isSaida || isAjuste) && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
            3 — Motivo {isAjuste ? 'do Ajuste' : 'da Saída'} e Observação
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Motivo *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)} className={sel}>
              <option value="">Selecione o motivo...</option>
              {motivosOpts.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {motivo === 'Outro' && (
              <input
                value={motivoCustom}
                onChange={e => setMotivoCustom(e.target.value)}
                className={inp + ' mt-2'}
                placeholder="Descreva o motivo..."
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Observações para auditoria</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              className={inp + ' resize-none'}
              placeholder="Informações adicionais — aparecerão no histórico..."
            />
          </div>
        </div>
      )}

      {isEntrada && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">3 — Observação</p>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Observações para auditoria</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              className={inp + ' resize-none'}
              placeholder="Informações adicionais — aparecerão no histórico..."
            />
          </div>
        </div>
      )}

      {/* ── Feedback ─────────────────────────────────────────── */}
      {sucesso && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-green-400 text-sm">
          {sucesso}
        </div>
      )}
      {erro && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-red-400 text-sm">
          {erro}
        </div>
      )}

      {/* ── Ações ────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={reset}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
          className={`flex-1 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 ${opConf.btnCls}`}
        >
          {saving
            ? 'Registrando...'
            : isEntrada
              ? '✓ Registrar Entrada'
              : isAjuste
                ? '⚙️ Registrar Ajuste'
                : `✓ Registrar Saída (${saidaItems.filter(si => si.produtoId).length} item${saidaItems.filter(si => si.produtoId).length !== 1 ? 's' : ''})`
          }
        </button>
      </div>
    </div>
  );
}
