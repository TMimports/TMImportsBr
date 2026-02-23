import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
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
  valorBruto: number;
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
  tipo?: string;
  chassi?: string;
  motor?: string;
  unidadeFisicaId?: number;
  displayName?: string;
}

interface UnidadeDisponivel {
  id: number;
  produtoId: number;
  produtoNome: string;
  preco: number;
  chassi: string;
  codigoMotor: string;
  cor: string;
  ano: number;
  displayName: string;
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
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<UnidadeDisponivel[]>([]);

  const loadProdutosLoja = async (lojaId: string) => {
    if (!lojaId) {
      setProdutos([]);
      setUnidadesDisponiveis([]);
      return;
    }
    try {
      const [produtosData, unidades] = await Promise.all([
        api.get<Produto[]>(`/vendas/produtos-disponiveis/${lojaId}`),
        api.get<UnidadeDisponivel[]>(`/unidades/disponiveis/${lojaId}`)
      ]);
      setProdutos(produtosData.map((p: any) => ({ id: p.id, nome: p.nome, preco: Number(p.preco), tipo: p.tipo })));
      setUnidadesDisponiveis(unidades);
    } catch (err) {
      console.error('Erro ao buscar produtos da loja:', err);
    }
  };

  const loadData = () => {
    Promise.all([
      api.get<Venda[]>('/vendas'),
      api.get<Cliente[]>('/clientes'),
      api.get<Loja[]>('/lojas')
    ])
      .then(([vendasData, clientesData, lojasData]) => {
        setVendas(vendasData);
        setClientes(clientesData);
        setLojas(lojasData);
        if (lojasData.length === 1) {
          const lojaIdStr = String(lojasData[0].id);
          setForm(f => ({ ...f, lojaId: lojaIdStr }));
          loadProdutosLoja(lojaIdStr);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (form.lojaId) {
      loadProdutosLoja(form.lojaId);
    }
  }, [form.lojaId]);

  const adicionarItem = () => {
    setItensSelecionados([...itensSelecionados, { produtoId: '', quantidade: 1, preco: 0, tipo: '', chassi: '', motor: '' }]);
  };

  const removerItem = (index: number) => {
    setItensSelecionados(itensSelecionados.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, field: string, value: any) => {
    const novos = [...itensSelecionados];
    if (field === 'produtoId') {
      const produto = produtos.find(p => p.id === parseInt(value));
      novos[index] = { ...novos[index], produtoId: value, preco: produto?.preco || 0, tipo: produto?.tipo || '' };
    } else {
      novos[index] = { ...novos[index], [field]: value };
    }
    setItensSelecionados(novos);
  };

  const motosSemDadosCompletos = () => {
    return itensSelecionados.filter(item => item.tipo === 'MOTO' && (!item.chassi || !item.motor));
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

    const motosIncompletas = motosSemDadosCompletos();
    if (motosIncompletas.length > 0) {
      alert('Preencha o numero do chassi e motor para todas as motos');
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
          desconto: parseFloat(form.desconto),
          chassi: item.chassi || null,
          motor: item.motor || null,
          unidadeFisicaId: item.unidadeFisicaId || null
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

  const converterParaVenda = async (id: number) => {
    if (!window.confirm('Deseja concluir este orçamento como venda?')) return;
    try {
      await api.put(`/vendas/${id}/converter-venda`, {});
      loadData();
      alert('Orçamento convertido em venda com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao converter orçamento');
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
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Nova Venda</button>
      </div>

      {vendas.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Nenhuma venda encontrada
        </div>
      ) : (
        <div className="space-y-3">
          {vendas.map(venda => (
            <div key={venda.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">#{venda.id}</span>
                  <span className={`badge ${venda.tipo === 'ORCAMENTO' ? 'badge-warning' : 'badge-success'}`}>
                    {venda.tipo === 'ORCAMENTO' ? 'Orcamento' : 'Venda'}
                  </span>
                  <span className={`badge ${venda.confirmadaFinanceiro ? 'badge-success' : 'badge-warning'}`}>
                    {venda.confirmadaFinanceiro ? 'Confirmada' : 'Pendente'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirVisualizacao(venda.id)} className="btn btn-sm btn-secondary">
                    Ver
                  </button>
                  {venda.tipo === 'ORCAMENTO' && !venda.confirmadaFinanceiro && (
                    <button onClick={() => converterParaVenda(venda.id)} className="btn btn-sm btn-success">
                      Concluir
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Cliente</p>
                  <p className="text-white">{venda.cliente?.nome}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Vendedor</p>
                  <p className="text-gray-300">{venda.vendedor?.nome}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Pagamento</p>
                  <p className="text-gray-300">{pagamentoLabels[venda.formaPagamento] || venda.formaPagamento}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Data</p>
                  <p className="text-gray-300">{new Date(venda.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-700 flex justify-between items-center">
                <span className="text-gray-500 text-sm">Valor Total</span>
                <span className="text-xl font-bold text-green-400">
                  R$ {Number(venda.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
                onChange={(e) => {
                  setForm({ ...form, lojaId: e.target.value });
                  setItensSelecionados([]);
                }}
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

          {unidadesDisponiveis.length > 0 && (
            <div className="border-t border-zinc-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Motos Disponiveis</label>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unidadesDisponiveis.map(u => {
                  const jaAdicionada = itensSelecionados.some(i => i.unidadeFisicaId === u.id);
                  return (
                    <div 
                      key={u.id} 
                      className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors ${
                        jaAdicionada 
                          ? 'bg-green-500/20 border border-green-500' 
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                      onClick={() => {
                        if (jaAdicionada) {
                          setItensSelecionados(itensSelecionados.filter(i => i.unidadeFisicaId !== u.id));
                        } else {
                          setItensSelecionados([...itensSelecionados, {
                            produtoId: String(u.produtoId),
                            quantidade: 1,
                            preco: Number(u.preco),
                            tipo: 'MOTO',
                            chassi: u.chassi,
                            motor: u.codigoMotor,
                            unidadeFisicaId: u.id,
                            displayName: u.displayName
                          }]);
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium">{u.produtoNome}</p>
                        <p className="text-sm text-gray-400">
                          Chassi: {u.chassi || 'N/A'} | Motor: {u.codigoMotor || 'N/A'} | Cor: {u.cor || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-medium">R$ {Number(u.preco).toFixed(2)}</p>
                        {jaAdicionada && <span className="text-xs text-green-400">Adicionada</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <div className="space-y-3">
                {itensSelecionados.map((item, index) => (
                  <div key={index} className="p-3 bg-zinc-800 rounded-lg">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                        <div 
                          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer flex justify-between items-center hover:border-orange-500 transition-colors"
                          onClick={() => {
                            const el = document.getElementById(`dropdown-${index}`);
                            if (el) el.classList.toggle('hidden');
                          }}
                        >
                          <span className={item.produtoId ? 'text-white' : 'text-gray-500'}>
                            {item.produtoId 
                              ? produtos.find(p => p.id === parseInt(item.produtoId))?.nome || 'Produto'
                              : 'Selecione um produto...'}
                          </span>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <div 
                          id={`dropdown-${index}`}
                          className="hidden absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg max-h-60 overflow-y-auto shadow-2xl"
                        >
                          {produtos.length === 0 ? (
                            <div className="px-4 py-3 text-gray-500 text-center">Nenhum produto cadastrado</div>
                          ) : (
                            produtos.map(p => (
                              <div 
                                key={p.id}
                                className={`px-4 py-2.5 cursor-pointer border-b border-zinc-800 last:border-b-0 transition-colors flex justify-between items-center ${
                                  item.produtoId === String(p.id) 
                                    ? 'bg-orange-500/20 text-orange-400' 
                                    : 'hover:bg-zinc-800 text-white'
                                }`}
                                onClick={() => {
                                  atualizarItem(index, 'produtoId', String(p.id));
                                  const el = document.getElementById(`dropdown-${index}`);
                                  if (el) el.classList.add('hidden');
                                }}
                              >
                                <span>{p.nome}</span>
                                <span className="text-sm text-gray-400">R$ {Number(p.preco).toFixed(2)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
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
                    {item.tipo === 'MOTO' && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Numero do Chassi *</label>
                          <input
                            type="text"
                            value={item.chassi || ''}
                            onChange={(e) => atualizarItem(index, 'chassi', e.target.value)}
                            className="input"
                            placeholder="Ex: 9C6KE0810PR000000"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Numero do Motor *</label>
                          <input
                            type="text"
                            value={item.motor || ''}
                            onChange={(e) => atualizarItem(index, 'motor', e.target.value)}
                            className="input"
                            placeholder="Ex: E3K6E0000000"
                            required
                          />
                        </div>
                      </div>
                    )}
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
            {(form.formaPagamento === 'CARTAO_DEBITO' || form.formaPagamento === 'CARTAO_CREDITO') && (
              <div className="mt-2 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-start gap-2">
                <span className="text-blue-400 text-lg">i</span>
                <p className="text-sm text-blue-300">
                  Vendas no cartao nao possuem desconto. O valor sera cobrado integralmente.
                </p>
              </div>
            )}
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
              disabled={form.formaPagamento === 'CARTAO_DEBITO' || form.formaPagamento === 'CARTAO_CREDITO'}
            />
            {(form.formaPagamento === 'CARTAO_DEBITO' || form.formaPagamento === 'CARTAO_CREDITO') ? (
              <p className="text-xs text-blue-400 mt-1">
                Desconto desabilitado para pagamentos com cartao
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Max: Moto 3.5%, Peca/Servico 10%
              </p>
            )}
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

          <div className="border-t border-zinc-700 pt-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-400">Resumo de Precos</h4>
            
            {itensSelecionados.filter(i => i.produtoId).length > 0 && (
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                {itensSelecionados.filter(i => i.produtoId).map((item, idx) => {
                  const produto = produtos.find(p => p.id === parseInt(item.produtoId));
                  const nomeExibicao = item.displayName || produto?.nome || 'Produto';
                  const subtotal = item.preco * item.quantidade;
                  const descontoValor = subtotal * (parseFloat(form.desconto) || 0) / 100;
                  const finalItem = subtotal - descontoValor;
                  return (
                    <div key={idx} className="text-xs border-b border-zinc-700/50 pb-2 last:border-0">
                      <div className="flex justify-between text-gray-300">
                        <span>{nomeExibicao} (x{item.quantidade})</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Original:</span>
                        <span className="text-gray-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {parseFloat(form.desconto) > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Desconto ({form.desconto}%):</span>
                            <span className="text-red-400">- R$ {descontoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Final:</span>
                            <span className="text-green-400">R$ {finalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal (Bruto):</span>
                <span className="text-white">
                  R$ {itensSelecionados.reduce((acc, item) => acc + (item.preco * item.quantidade), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {parseFloat(form.desconto) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Desconto Total ({form.desconto}%):</span>
                  <span className="text-red-400">
                    - R$ {(itensSelecionados.reduce((acc, item) => acc + (item.preco * item.quantidade), 0) - calcularTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t border-zinc-700 pt-2">
                <span>Total a Pagar:</span>
                <span className="text-green-400">
                  R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
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

            <div className="border-t border-zinc-700 pt-4 space-y-2">
              {vendaDetalhada?.valorBruto && vendaDetalhada.valorBruto !== vendaDetalhada.valorTotal && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal:</span>
                    <span>R$ {Number(vendaDetalhada.valorBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Desconto ({((1 - Number(vendaDetalhada.valorTotal) / Number(vendaDetalhada.valorBruto)) * 100).toFixed(1)}%):</span>
                    <span className="text-red-400">- R$ {(Number(vendaDetalhada.valorBruto) - Number(vendaDetalhada.valorTotal)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-400">Total:</span>
                <span className="text-green-400">R$ {Number(vendaDetalhada?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {vendaDetalhada?.itens?.some((item: any) => item.unidadeFisicaId) && vendaDetalhada?.tipo === 'VENDA' && (
              <div className="mt-4 p-3 bg-zinc-800 rounded text-sm">
                <strong className="text-gray-400">Garantias:</strong>
                <div className="mt-2 space-y-1">
                  <p>- Garantia Geral: 3 meses</p>
                  <p>- Garantia Motor: 12 meses</p>
                  <p>- Garantia Modulo: 12 meses</p>
                  <p>- Garantia Bateria: 12 meses</p>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  * A garantia requer revisoes a cada 3 meses. A primeira revisao e gratuita.
                </p>
              </div>
            )}

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
