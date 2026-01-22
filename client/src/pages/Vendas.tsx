import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { useAuth } from '../contexts/AuthContext';

interface VendaItem {
  id: number;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  produto: { nome: string };
}

interface VendaFull {
  id: number;
  tipo: string;
  valorTotal: number;
  formaPagamento: string;
  confirmadaFinanceiro: boolean;
  observacoes?: string;
  cliente: { id: number; nome: string; cpfCnpj?: string; telefone?: string; endereco?: string };
  vendedor: { nome: string };
  loja: { nomeFantasia: string; cnpj?: string; telefone?: string; endereco?: string };
  itens: VendaItem[];
  createdAt: string;
}

interface Venda {
  id: number;
  tipo: string;
  cliente: { nome: string };
  vendedor: { nome: string };
  valorTotal: number;
  formaPagamento: string;
  confirmadaFinanceiro: boolean;
  createdAt: string;
}

interface Cliente {
  id: number;
  nome: string;
}

interface Produto {
  id: number;
  nome: string;
  preco: number;
  tipo: string;
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

interface ItemProduto {
  produtoId: string;
  quantidade: number;
  preco: number;
}

export function Vendas() {
  useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [vendaDetalhada, setVendaDetalhada] = useState<VendaFull | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    clienteId: '',
    lojaId: '',
    formaPagamento: 'PIX',
    desconto: '0',
    tipo: 'VENDA',
    observacoes: ''
  });

  const [itensSelecionados, setItensSelecionados] = useState<ItemProduto[]>([]);

  const loadData = () => {
    Promise.all([
      api.get<Venda[]>('/vendas'),
      api.get<Cliente[]>('/clientes'),
      api.get<Produto[]>('/produtos'),
      api.get<Loja[]>('/lojas')
    ])
      .then(([vendasData, clientesData, produtosData, lojasData]) => {
        setVendas(vendasData);
        setClientes(clientesData);
        setProdutos(produtosData);
        setLojas(lojasData);
        if (lojasData.length === 1) {
          setForm(f => ({ ...f, lojaId: String(lojasData[0].id) }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const adicionarItem = () => {
    setItensSelecionados([...itensSelecionados, { produtoId: '', quantidade: 1, preco: 0 }]);
  };

  const removerItem = (index: number) => {
    setItensSelecionados(itensSelecionados.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, field: string, value: any) => {
    const novos = [...itensSelecionados];
    if (field === 'produtoId') {
      const produto = produtos.find(p => p.id === parseInt(value));
      novos[index] = { ...novos[index], produtoId: value, preco: produto?.preco || 0 };
    } else {
      novos[index] = { ...novos[index], [field]: value };
    }
    setItensSelecionados(novos);
  };

  const calcularTotal = () => {
    const subtotal = itensSelecionados.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const desconto = parseFloat(form.desconto) || 0;
    return subtotal * (1 - desconto / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.lojaId) {
      alert('Selecione uma loja');
      return;
    }

    if (itensSelecionados.length === 0) {
      alert('Adicione pelo menos um produto');
      return;
    }

    setSaving(true);
    try {
      const itens = itensSelecionados
        .filter(item => item.produtoId)
        .map(item => ({
          produtoId: parseInt(item.produtoId),
          quantidade: item.quantidade,
          precoUnitario: item.preco,
          desconto: parseFloat(form.desconto)
        }));

      const novaVenda = await api.post<VendaFull>('/vendas', {
        clienteId: parseInt(form.clienteId),
        lojaId: parseInt(form.lojaId),
        itens,
        formaPagamento: form.formaPagamento,
        tipo: form.tipo,
        observacoes: form.observacoes
      });

      setModalOpen(false);
      setForm({
        clienteId: '',
        lojaId: lojas.length === 1 ? String(lojas[0].id) : '',
        formaPagamento: 'PIX',
        desconto: '0',
        tipo: 'VENDA',
        observacoes: ''
      });
      setItensSelecionados([]);
      loadData();

      const vendaCompleta = await api.get<VendaFull>(`/vendas/${novaVenda.id}`);
      setVendaDetalhada(vendaCompleta);
      setViewModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const abrirVisualizacao = async (id: number) => {
    try {
      const venda = await api.get<VendaFull>(`/vendas/${id}`);
      setVendaDetalhada(venda);
      setViewModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${vendaDetalhada?.tipo === 'ORCAMENTO' ? 'Orcamento' : 'Venda'} #${vendaDetalhada?.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { font-size: 12px; color: #666; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-box { width: 48%; }
            .info-box h3 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            .info-box p { font-size: 12px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; }
            .total { text-align: right; font-size: 16px; font-weight: bold; }
            .obs { margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ccc; font-size: 12px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
            .badge-orcamento { background: #fef3c7; color: #92400e; }
            .badge-venda { background: #d1fae5; color: #065f46; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const pagamentoLabels: Record<string, string> = {
    PIX: 'PIX',
    DINHEIRO: 'Dinheiro',
    CARTAO_DEBITO: 'Cartao Debito',
    CARTAO_CREDITO: 'Cartao Credito',
    FINANCIAMENTO: 'Financiamento'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex gap-2">
          <ImportExport entity="vendas" onImportSuccess={loadData} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Nova Venda</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vendedor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Pagamento</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  Nenhuma venda encontrada
                </td>
              </tr>
            ) : (
              vendas.map(venda => (
                <tr key={venda.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">{venda.id}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${venda.tipo === 'ORCAMENTO' ? 'badge-warning' : 'badge-success'}`}>
                      {venda.tipo === 'ORCAMENTO' ? 'Orcamento' : 'Venda'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">{venda.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{venda.vendedor?.nome}</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(venda.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{pagamentoLabels[venda.formaPagamento] || venda.formaPagamento}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${venda.confirmadaFinanceiro ? 'badge-success' : 'badge-warning'}`}>
                      {venda.confirmadaFinanceiro ? 'Confirmada' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <button
                      onClick={() => abrirVisualizacao(venda.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova Venda">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="label">Tipo *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="VENDA"
                  checked={form.tipo === 'VENDA'}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="accent-orange-500"
                />
                <span>Venda Efetiva</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value="ORCAMENTO"
                  checked={form.tipo === 'ORCAMENTO'}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="accent-orange-500"
                />
                <span>Orcamento</span>
              </label>
            </div>
          </div>

          {lojas.length > 1 && (
            <div>
              <label className="label">Loja *</label>
              <select
                value={form.lojaId}
                onChange={(e) => setForm({ ...form, lojaId: e.target.value })}
                className="input"
                required
              >
                <option value="">Selecione...</option>
                {lojas.map(l => (
                  <option key={l.id} value={l.id}>{l.nomeFantasia}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Cliente *</label>
            <select
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className="input"
              required
            >
              <option value="">Selecione...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Produtos</label>
              <button type="button" onClick={adicionarItem} className="btn btn-sm btn-secondary">
                + Adicionar Produto
              </button>
            </div>
            {itensSelecionados.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum produto adicionado</p>
            ) : (
              <div className="space-y-2">
                {itensSelecionados.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={item.produtoId}
                      onChange={(e) => atualizarItem(index, 'produtoId', e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">Selecione...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} - R$ {Number(p.preco).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value))}
                      className="input w-20"
                    />
                    <span className="text-green-400 w-24 text-right">
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removerItem(index)} className="text-red-500 hover:text-red-400">
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Forma de Pagamento *</label>
            <select
              value={form.formaPagamento}
              onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
              className="input"
            >
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_DEBITO">Cartao Debito</option>
              <option value="CARTAO_CREDITO">Cartao Credito</option>
              <option value="FINANCIAMENTO">Financiamento</option>
            </select>
          </div>

          <div>
            <label className="label">Desconto (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={form.desconto}
              onChange={(e) => setForm({ ...form, desconto: e.target.value })}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Max: Moto 3.5%, Peca/Servico 10%
            </p>
          </div>

          <div>
            <label className="label">Observacoes</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-400">
                R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : form.tipo === 'ORCAMENTO' ? 'Gerar Orcamento' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={vendaDetalhada?.tipo === 'ORCAMENTO' ? 'Orcamento' : 'Comprovante de Venda'}>
        <div className="space-y-4">
          <div ref={printRef}>
            <div className="header text-center mb-4 pb-4 border-b border-zinc-700">
              <h1 className="text-xl font-bold">
                {vendaDetalhada?.tipo === 'ORCAMENTO' ? 'ORCAMENTO' : 'COMPROVANTE DE VENDA'}
              </h1>
              <p className="text-gray-400">#{vendaDetalhada?.id}</p>
              <p className="text-sm text-gray-500">{vendaDetalhada?.loja?.nomeFantasia}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="info-box">
                <h3 className="font-semibold text-sm mb-2 text-gray-400">Cliente</h3>
                <p className="text-white">{vendaDetalhada?.cliente?.nome}</p>
                {vendaDetalhada?.cliente?.cpfCnpj && <p className="text-sm text-gray-400">CPF/CNPJ: {vendaDetalhada.cliente.cpfCnpj}</p>}
                {vendaDetalhada?.cliente?.telefone && <p className="text-sm text-gray-400">Tel: {vendaDetalhada.cliente.telefone}</p>}
              </div>
              <div className="info-box">
                <h3 className="font-semibold text-sm mb-2 text-gray-400">Informacoes</h3>
                <p className="text-sm text-gray-400">Data: {vendaDetalhada?.createdAt ? new Date(vendaDetalhada.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                <p className="text-sm text-gray-400">Vendedor: {vendaDetalhada?.vendedor?.nome}</p>
                <p className="text-sm text-gray-400">Pagamento: {pagamentoLabels[vendaDetalhada?.formaPagamento || ''] || vendaDetalhada?.formaPagamento}</p>
              </div>
            </div>

            <table className="w-full mb-4">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-2 text-gray-400 text-sm">Produto</th>
                  <th className="text-center p-2 text-gray-400 text-sm">Qtd</th>
                  <th className="text-right p-2 text-gray-400 text-sm">Valor Unit.</th>
                  <th className="text-right p-2 text-gray-400 text-sm">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {vendaDetalhada?.itens?.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="p-2">{item.produto?.nome}</td>
                    <td className="p-2 text-center">{item.quantidade}</td>
                    <td className="p-2 text-right">R$ {Number(item.precoUnitario).toFixed(2)}</td>
                    <td className="p-2 text-right">R$ {(Number(item.precoUnitario) * item.quantidade).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right text-lg font-bold border-t border-zinc-700 pt-4">
              <span className="text-gray-400">Total: </span>
              <span className="text-green-400">R$ {Number(vendaDetalhada?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            {vendaDetalhada?.observacoes && (
              <div className="mt-4 p-3 bg-zinc-800 rounded text-sm">
                <strong className="text-gray-400">Observacoes:</strong>
                <p className="mt-1">{vendaDetalhada.observacoes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end border-t border-zinc-700 pt-4">
            <button onClick={() => setViewModalOpen(false)} className="btn btn-secondary">
              Fechar
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              Imprimir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
