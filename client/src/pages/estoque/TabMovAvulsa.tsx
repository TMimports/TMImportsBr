import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface Loja    { id: number; nomeFantasia: string; }
interface Produto { id: number; nome: string; tipo: string; codigo: string; }
interface UnidadeDisp { id: number; chassi: string | null; cor: string | null; ano: number | null; status: string; produto: { id: number; nome: string; }; }

interface ChassiRow { chassi: string; cor: string; ano: string; custo: string; }
const emptyRow = (): ChassiRow => ({ chassi: '', cor: '', ano: String(new Date().getFullYear()), custo: '' });

const inp = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-full';
const sel = inp + ' cursor-pointer';

const MOTIVOS_SAIDA  = ['Perda / Sinistro', 'Roubo / Furto', 'Devolução ao Fornecedor', 'Demonstração', 'Outro'];
const MOTIVOS_AJUSTE = ['Contagem Física', 'Correção de Lançamento', 'Acerto de Inventário', 'Outro'];

type Operacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

const OP_CONFIG: Record<Operacao, { label: string; icon: string; cor: string; activeCls: string; btnCls: string }> = {
  ENTRADA: { label: 'Entrada',  icon: '📦', cor: 'green',  activeCls: 'bg-green-500 text-white border-green-500',  btnCls: 'bg-green-500 hover:bg-green-600 text-white' },
  SAIDA:   { label: 'Saída',    icon: '📤', cor: 'red',    activeCls: 'bg-red-500 text-white border-red-500',       btnCls: 'bg-red-500 hover:bg-red-600 text-white' },
  AJUSTE:  { label: 'Ajuste',   icon: '⚙️', cor: 'yellow', activeCls: 'bg-yellow-500 text-white border-yellow-500', btnCls: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
};

export function TabMovAvulsa({ lojas }: { lojas: Loja[] }) {
  const { user }      = useAuth();
  const [operacao, setOperacao]   = useState<Operacao>('ENTRADA');
  const [lojaId, setLojaId]       = useState(String(user?.lojaId || ''));
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [produtoSel, setProdutoSel] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [chassis, setChassis]     = useState<ChassiRow[]>([emptyRow()]);
  const [chassiSaida, setChassiSaida] = useState('');
  const [chassisDisp, setChassisDisp] = useState<UnidadeDisp[]>([]);
  const [motivo, setMotivo]       = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving]       = useState(false);
  const [sucesso, setSucesso]     = useState('');
  const [erro, setErro]           = useState('');

  const isMoto     = produtoSel?.tipo === 'MOTO';
  const isEntrada  = operacao === 'ENTRADA';
  const isSaida    = operacao === 'SAIDA';
  const isAjuste   = operacao === 'AJUSTE';
  const needMotivo = isSaida || isAjuste;

  useEffect(() => {
    api.get<Produto[]>('/produtos?ativo=true')
      .then(lista => setProdutos(lista || []))
      .catch(() => setProdutos([]));
  }, []);

  useEffect(() => {
    const p = produtos.find(x => String(x.id) === produtoId) || null;
    setProdutoSel(p);
    setChassis([emptyRow()]);
    setChassiSaida('');
    setQuantidade('1');
    setChassisDisp([]);
  }, [produtoId, produtos]);

  // Para SAIDA/AJUSTE de moto: buscar chassis disponíveis na loja
  useEffect(() => {
    if (!isMoto || isEntrada || !lojaId || !produtoId) { setChassisDisp([]); return; }
    api.get<{ unidades: UnidadeDisp[] }>(`/estoque/geral?lojaId=${lojaId}&statusUni=ESTOQUE`)
      .then(d => {
        const prod = Number(produtoId);
        setChassisDisp((d?.unidades || []).filter(u => u.produto.id === prod && u.chassi));
      })
      .catch(() => setChassisDisp([]));
  }, [isMoto, isEntrada, lojaId, produtoId]);

  const addChassi    = () => setChassis(prev => [...prev, emptyRow()]);
  const removeChassi = (i: number) => setChassis(prev => prev.filter((_, idx) => idx !== i));
  const updChassi    = (i: number, field: keyof ChassiRow, v: string) =>
    setChassis(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: v } : r));

  function reset() {
    setProdutoId(''); setChassis([emptyRow()]); setChassiSaida('');
    setQuantidade('1'); setMotivo(''); setMotivoCustom(''); setObservacao('');
    setErro(''); setSucesso('');
  }

  async function handleSubmit() {
    setErro(''); setSucesso('');
    if (!produtoId) return setErro('Selecione o produto');
    if (!lojaId)    return setErro('Selecione a loja');

    const motivoFinal = motivo === 'Outro' ? motivoCustom.trim() : motivo;
    if (needMotivo && !motivoFinal) return setErro('Motivo é obrigatório');
    if (isEntrada && isMoto && chassis.every(c => !c.chassi.trim())) return setErro('Informe ao menos um chassi');
    if (!isEntrada && isMoto && !chassiSaida.trim()) return setErro('Informe o chassi');

    setSaving(true);
    try {
      if (isEntrada) {
        if (isMoto) {
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(produtoId),
            lojaId:    Number(lojaId),
            tipo:      'MOTO',
            chassis:   chassis.map(c => ({
              chassi: c.chassi.trim() || undefined,
              cor:    c.cor.trim() || undefined,
              ano:    c.ano ? Number(c.ano) : undefined,
              custo:  c.custo ? Number(c.custo.replace(',', '.')) : undefined,
            })),
            observacao: observacao || undefined,
          });
          setSucesso(`✓ ${chassis.filter(c => c.chassi.trim()).length} chassi(s) cadastrado(s) com sucesso`);
        } else {
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(produtoId),
            lojaId:    Number(lojaId),
            tipo:      'PECA',
            quantidade: Number(quantidade),
            observacao: observacao || undefined,
          });
          setSucesso(`✓ Entrada de ${quantidade} unidade(s) registrada`);
        }
      } else {
        await api.post('/estoque/saida-avulsa', {
          produtoId:  Number(produtoId),
          lojaId:     Number(lojaId),
          tipo:       produtoSel?.tipo,
          quantidade: isMoto ? 1 : Number(quantidade),
          chassi:     isMoto ? chassiSaida.trim() : undefined,
          motivo:     isAjuste ? `[AJUSTE] ${motivoFinal}` : motivoFinal,
          observacao: observacao || undefined,
        });
        setSucesso(isAjuste ? '✓ Ajuste registrado no histórico' : '✓ Saída registrada com sucesso');
      }
      reset();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  const motivosOpts = isAjuste
    ? MOTIVOS_AJUSTE
    : isMoto ? MOTIVOS_SAIDA : [...MOTIVOS_SAIDA, 'Ajuste de Inventário'];

  const opConf = OP_CONFIG[operacao];

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Tipo de operação ────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Tipo de Movimentação</p>
        <div className="flex gap-2 bg-zinc-800/50 border border-zinc-700 rounded-xl p-1.5 w-fit">
          {(Object.entries(OP_CONFIG) as [Operacao, typeof OP_CONFIG[Operacao]][]).map(([op, conf]) => (
            <button
              key={op}
              onClick={() => { setOperacao(op); setMotivo(''); setErro(''); setSucesso(''); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                operacao === op ? conf.activeCls : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>
        {isAjuste && (
          <p className="text-xs text-yellow-600 mt-2 px-1">
            ⚙️ Ajuste manual — registra no histórico sem gerar movimentação financeira. Motivo obrigatório para auditoria.
          </p>
        )}
      </div>

      {/* ── Loja + Produto ──────────────────────────────────────────────────────── */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-3">
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">1 — Selecionar Loja e Produto</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Loja / Estoque *</label>
            <select value={lojaId} onChange={e => setLojaId(e.target.value)} className={sel}>
              <option value="">Selecione...</option>
              {lojas.map(l => <option key={l.id} value={l.id}>[{l.id}] {l.nomeFantasia}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Produto / Modelo *</label>
            <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className={sel}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Dados do Item ───────────────────────────────────────────────────────── */}
      {produtoSel && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
            2 — {isEntrada ? 'Dados da Entrada' : isAjuste ? 'Dados do Ajuste' : 'Dados da Saída'}
          </p>

          {/* Badge do produto selecionado */}
          <div className="flex items-center gap-2 -mt-1">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${isMoto ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
              {isMoto ? '🏍 MOTO' : '🔩 PEÇA'}
            </span>
            <span className="text-sm text-white font-medium">{produtoSel.nome}</span>
          </div>

          {/* MOTO + ENTRADA: grade de chassis */}
          {isMoto && isEntrada && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Chassis a cadastrar</label>
                <button onClick={addChassi} className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-400 px-2.5 py-1 rounded-lg transition-colors">
                  + Chassi
                </button>
              </div>
              {chassis.map((row, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 grid grid-cols-4 gap-2 relative">
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
                  {chassis.length > 1 && (
                    <button onClick={() => removeChassi(i)} className="absolute top-1.5 right-2 text-red-400 hover:text-red-300 text-xs">✕</button>
                  )}
                </div>
              ))}
              <p className="text-xs text-zinc-600">{chassis.length} chassi(s) a cadastrar</p>
            </div>
          )}

          {/* MOTO + SAIDA/AJUSTE: dropdown dos chassis disponíveis */}
          {isMoto && !isEntrada && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Chassi da moto a {isAjuste ? 'ajustar' : 'retirar'} *
              </label>
              {chassisDisp.length > 0 ? (
                <select value={chassiSaida} onChange={e => setChassiSaida(e.target.value)} className={sel}>
                  <option value="">Selecionar chassi disponível...</option>
                  {chassisDisp.map(u => (
                    <option key={u.id} value={u.chassi!}>
                      {u.chassi}{u.cor ? ` · ${u.cor}` : ''}{u.ano ? ` (${u.ano})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={chassiSaida}
                  onChange={e => setChassiSaida(e.target.value)}
                  className={inp}
                  placeholder="Informe o chassi..."
                />
              )}
              {chassisDisp.length > 0 && (
                <p className="text-xs text-zinc-600 mt-1">{chassisDisp.length} moto(s) disponível(is) nesta loja</p>
              )}
              {chassisDisp.length === 0 && lojaId && produtoId && (
                <p className="text-xs text-yellow-600 mt-1">⚠ Nenhuma moto deste modelo em estoque nesta loja</p>
              )}
            </div>
          )}

          {/* PEÇA: quantidade */}
          {!isMoto && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Quantidade *</label>
              <input
                type="number" min="1"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                className={inp}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Motivo + Observação ─────────────────────────────────────────────────── */}
      {produtoSel && (
        <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
            3 — {needMotivo ? 'Motivo e Observação' : 'Observação'}
          </p>

          {needMotivo && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Motivo {isAjuste ? 'do ajuste' : 'da saída'} *
              </label>
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
          )}

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

      {/* ── Feedback ────────────────────────────────────────────────────────────── */}
      {sucesso && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <span>{sucesso}</span>
        </div>
      )}
      {erro && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-red-400 text-sm">
          {erro}
        </div>
      )}

      {/* ── Ações ───────────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={reset}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !produtoId || !lojaId}
          className={`flex-1 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 ${opConf.btnCls}`}
        >
          {saving
            ? 'Registrando...'
            : isEntrada
              ? '✓ Registrar Entrada'
              : isAjuste
                ? '⚙️ Registrar Ajuste'
                : '✓ Registrar Saída'
          }
        </button>
      </div>
    </div>
  );
}
