import { useState, useEffect } from 'react';
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
  confirmedAt?: string;
  confirmadoPor?: { id: number; nome: string; };
  itens: Array<Item & { id: number; }>;
  createdAt: string;
}
interface Loja { id: number; nomeFantasia: string; cnpj: string; }

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
    fornecedor: '', numero: '', previsaoEntrega: '', observacoes: '',
  });
  const [itens, setItens] = useState<Array<{ produtoId: string; quantidade: string; valorUnitario: string; }>>([
    { produtoId: '', quantidade: '1', valorUnitario: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

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
    if (!form.lojaId || !form.fornecedor.trim()) { setErro('Loja e fornecedor são obrigatórios'); return; }
    for (const it of itens) {
      if (!it.produtoId || !it.quantidade || !it.valorUnitario) { setErro('Preencha todos os itens corretamente'); return; }
    }
    setLoading(true); setErro('');
    try {
      await onSave({
        lojaId: Number(form.lojaId),
        fornecedor: form.fornecedor.trim(),
        numero: form.numero || undefined,
        previsaoEntrega: form.previsaoEntrega || undefined,
        observacoes: form.observacoes || undefined,
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
            <Input label="Fornecedor *" value={form.fornecedor}
              onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} placeholder="Nome do fornecedor" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Número do Pedido" value={form.numero}
              onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Nº do pedido/NF" />
            <Input label="Previsão de Entrega" type="date" value={form.previsaoEntrega}
              onChange={e => setForm(p => ({ ...p, previsaoEntrega: e.target.value }))} />
          </div>
          <Input label="Observações" value={form.observacoes}
            onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações opcionais" />

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
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detalhesPedido, setDetalhesPedido] = useState<PedidoCompra | null>(null);
  const [erro, setErro] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFiltro ? `?status=${statusFiltro}` : '';
      const [pData, lData, prodData] = await Promise.all([
        api.get<any>(`/pedidos-compra${params}`),
        api.get<any>('/lojas'),
        api.get<any>('/produtos'),
      ]);
      setPedidos(Array.isArray(pData) ? pData : []);
      setLojas(Array.isArray(lData) ? lData : lData.lojas ?? []);
      setProdutos(Array.isArray(prodData) ? prodData : prodData.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFiltro]);

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-400 text-xs">
                  <th className="text-left p-4 font-medium">#</th>
                  <th className="text-left p-4 font-medium">Empresa</th>
                  <th className="text-left p-4 font-medium">Fornecedor</th>
                  <th className="text-left p-4 font-medium">Itens</th>
                  <th className="text-right p-4 font-medium">Valor Total</th>
                  <th className="text-left p-4 font-medium">Previsão</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(p => (
                  <tr key={p.id}
                    onClick={() => setDetalhesPedido(p)}
                    className="border-b border-[#27272a] hover:bg-zinc-800/40 cursor-pointer transition-colors">
                    <td className="p-4 text-zinc-400 font-mono">#{p.id}</td>
                    <td className="p-4">
                      <p className="text-white font-medium">{p.loja.nomeFantasia}</p>
                      <p className="text-xs text-zinc-500">{p.loja.cnpj}</p>
                    </td>
                    <td className="p-4 text-zinc-200">{p.fornecedor}</td>
                    <td className="p-4 text-zinc-400">{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</td>
                    <td className="p-4 text-right font-semibold text-orange-500">{fmtBRL(Number(p.valorTotal))}</td>
                    <td className="p-4 text-zinc-400">{fmtDate(p.previsaoEntrega)}</td>
                    <td className="p-4"><Badge variant={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td className="p-4 text-zinc-400">{fmtDate(p.createdAt)}</td>
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
