import { useState, useEffect, useCallback } from 'react';
import { useLojaContext } from '../contexts/LojaContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';


interface Produto { id: number; nome: string; tipo: string; codigo: string; custo?: number; }
interface Item { produtoId: number; produto?: Produto; quantidade: number; valorUnitario: number; valorTotal: number; }
interface PedidoCompra {
  id: number;
  lojaId: number;
  loja: { id: number; nomeFantasia: string; cnpj: string; };
  fornecedor: string;
  numero?: string;
  status: 'PENDENTE' | 'APROVADO' | 'CONFIRMADO' | 'CANCELADO';
  previsaoEntrega?: string;
  observacoes?: string;
  valorTotal: number;
  metodoPagamento?: string;
  dataPagamento?: string;
  numeroParcelas?: number;
  confirmedAt?: string;
  confirmadoPor?: { id: number; nome: string; };
  itens: Array<Item & { id: number; }>;
  createdAt: string;
}
interface Loja { id: number; nomeFantasia: string; cnpj: string; }
interface Fornecedor { id: number; razaoSocial: string; nomeFantasia?: string; cnpj?: string; cpf?: string; }

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente', APROVADO: 'Aprovado', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado'
};
const STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDENTE: 'warning', APROVADO: 'info', CONFIRMADO: 'success', CANCELADO: 'danger'
};

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('pt-BR') : '-';

function ModalPedido({ lojas, produtos, onSave, onClose }: {
  lojas: Loja[]; produtos: Produto[];
  onSave: (data: any) => Promise<void>; onClose: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    lojaId: user?.lojaId ? String(user.lojaId) : '',
    previsaoEntrega: '', observacoes: '',
    metodoPagamento: '', dataPagamento: '', numeroParcelas: '1',
    categoriaId: '', departamentoId: '',
  });
  const [itens, setItens] = useState<Array<{ produtoId: string; quantidade: string; valorUnitario: string; }>>([
    { produtoId: '', quantidade: '1', valorUnitario: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [categorias, setCategorias] = useState<{ id: number; nome: string; natureza?: string }[]>([]);
  const [departamentos, setDepartamentos] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    api.get<{ id: number; nome: string; natureza?: string }[]>('/categorias-financeiras')
      .then(d => setCategorias(Array.isArray(d) ? d.filter(c => c.natureza !== 'RECEITA') : []))
      .catch(() => {});
    api.get<{ id: number; nome: string }[]>('/departamentos').then(d => setDepartamentos(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const [showQuickFornecedor, setShowQuickFornecedor] = useState(false);
  const [quickFornecedor, setQuickFornecedor] = useState({ razaoSocial: '', nomeFantasia: '', cnpj: '', telefone: '' });
  const [quickFornecedorLoading, setQuickFornecedorLoading] = useState(false);

  const criarFornecedorRapido = async () => {
    if (!quickFornecedor.razaoSocial.trim()) return;
    setQuickFornecedorLoading(true);
    try {
      const novo = await api.post<Fornecedor>('/fornecedores', {
        razaoSocial: quickFornecedor.razaoSocial.trim(),
        nomeFantasia: quickFornecedor.nomeFantasia || undefined,
        cnpj: quickFornecedor.cnpj || undefined,
        telefone: quickFornecedor.telefone || undefined,
        lojaId: form.lojaId ? Number(form.lojaId) : undefined,
      });
      setFornecedores(prev => [...prev, novo]);
      selecionarFornecedor(novo);
      setShowQuickFornecedor(false);
      setQuickFornecedor({ razaoSocial: '', nomeFantasia: '', cnpj: '', telefone: '' });
    } catch (e: any) {
      alert(e.message || 'Erro ao criar fornecedor');
    } finally {
      setQuickFornecedorLoading(false);
    }
  };

  // Fornecedor search state
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);

  useEffect(() => {
    api.get<Fornecedor[]>('/fornecedores').then(data => setFornecedores(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const fornecedoresFiltrados = fornecedores.filter(f => {
    const q = buscaFornecedor.toLowerCase();
    return f.razaoSocial.toLowerCase().includes(q) ||
      (f.nomeFantasia ?? '').toLowerCase().includes(q) ||
      (f.cnpj ?? '').includes(q);
  }).slice(0, 10);

  const selecionarFornecedor = (f: Fornecedor) => {
    setFornecedorSelecionado(f);
    setBuscaFornecedor(f.nomeFantasia || f.razaoSocial);
    setShowFornecedorDropdown(false);
  };

  const addItem = () => setItens(p => [...p, { produtoId: '', quantidade: '1', valorUnitario: '' }]);
  const removeItem = (i: number) => setItens(p => p.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: string, val: string) => {
    setItens(p => {
      const n = [...p];
      n[i] = { ...n[i], [field]: val };
      if (field === 'produtoId') {
        const prod = produtos.find(p => p.id === Number(val));
        if (prod?.custo) n[i].valorUnitario = String(prod.custo);
      }
      return n;
    });
  };

  const totalGeral = itens.reduce((s, it) => {
    return s + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0);
  }, 0);

  const handleSubmit = async () => {
    if (!form.lojaId) { setErro('Selecione a loja'); return; }
    if (!fornecedorSelecionado) { setErro('Selecione um fornecedor cadastrado'); return; }
    for (const it of itens) {
      if (!it.produtoId || !it.quantidade || !it.valorUnitario) { setErro('Preencha todos os itens corretamente'); return; }
    }
    setLoading(true); setErro('');
    try {
      await onSave({
        lojaId: Number(form.lojaId),
        fornecedor: fornecedorSelecionado.nomeFantasia || fornecedorSelecionado.razaoSocial,
        previsaoEntrega: form.previsaoEntrega || undefined,
        observacoes: form.observacoes || undefined,
        metodoPagamento: form.metodoPagamento || undefined,
        dataPagamento: form.dataPagamento || undefined,
        numeroParcelas: form.numeroParcelas ? Number(form.numeroParcelas) : 1,
        categoriaId: form.categoriaId ? Number(form.categoriaId) : undefined,
        departamentoId: form.departamentoId ? Number(form.departamentoId) : undefined,
        itens: itens.map(it => ({
          produtoId: Number(it.produtoId),
          quantidade: Number(it.quantidade),
          valorUnitario: Number(it.valorUnitario),
        })),
      });
    } catch (e: any) { setErro(e.message || 'Erro ao salvar'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#27272a] flex items-center justify-between sticky top-0 bg-[#18181b] z-10">
          <h2 className="text-lg font-bold text-white">Novo Pedido de Compra</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {erro && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">{erro}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Empresa / Loja *"
              value={form.lojaId} onChange={e => setForm(p => ({ ...p, lojaId: e.target.value }))}>
              <option value="">Selecione a loja...</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia} — {l.cnpj}</option>)}
            </Select>

            {/* Fornecedor — busca com dropdown */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-400">Fornecedor *</label>
                <button type="button" onClick={() => setShowQuickFornecedor(true)} className="text-xs text-orange-400 hover:text-orange-300 font-medium">+ Novo Fornecedor</button>
              </div>
              <div className={`flex items-center gap-2 bg-[#09090b] border rounded-lg px-3 h-10 ${fornecedorSelecionado ? 'border-green-500/50' : 'border-[#27272a]'}`}>
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-500"
                  placeholder="Buscar fornecedor..."
                  value={buscaFornecedor}
                  onChange={e => {
                    setBuscaFornecedor(e.target.value);
                    setFornecedorSelecionado(null);
                    setShowFornecedorDropdown(true);
                  }}
                  onFocus={() => setShowFornecedorDropdown(true)}
                  onKeyDown={e => { if (e.key === 'Escape') setShowFornecedorDropdown(false); }}
                />
                {fornecedorSelecionado && <span className="text-green-500 text-xs">✓</span>}
              </div>
              {showFornecedorDropdown && buscaFornecedor.length >= 1 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {fornecedoresFiltrados.length === 0
                    ? <div className="px-3 py-2 text-xs text-zinc-500">Nenhum fornecedor encontrado. Cadastre-o primeiro.</div>
                    : fornecedoresFiltrados.map(f => (
                      <button key={f.id} type="button"
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700/60 transition-colors"
                        onMouseDown={() => selecionarFornecedor(f)}>
                        <div className="text-sm text-white">{f.nomeFantasia || f.razaoSocial}</div>
                        {f.nomeFantasia && <div className="text-xs text-zinc-400">{f.razaoSocial}</div>}
                        {(f.cnpj || f.cpf) && <div className="text-xs text-zinc-500">{f.cnpj || f.cpf}</div>}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Previsão de Entrega" type="date" value={form.previsaoEntrega}
              onChange={e => setForm(p => ({ ...p, previsaoEntrega: e.target.value }))} />
            <Input label="Observações" value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações opcionais" />
          </div>

          <div className="border-t border-[#27272a] pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Condições de Pagamento</p>
            <p className="text-xs text-zinc-500 mb-3">Será gerado um Contas a Pagar ao confirmar o pedido, com base nas condições abaixo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Método de Pagamento" value={form.metodoPagamento}
                onChange={e => setForm(p => ({ ...p, metodoPagamento: e.target.value }))}>
                <option value="">Não especificado</option>
                <option value="DINHEIRO">Dinheiro / À Vista</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="FINANCIAMENTO">Financiamento</option>
              </Select>
              <Input label="Data 1ª Parcela / Vencimento" type="date" value={form.dataPagamento}
                onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))} />
              <Input label="Nº de Parcelas" type="number" min="1" max="60" value={form.numeroParcelas}
                onChange={e => setForm(p => ({ ...p, numeroParcelas: e.target.value }))} placeholder="1" />
            </div>
          </div>

          <div className="border-t border-[#27272a] pt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Classificação Financeira</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Categoria" value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
              <Select label="Departamento" value={form.departamentoId} onChange={e => setForm(p => ({ ...p, departamentoId: e.target.value }))}>
                <option value="">Sem departamento</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-zinc-300">Itens do Pedido</span>
              <Button variant="secondary" onClick={addItem} className="text-xs py-1 px-3">+ Adicionar Item</Button>
            </div>
            <div className="space-y-2">
              {itens.map((it, i) => (
                <div key={i} className="bg-[#09090b] border border-[#27272a] rounded-lg p-3">
                  <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-end">
                    <div className="sm:col-span-5">
                      <Select label="Produto"
                        value={it.produtoId} onChange={e => updateItem(i, 'produtoId', e.target.value)}>
                        <option value="">Selecione...</option>
                        {produtos.map(p => <option key={p.id} value={p.id}>[{p.tipo}] {p.nome}</option>)}
                      </Select>
                    </div>
                    <div className="flex gap-2 sm:contents">
                      <div className="flex-1 sm:col-span-2">
                        <Input label="Qtd" type="number" min="1"
                          value={it.quantidade} onChange={e => updateItem(i, 'quantidade', e.target.value)} />
                      </div>
                      <div className="flex-1 sm:col-span-3">
                        <Input label="Custo Unit. (R$)" type="number" step="0.01"
                          value={it.valorUnitario} onChange={e => updateItem(i, 'valorUnitario', e.target.value)} />
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-start sm:items-end gap-2 sm:pb-1">
                      <span className="text-xs text-zinc-400 whitespace-nowrap">
                        {fmtBRL((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0))}
                      </span>
                      {itens.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">×</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <span className="text-sm text-zinc-400">Total: <strong className="text-orange-500 text-base">{fmtBRL(totalGeral)}</strong></span>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[#27272a] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Criar Pedido'}
          </Button>
        </div>
      </div>

      {showQuickFornecedor && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowQuickFornecedor(false); }}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-md">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="font-bold text-white">Novo Fornecedor</h3>
              <button onClick={() => setShowQuickFornecedor(false)} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Razão Social *</label>
                <input autoFocus type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickFornecedor.razaoSocial} onChange={e => setQuickFornecedor(p => ({ ...p, razaoSocial: e.target.value }))} placeholder="Razão social" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nome Fantasia</label>
                <input type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickFornecedor.nomeFantasia} onChange={e => setQuickFornecedor(p => ({ ...p, nomeFantasia: e.target.value }))} placeholder="Opcional" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">CNPJ</label>
                <input type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickFornecedor.cnpj} onChange={e => setQuickFornecedor(p => ({ ...p, cnpj: e.target.value }))} placeholder="Opcional" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Telefone</label>
                <input type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickFornecedor.telefone} onChange={e => setQuickFornecedor(p => ({ ...p, telefone: e.target.value }))} placeholder="Opcional" onKeyDown={e => e.key === 'Enter' && criarFornecedorRapido()} />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3 justify-end">
              <button onClick={() => setShowQuickFornecedor(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={criarFornecedorRapido} disabled={!quickFornecedor.razaoSocial.trim() || quickFornecedorLoading} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium transition-colors">
                {quickFornecedorLoading ? 'Salvando...' : 'Salvar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalhesPedido({ pedido, onClose, onAction, role }: {
  pedido: PedidoCompra; onClose: () => void;
  onAction: (id: number, acao: string) => Promise<void>; role: string;
}) {
  const [loading, setLoading] = useState('');

  const handleAction = async (acao: string) => {
    setLoading(acao);
    try { await onAction(pedido.id, acao); } finally { setLoading(''); }
  };

  const canAprovar = pedido.status === 'PENDENTE' && ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA'].includes(role);
  const canConfirmar = ['PENDENTE', 'APROVADO'].includes(pedido.status) && ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA', 'GERENTE_LOJA'].includes(role);
  const canCancelar = pedido.status !== 'CONFIRMADO' && pedido.status !== 'CANCELADO' && ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA'].includes(role);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#27272a] flex items-center justify-between sticky top-0 bg-[#18181b] z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Pedido #{pedido.id}</h2>
            <p className="text-xs text-zinc-400">{pedido.loja.nomeFantasia} — {pedido.loja.cnpj}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_COLOR[pedido.status]}>{STATUS_LABEL[pedido.status]}</Badge>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">×</button>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-zinc-400">Fornecedor</span><p className="text-white font-medium mt-0.5">{pedido.fornecedor}</p></div>
            <div><span className="text-zinc-400">Número</span><p className="text-white font-medium mt-0.5">{pedido.numero || '—'}</p></div>
            <div><span className="text-zinc-400">Previsão de Entrega</span><p className="text-white font-medium mt-0.5">{fmtDate(pedido.previsaoEntrega)}</p></div>
            <div><span className="text-zinc-400">Criado em</span><p className="text-white font-medium mt-0.5">{fmtDate(pedido.createdAt)}</p></div>
            {pedido.metodoPagamento && (
              <div><span className="text-zinc-400">Método de Pagamento</span><p className="text-white font-medium mt-0.5">{pedido.metodoPagamento.replace('_', ' ')}</p></div>
            )}
            {pedido.dataPagamento && (
              <div><span className="text-zinc-400">Vencimento / 1ª Parcela</span><p className="text-white font-medium mt-0.5">{fmtDate(pedido.dataPagamento)}</p></div>
            )}
            {(pedido.numeroParcelas ?? 1) > 1 && (
              <div><span className="text-zinc-400">Parcelas</span><p className="text-white font-medium mt-0.5">{pedido.numeroParcelas}×</p></div>
            )}
            {pedido.confirmadoPor && (
              <div><span className="text-zinc-400">Confirmado por</span><p className="text-white font-medium mt-0.5">{pedido.confirmadoPor.nome} em {fmtDate(pedido.confirmedAt)}</p></div>
            )}
          </div>

          {pedido.observacoes && (
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-sm text-zinc-300">{pedido.observacoes}</div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Itens</h3>
            <div className="space-y-2">
              {pedido.itens.map(it => (
                <div key={it.id} className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white font-medium">{it.produto?.nome || `Produto #${it.produtoId}`}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{it.quantidade} un × {fmtBRL(Number(it.valorUnitario))}</p>
                  </div>
                  <span className="text-orange-500 font-semibold">{fmtBRL(Number(it.valorTotal))}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <span className="text-sm text-zinc-400">Total: <strong className="text-orange-500 text-lg">{fmtBRL(Number(pedido.valorTotal))}</strong></span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {canAprovar && (
              <Button variant="secondary" onClick={() => handleAction('aprovar')} disabled={!!loading}>
                {loading === 'aprovar' ? 'Aprovando...' : 'Aprovar'}
              </Button>
            )}
            {canConfirmar && (
              <Button variant="success" onClick={() => handleAction('confirmar')} disabled={!!loading}>
                {loading === 'confirmar' ? 'Confirmando...' : '✓ Confirmar Entrada (dá entrada no estoque)'}
              </Button>
            )}
            {canCancelar && (
              <Button variant="danger" onClick={() => handleAction('cancelar')} disabled={!!loading}>
                {loading === 'cancelar' ? 'Cancelando...' : 'Cancelar Pedido'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PedidosCompra() {
  const { user } = useAuth();
  const { selectedLojaId } = useLojaContext();
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detalhesPedido, setDetalhesPedido] = useState<PedidoCompra | null>(null);
  const [erro, setErro] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFiltro) params.set('status', statusFiltro);
      if (selectedLojaId) params.set('lojaId', String(selectedLojaId));
      const qs = params.toString() ? `?${params}` : '';
      const [pData, lData, prodData] = await Promise.all([
        api.get<any>(`/pedidos-compra${qs}`),
        api.get<any>('/lojas'),
        api.get<any>('/produtos'),
      ]);
      setPedidos(Array.isArray(pData) ? pData : []);
      setLojas(Array.isArray(lData) ? lData : lData.lojas ?? []);
      setProdutos(Array.isArray(prodData) ? prodData : prodData.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFiltro, selectedLojaId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: any) => {
    await api.post('/pedidos-compra', data);
    setShowModal(false);
    load();
  };

  const handleAction = async (id: number, acao: string) => {
    try {
      await api.post(`/pedidos-compra/${id}/${acao}`, {});
      setDetalhesPedido(null);
      load();
    } catch (e: any) { setErro(e.message || 'Erro na operação'); }
  };

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return p.fornecedor.toLowerCase().includes(q) || p.loja.nomeFantasia.toLowerCase().includes(q) || String(p.id).includes(q);
  });

  const totais = {
    pendentes: pedidos.filter(p => p.status === 'PENDENTE').length,
    aprovados: pedidos.filter(p => p.status === 'APROVADO').length,
    confirmados: pedidos.filter(p => p.status === 'CONFIRMADO').length,
    valorTotal: pedidos.filter(p => p.status !== 'CANCELADO').reduce((s, p) => s + Number(p.valorTotal), 0),
  };

  const role = user?.role || '';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <SectionHeader
        title="Pedidos de Compra"
        subtitle="Gestão de ordens de entrada de mercadoria com custo médio ponderado"
        actions={['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'DONO_LOJA', 'GERENTE_LOJA'].includes(role) ? (
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Novo Pedido</Button>
        ) : undefined}
      />

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center justify-between">
          {erro}
          <button onClick={() => setErro('')} className="text-red-300 hover:text-red-100">×</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes', val: totais.pendentes, color: 'text-yellow-400' },
          { label: 'Aprovados', val: totais.aprovados, color: 'text-blue-400' },
          { label: 'Confirmados', val: totais.confirmados, color: 'text-green-400' },
          { label: 'Valor Total (ativos)', val: fmtBRL(totais.valorTotal), color: 'text-orange-500' },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-zinc-400 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por fornecedor ou empresa..." className="flex-1 min-w-48"
          />
          <Select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="w-44">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="CANCELADO">Cancelado</option>
          </Select>
          <Button variant="secondary" onClick={load}>Atualizar</Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="p-12 text-center text-zinc-400">Carregando pedidos...</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p className="text-2xl mb-2">📦</p>
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                  <th className="text-left p-3 sm:p-4 font-medium">#</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Empresa</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden sm:table-cell">Fornecedor</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">Itens</th>
                  <th className="text-right p-3 sm:p-4 font-medium">Valor Total</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden md:table-cell">Previsão</th>
                  <th className="text-left p-3 sm:p-4 font-medium">Status</th>
                  <th className="text-left p-3 sm:p-4 font-medium hidden lg:table-cell">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(p => (
                  <tr key={p.id}
                    onClick={() => setDetalhesPedido(p)}
                    className="border-b border-[#27272a] hover:bg-zinc-800/40 cursor-pointer transition-colors">
                    <td className="p-3 sm:p-4 text-zinc-400 font-mono">#{p.id}</td>
                    <td className="p-3 sm:p-4">
                      <p className="text-white font-medium">{p.loja.nomeFantasia}</p>
                      <p className="text-xs text-zinc-500 hidden sm:block">{p.loja.cnpj}</p>
                      <p className="text-xs text-zinc-400 sm:hidden">{p.fornecedor}</p>
                    </td>
                    <td className="p-3 sm:p-4 text-zinc-200 hidden sm:table-cell">{p.fornecedor}</td>
                    <td className="p-3 sm:p-4 text-zinc-400 hidden md:table-cell">{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</td>
                    <td className="p-3 sm:p-4 text-right font-semibold text-orange-500">{fmtBRL(Number(p.valorTotal))}</td>
                    <td className="p-3 sm:p-4 text-zinc-400 hidden md:table-cell">{fmtDate(p.previsaoEntrega)}</td>
                    <td className="p-3 sm:p-4"><Badge variant={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td className="p-3 sm:p-4 text-zinc-400 hidden lg:table-cell">{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <ModalPedido lojas={lojas} produtos={produtos} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}

      {detalhesPedido && (
        <DetalhesPedido
          pedido={detalhesPedido} role={role}
          onClose={() => setDetalhesPedido(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
