import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface Loja    { id: number; nomeFantasia: string; }
interface Produto { id: number; nome: string; tipo: string; codigo: string; }

interface ChassiRow { chassi: string; cor: string; ano: string; custo: string; }

const emptyRow = (): ChassiRow => ({ chassi: '', cor: '', ano: String(new Date().getFullYear()), custo: '' });

const inp  = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-full';
const sel  = inp + ' cursor-pointer';

const MOTIVOS_SAIDA  = ['Perda / Sinistro', 'Roubo / Furto', 'Devolução ao Fornecedor', 'Demonstração', 'Ajuste de Inventário', 'Outro'];
const MOTIVOS_AJUSTE = ['Contagem Física', 'Correção de Lançamento', 'Outro'];

export function TabMovAvulsa({ lojas }: { lojas: Loja[] }) {
  const { user }    = useAuth();
  const [operacao, setOperacao]   = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [lojaId, setLojaId]       = useState(String(user?.lojaId || ''));
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [produtoSel, setProdutoSel] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [chassis, setChassis]     = useState<ChassiRow[]>([emptyRow()]);
  const [chassiSaida, setChassiSaida] = useState('');
  const [motivo, setMotivo]       = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving]       = useState(false);
  const [sucesso, setSucesso]     = useState('');
  const [erro, setErro]           = useState('');

  const isMoto = produtoSel?.tipo === 'MOTO';

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
  }, [produtoId, produtos]);

  const addChassi    = () => setChassis(prev => [...prev, emptyRow()]);
  const removeChassi = (i: number) => setChassis(prev => prev.filter((_, idx) => idx !== i));
  const updChassi    = (i: number, field: keyof ChassiRow, v: string) =>
    setChassis(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: v } : r));

  async function handleSubmit() {
    setErro(''); setSucesso('');
    if (!produtoId) return setErro('Selecione o produto');
    if (!lojaId)    return setErro('Selecione a loja');

    const motivoFinal = motivo === 'Outro' ? motivoCustom.trim() : motivo;

    if (operacao === 'SAIDA' && !motivoFinal) return setErro('Informe o motivo da saída');
    if (operacao === 'ENTRADA' && isMoto && chassis.every(c => !c.chassi.trim())) return setErro('Informe ao menos um chassi');
    if (operacao === 'SAIDA' && isMoto && !chassiSaida.trim()) return setErro('Informe o chassi para saída');

    setSaving(true);
    try {
      if (operacao === 'ENTRADA') {
        if (isMoto) {
          const chassisData = chassis.map(c => ({
            chassi: c.chassi.trim() || undefined,
            cor: c.cor.trim() || undefined,
            ano: c.ano ? Number(c.ano) : undefined,
            custo: c.custo ? Number(c.custo.replace(',', '.')) : undefined,
          }));
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(produtoId),
            lojaId: Number(lojaId),
            tipo: 'MOTO',
            chassis: chassisData,
            observacao,
          });
          setSucesso(`✓ ${chassis.length} chassi(s) cadastrado(s) com sucesso`);
        } else {
          await api.post('/estoque/entrada-avulsa', {
            produtoId: Number(produtoId),
            lojaId: Number(lojaId),
            tipo: 'PECA',
            quantidade: Number(quantidade),
            observacao,
          });
          setSucesso(`✓ Entrada de ${quantidade} unidade(s) registrada`);
        }
      } else {
        await api.post('/estoque/saida-avulsa', {
          produtoId: Number(produtoId),
          lojaId: Number(lojaId),
          tipo: produtoSel?.tipo,
          quantidade: isMoto ? 1 : Number(quantidade),
          chassi: isMoto ? chassiSaida.trim() : undefined,
          motivo: motivoFinal,
          observacao,
        });
        setSucesso(`✓ Saída registrada com sucesso`);
      }

      // Reset form
      setProdutoId('');
      setChassis([emptyRow()]);
      setChassiSaida('');
      setQuantidade('1');
      setMotivo('');
      setMotivoCustom('');
      setObservacao('');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  const motivosOpts = operacao === 'SAIDA'
    ? (isMoto ? MOTIVOS_SAIDA : [...MOTIVOS_SAIDA, ...MOTIVOS_AJUSTE])
    : [];

  return (
    <div className="max-w-2xl space-y-5">
      {/* Tipo de operação */}
      <div className="flex gap-2 bg-zinc-800/50 rounded-xl p-1.5 w-fit">
        {(['ENTRADA', 'SAIDA'] as const).map(op => (
          <button
            key={op}
            onClick={() => { setOperacao(op); setErro(''); setSucesso(''); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              operacao === op
                ? op === 'ENTRADA' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {op === 'ENTRADA' ? '📦 Entrada' : '📤 Saída'}
          </button>
        ))}
      </div>

      {/* Loja + Produto */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Loja / Estoque *</label>
          <select value={lojaId} onChange={e => setLojaId(e.target.value)} className={sel}>
            <option value="">Selecione a loja...</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Produto / Modelo *</label>
          <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className={sel}>
            <option value="">Selecione o produto...</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
          </select>
        </div>
      </div>

      {/* MOTO + ENTRADA: lista de chassi */}
      {produtoSel && isMoto && operacao === 'ENTRADA' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Chassis a cadastrar</label>
            <button onClick={addChassi} className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 px-2 py-1 rounded">+ Chassi</button>
          </div>
          {chassis.map((row, i) => (
            <div key={i} className="bg-zinc-800/50 rounded-lg p-3 grid grid-cols-4 gap-2 relative">
              <div><label className="text-xs text-zinc-400 mb-0.5 block">Chassi</label><input value={row.chassi} onChange={e => updChassi(i, 'chassi', e.target.value)} className={inp} placeholder="9C2..." /></div>
              <div><label className="text-xs text-zinc-400 mb-0.5 block">Cor</label><input value={row.cor} onChange={e => updChassi(i, 'cor', e.target.value)} className={inp} placeholder="Preto" /></div>
              <div><label className="text-xs text-zinc-400 mb-0.5 block">Ano</label><input type="number" value={row.ano} onChange={e => updChassi(i, 'ano', e.target.value)} className={inp} /></div>
              <div><label className="text-xs text-zinc-400 mb-0.5 block">Custo (R$)</label><input value={row.custo} onChange={e => updChassi(i, 'custo', e.target.value)} className={inp} placeholder="0,00" /></div>
              {chassis.length > 1 && <button onClick={() => removeChassi(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xs">✕</button>}
            </div>
          ))}
        </div>
      )}

      {/* MOTO + SAIDA: chassi para baixar */}
      {produtoSel && isMoto && operacao === 'SAIDA' && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Chassi *</label>
          <input value={chassiSaida} onChange={e => setChassiSaida(e.target.value)} className={inp} placeholder="Informe o chassi da moto a retirar..." />
        </div>
      )}

      {/* PECA: quantidade */}
      {produtoSel && !isMoto && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Quantidade *</label>
          <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} className={inp} />
        </div>
      )}

      {/* Motivo (apenas para SAIDA) */}
      {operacao === 'SAIDA' && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Motivo da saída *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)} className={sel}>
              <option value="">Selecione o motivo...</option>
              {motivosOpts.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {motivo === 'Outro' && (
            <input value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)} className={inp} placeholder="Descreva o motivo..." />
          )}
        </div>
      )}

      {/* Observação */}
      {produtoSel && (
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Informações adicionais..." />
        </div>
      )}

      {sucesso && <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-green-400 text-sm">{sucesso}</div>}
      {erro    && <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-red-400 text-sm">{erro}</div>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => { setProdutoId(''); setChassis([emptyRow()]); setChassiSaida(''); setQuantidade('1'); setMotivo(''); setObservacao(''); setErro(''); setSucesso(''); }}
          className="bg-zinc-700 hover:bg-zinc-600 text-white px-5 py-2.5 rounded-lg text-sm"
        >
          Limpar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !produtoId || !lojaId}
          className={`flex-1 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 ${operacao === 'ENTRADA' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
        >
          {saving ? 'Registrando...' : operacao === 'ENTRADA' ? '✓ Registrar Entrada' : '✓ Registrar Saída'}
        </button>
      </div>
    </div>
  );
}
