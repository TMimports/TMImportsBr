import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLojaContext } from '../contexts/LojaContext';
import { CustomSelect } from '../components/CustomSelect';

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
  deletedAt: string | null;
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
  estoque: number;
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

interface ItemProduto {
  produtoId: string;
  quantidade: number;
  preco: number;
  desconto: string;
  descontoValor: string;
  tipo?: string;
  chassi?: string;
  motor?: string;
  unidadeFisicaId?: number;
  displayName?: string;
}

interface ItemMoto {
  unidadeId: string;
  produtoId: string;
  quantidade: number;
  preco: number;
  desconto: string;
  descontoValor: string;
  chassi: string;
  motor: string;
  displayName: string;
}

interface PagamentoComp {
  tipo: string;
  valor: string;
  parcelas: string;
  obs: string;
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

interface ConfigDescontos {
  descontoMaxMoto: number;
  descontoMaxPeca: number;
}

// Taxas da máquina (calculadas da planilha: Valor recebido / 6000 - 1)
const TAXAS_MAQUINA: Record<number, number> = {
  1:  0.04378,  2:  0.05688,  3:  0.06328,  4:  0.06981,
  5:  0.07647,  6:  0.08326,  7:  0.09304,  8:  0.10013,
  9:  0.10738,  10: 0.11478,  11: 0.12234,  12: 0.13006,
  13: 0.14391,  14: 0.15202,  15: 0.16030,  16: 0.16878,
  17: 0.17745,  18: 0.18631,
};

const TODAS_PARCELAS = Array.from({ length: 18 }, (_, i) => i + 1);

export function Vendas() {
  const { user } = useAuth();
  const { selectedLojaId } = useLojaContext();
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
  const [configDescontos, setConfigDescontos] = useState<ConfigDescontos>({ descontoMaxMoto: 3.5, descontoMaxPeca: 10 });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelVendaId, setCancelVendaId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showQuickCliente, setShowQuickCliente] = useState(false);
  const [quickCliente, setQuickCliente] = useState({ nome: '', cpfCnpj: '', telefone: '' });
  const [quickClienteLoading, setQuickClienteLoading] = useState(false);
  const [buscaVendas, setBuscaVendas] = useState('');
  const [filtroTipoVenda, setFiltroTipoVenda] = useState('');
  const [filtroStatusVenda, setFiltroStatusVenda] = useState('');
  const [formErro, setFormErro] = useState('');

  const [form, setForm] = useState({
    clienteId: '',
    lojaId: '',
    formaPagamento: 'PIX',
    parcelas: '1',
    tipo: 'VENDA',
    observacoes: ''
  });

  const [itensSelecionados, setItensSelecionados] = useState<ItemProduto[]>([]);
  const [motosSelecionadas, setMotosSelecionadas] = useState<ItemMoto[]>([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<UnidadeDisponivel[]>([]);
  const [pagamentosCompostos, setPagamentosCompostos] = useState<PagamentoComp[]>([{ tipo: 'PIX', valor: '', parcelas: '1', obs: '' }]);

  const loadProdutosLoja = async (lojaId: string) => {
    if (!lojaId) {
      setProdutos([]);
      setUnidadesDisponiveis([]);
      return;
    }
    try {
      const produtosData = await api.get<Produto[]>(`/vendas/produtos-catalogo/${lojaId}`);
      setProdutos(produtosData.map((p: any) => ({ id: p.id, nome: p.nome, preco: Number(p.preco), tipo: p.tipo, estoque: p.estoque || 0 })));
      try {
        const unidades = await api.get<UnidadeDisponivel[]>(`/unidades/disponiveis/${lojaId}`);
        setUnidadesDisponiveis(unidades);
      } catch {
        setUnidadesDisponiveis([]);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos da loja:', err);
    }
  };

  const loadData = (lojaIdOverride?: number | null) => {
    const filtroLoja = lojaIdOverride !== undefined ? lojaIdOverride : selectedLojaId;
    const vendasUrl = filtroLoja ? `/vendas?lojaId=${filtroLoja}` : '/vendas';
    Promise.all([
      api.get<Venda[]>(vendasUrl),
      api.get<Cliente[]>('/clientes'),
      api.get<Loja[]>('/lojas'),
      api.get<ConfigDescontos>('/configuracoes/public')
    ])
      .then(([vendasData, clientesData, lojasData, configData]) => {
        setVendas(vendasData);
        setClientes(clientesData);
        setLojas(lojasData);
        if (configData) setConfigDescontos(configData);
        const preselLoja = filtroLoja ?? user?.lojaId ?? (lojasData.length === 1 ? lojasData[0].id : null);
        if (preselLoja) {
          const lojaIdStr = String(preselLoja);
          setForm(f => ({ ...f, lojaId: lojaIdStr }));
          loadProdutosLoja(lojaIdStr);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [selectedLojaId]);

  useEffect(() => {
    if (form.lojaId) {
      loadProdutosLoja(form.lojaId);
    }
  }, [form.lojaId]);

  // Papéis com trava de desconto em 15%
  const rolesCap15 = ['VENDEDOR', 'DONO_LOJA'];
  const rolesLivres = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO', 'ADMIN_REDE'];
  const userRole = user?.role || '';
  const maxDescontoRole = rolesLivres.includes(userRole) ? 100 : rolesCap15.includes(userRole) ? 15 : (configDescontos.descontoMaxMoto * 2);

  const adicionarItem = () => {
    setItensSelecionados([...itensSelecionados, { produtoId: '', quantidade: 1, preco: 0, desconto: '0', descontoValor: '0', tipo: '', chassi: '', motor: '' }]);
  };

  const removerItem = (index: number) => {
    setItensSelecionados(itensSelecionados.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, field: string, value: any) => {
    const novos = [...itensSelecionados];
    if (field === 'produtoId') {
      const produto = produtos.find(p => p.id === parseInt(value));
      if (produto && produto.estoque <= 0 && form.tipo === 'VENDA') return;
      novos[index] = { ...novos[index], produtoId: value, preco: produto?.preco || 0, tipo: produto?.tipo || '', desconto: '0', descontoValor: '0' };
    } else if (field === 'quantidade') {
      const produto = produtos.find(p => p.id === parseInt(novos[index].produtoId));
      if (produto && form.tipo === 'VENDA' && produto.tipo !== 'MOTO') {
        value = Math.min(value, produto.estoque);
      }
      novos[index] = { ...novos[index], [field]: Math.max(1, value) };
    } else if (field === 'desconto') {
      // % → calcula valor fixo
      const pct = parseFloat(value) || 0;
      const subtotal = novos[index].preco * novos[index].quantidade;
      novos[index] = { ...novos[index], desconto: value, descontoValor: (subtotal * pct / 100).toFixed(2) };
    } else if (field === 'descontoValor') {
      // R$ → calcula %
      const subtotal = novos[index].preco * novos[index].quantidade;
      const pct = subtotal > 0 ? (parseFloat(value) || 0) / subtotal * 100 : 0;
      novos[index] = { ...novos[index], descontoValor: value, desconto: pct.toFixed(2) };
    } else {
      novos[index] = { ...novos[index], [field]: value };
    }
    setItensSelecionados(novos);
  };

  const adicionarMoto = () => {
    setMotosSelecionadas([...motosSelecionadas, { unidadeId: '', produtoId: '', quantidade: 1, preco: 0, desconto: '0', descontoValor: '0', chassi: '', motor: '', displayName: '' }]);
  };

  const removerMoto = (index: number) => {
    setMotosSelecionadas(motosSelecionadas.filter((_, i) => i !== index));
  };

  const atualizarMoto = (index: number, field: string, value: any) => {
    const novas = [...motosSelecionadas];
    if (field === 'produtoId') {
      const produto = produtos.find(p => p.id === parseInt(value));
      if (produto) {
        const unidade = unidadesDisponiveis.find(u => u.produtoId === produto.id);
        novas[index] = {
          ...novas[index],
          produtoId: value,
          preco: produto.preco,
          desconto: '0',
          descontoValor: '0',
          unidadeId: unidade ? String(unidade.id) : '',
          chassi: unidade?.chassi || '',
          motor: unidade?.codigoMotor || '',
          displayName: produto.nome
        };
      }
    } else if (field === 'unidadeId') {
      const unidade = unidadesDisponiveis.find(u => String(u.id) === value);
      if (unidade) {
        novas[index] = {
          ...novas[index],
          unidadeId: value,
          chassi: unidade.chassi || '',
          motor: unidade.codigoMotor || ''
        };
      } else {
        novas[index] = { ...novas[index], unidadeId: '', chassi: '', motor: '' };
      }
    } else if (field === 'desconto') {
      // % → calcula valor fixo
      const pct = parseFloat(value) || 0;
      novas[index] = { ...novas[index], desconto: value, descontoValor: (novas[index].preco * pct / 100).toFixed(2) };
    } else if (field === 'descontoValor') {
      // R$ → calcula %
      const preco = novas[index].preco;
      const pct = preco > 0 ? (parseFloat(value) || 0) / preco * 100 : 0;
      novas[index] = { ...novas[index], descontoValor: value, desconto: pct.toFixed(2) };
    } else {
      novas[index] = { ...novas[index], [field]: value };
    }
    setMotosSelecionadas(novas);
  };

  const motosSemDadosCompletos = () => {
    return motosSelecionadas.filter(item => item.produtoId && (!item.chassi || !item.motor));
  };

  const isCartao = form.formaPagamento === 'CARTAO_DEBITO' || form.formaPagamento === 'CARTAO_CREDITO';
  const isCombinado = form.formaPagamento === 'COMBINADO';
  const isCredito = form.formaPagamento === 'CARTAO_CREDITO' || form.formaPagamento === 'FINANCIAMENTO';

  const totalPagamentosCompostos = pagamentosCompostos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);

  // Total real que o cliente paga (entrada + financiado já com taxa da máquina)
  const totalComEncargos = pagamentosCompostos.reduce((acc, p) => {
    const val = parseFloat(p.valor) || 0;
    const n = parseInt(p.parcelas) || 1;
    const tipoCredito = p.tipo === 'CARTAO_CREDITO' || p.tipo === 'FINANCIAMENTO';
    const taxa = tipoCredito ? (TAXAS_MAQUINA[n] ?? 0) : 0;
    return acc + val * (1 + taxa);
  }, 0);

  const addPagamento = () => setPagamentosCompostos(prev => [...prev, { tipo: 'CARTAO_CREDITO', valor: '', parcelas: '1', obs: '' }]);
  const removePagamento = (i: number) => setPagamentosCompostos(prev => prev.filter((_, idx) => idx !== i));
  const updatePagamento = (i: number, field: keyof PagamentoComp, val: string) =>
    setPagamentosCompostos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  // Ao digitar o valor da entrada, auto-preenche o restante na última linha de crédito
  const updateEntrada = (valor: string) => {
    updatePagamento(0, 'valor', valor);
    if (pagamentosCompostos.length >= 2) {
      const total = calcularTotal();
      const entrada = parseFloat(valor) || 0;
      const restante = Math.max(0, total - entrada);
      // Atualiza última linha com o restante
      setPagamentosCompostos(prev => prev.map((p, idx) =>
        idx === prev.length - 1 ? { ...p, valor: restante > 0 ? restante.toFixed(2) : '' } : idx === 0 ? { ...p, valor } : p
      ));
    }
  };

  // Ativa modo combinado com atalho entrada (PIX/Dinheiro) + crédito
  const ativarCombinado = (tipoEntrada: string) => {
    const total = calcularTotal();
    setForm(f => ({ ...f, formaPagamento: 'COMBINADO' }));
    setPagamentosCompostos([
      { tipo: tipoEntrada, valor: '', parcelas: '1', obs: '' },
      { tipo: 'CARTAO_CREDITO', valor: total > 0 ? total.toFixed(2) : '', parcelas: '1', obs: '' },
    ]);
  };

  const precisaParcelas = (tipo: string) => tipo === 'CARTAO_CREDITO' || tipo === 'FINANCIAMENTO';

  const calcularTotal = () => {
    const totalPecas = itensSelecionados.reduce((acc, item) => {
      const sub = item.preco * item.quantidade;
      const desc = isCartao ? 0 : (parseFloat(item.desconto) || 0);
      return acc + sub * (1 - desc / 100);
    }, 0);
    const totalMotos = motosSelecionadas.reduce((acc, item) => {
      const sub = item.preco * item.quantidade;
      const desc = isCartao ? 0 : (parseFloat(item.desconto) || 0);
      return acc + sub * (1 - desc / 100);
    }, 0);
    const total = totalPecas + totalMotos;
    if (total % 1 !== 0) {
      return Math.ceil(total);
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro('');

    if (!form.lojaId) {
      setFormErro('⚠️ Selecione uma loja antes de continuar.');
      return;
    }

    if (itensSelecionados.length === 0 && motosSelecionadas.length === 0) {
      setFormErro('⚠️ Adicione pelo menos um produto ou moto à venda.');
      return;
    }

    const motosIncompletas = motosSemDadosCompletos();
    if (motosIncompletas.length > 0) {
      setFormErro(`🏍️ Preencha o número de chassi e motor para todas as motos (${motosIncompletas.length} moto(s) incompleta(s)).`);
      return;
    }

    // Validação de desconto máximo no frontend
    const todoItens = [...motosSelecionadas.map(m => ({ desconto: parseFloat(m.desconto) || 0, nome: m.displayName || 'Moto' })),
                       ...itensSelecionados.map(i => ({ desconto: parseFloat(i.desconto) || 0, nome: i.displayName || 'Peça' }))];
    for (const it of todoItens) {
      if (it.desconto > maxDescontoRole) {
        setFormErro(`⚠️ Desconto máximo permitido: ${maxDescontoRole}%. Um ou mais itens estão acima do limite.`);
        return;
      }
    }

    // Validação pagamento combinado
    const totalFinal = calcularTotal();
    if (isCombinado) {
      const totalPag = pagamentosCompostos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
      if (Math.abs(totalPag - totalFinal) > 0.01) {
        setFormErro(`⚠️ Soma dos pagamentos (R$ ${totalPag.toFixed(2)}) ≠ total da venda (R$ ${totalFinal.toFixed(2)}). Corrija os valores.`);
        return;
      }
    }

    setSaving(true);
    try {
      const itensPecas = itensSelecionados
        .filter(item => item.produtoId)
        .map(item => ({
          produtoId: parseInt(item.produtoId),
          quantidade: item.quantidade,
          precoUnitario: item.preco,
          desconto: isCartao ? 0 : (parseFloat(item.desconto) || 0),
          chassi: null,
          motor: null,
          unidadeFisicaId: null
        }));

      const itensMotos = motosSelecionadas
        .filter(item => item.produtoId)
        .map(item => ({
          produtoId: parseInt(item.produtoId),
          quantidade: 1,
          precoUnitario: item.preco,
          desconto: isCartao ? 0 : (parseFloat(item.desconto) || 0),
          chassi: item.chassi || null,
          motor: item.motor || null,
          unidadeFisicaId: item.unidadeId ? parseInt(item.unidadeId) : null
        }));

      const itens = [...itensMotos, ...itensPecas];

      const novaVenda = await api.post<VendaFull>('/vendas', {
        clienteId: parseInt(form.clienteId),
        lojaId: parseInt(form.lojaId),
        itens,
        formaPagamento: form.formaPagamento,
        parcelas: isCombinado ? undefined : (parseInt(form.parcelas) || 1),
        tipo: form.tipo,
        observacoes: form.observacoes,
        pagamentosCompostos: isCombinado ? pagamentosCompostos : undefined,
        valorTotalManual: totalFinal
      });

      setModalOpen(false);
      setForm({
        clienteId: '',
        lojaId: lojas.length === 1 ? String(lojas[0].id) : '',
        formaPagamento: 'PIX',
        parcelas: '1',
        tipo: 'VENDA',
        observacoes: ''
      });
      setItensSelecionados([]);
      setMotosSelecionadas([]);
      setPagamentosCompostos([{ tipo: 'PIX', valor: '', parcelas: '1', obs: '' }]);
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

  const abrirCancelamento = (id: number) => {
    setCancelVendaId(id);
    setCancelMotivo('');
    setCancelModalOpen(true);
  };

  const confirmarCancelamento = async () => {
    if (!cancelVendaId || !cancelMotivo.trim()) return;
    try {
      await api.put(`/vendas/${cancelVendaId}/cancelar`, { motivo: cancelMotivo });
      setCancelModalOpen(false);
      setCancelVendaId(null);
      setCancelMotivo('');
      loadData();
      alert('Venda cancelada com sucesso! Estoque restaurado.');
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar venda');
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

  const criarClienteRapido = async () => {
    if (!quickCliente.nome.trim()) return;
    setQuickClienteLoading(true);
    try {
      const novo = await api.post<{ id: number; nome: string }>('/clientes', {
        nome: quickCliente.nome.trim(),
        cpfCnpj: quickCliente.cpfCnpj || undefined,
        telefone: quickCliente.telefone || undefined,
      });
      setClientes(prev => [...prev, novo]);
      setForm(f => ({ ...f, clienteId: String(novo.id) }));
      setShowQuickCliente(false);
      setQuickCliente({ nome: '', cpfCnpj: '', telefone: '' });
    } catch (e: any) {
      alert(e.message || 'Erro ao criar cliente');
    } finally {
      setQuickClienteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  const vendasFiltradas = vendas.filter(v => {
    if (filtroTipoVenda && v.tipo !== filtroTipoVenda) return false;
    if (filtroStatusVenda === 'confirmada' && !v.confirmadaFinanceiro) return false;
    if (filtroStatusVenda === 'pendente' && v.confirmadaFinanceiro) return false;
    if (filtroStatusVenda === 'cancelada' && !v.deletedAt) return false;
    if (buscaVendas) {
      const q = buscaVendas.toLowerCase();
      return String(v.id).includes(q) ||
        (v.cliente?.nome || '').toLowerCase().includes(q) ||
        (v.vendedor?.nome || '').toLowerCase().includes(q) ||
        (v.formaPagamento || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Nova Venda</button>
      </div>

      {/* Filtros de busca */}
      <div className="flex gap-2 flex-wrap mb-4">
        <input
          value={buscaVendas}
          onChange={e => setBuscaVendas(e.target.value)}
          placeholder="🔍 Buscar cliente, vendedor, ID..."
          className="flex-1 min-w-40 bg-[#18181b] border border-[#27272a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-500"
        />
        <select
          value={filtroTipoVenda}
          onChange={e => setFiltroTipoVenda(e.target.value)}
          className="bg-[#18181b] border border-[#27272a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="">Todos os tipos</option>
          <option value="VENDA">Venda</option>
          <option value="ORCAMENTO">Orçamento</option>
        </select>
        <select
          value={filtroStatusVenda}
          onChange={e => setFiltroStatusVenda(e.target.value)}
          className="bg-[#18181b] border border-[#27272a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="">Todos os status</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendente">Pendente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        {(buscaVendas || filtroTipoVenda || filtroStatusVenda) && (
          <button
            onClick={() => { setBuscaVendas(''); setFiltroTipoVenda(''); setFiltroStatusVenda(''); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors"
          >✕ Limpar</button>
        )}
      </div>
      {(buscaVendas || filtroTipoVenda || filtroStatusVenda) && (
        <p className="text-xs text-zinc-500 mb-3">{vendasFiltradas.length} de {vendas.length} vendas</p>
      )}

      {vendasFiltradas.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          {vendas.length === 0 ? 'Nenhuma venda encontrada' : 'Nenhuma venda corresponde ao filtro'}
        </div>
      ) : (
        <div className="space-y-3">
          {vendasFiltradas.map(venda => (
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
                  {!venda.deletedAt && (user?.role === 'ADMIN_GERAL' || user?.role === 'GERENTE_LOJA' || user?.role === 'DONO_LOJA') && (
                    <button onClick={() => abrirCancelamento(venda.id)} className="btn btn-sm btn-danger">
                      Cancelar
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {lojas.length > 1 && !user?.lojaId && (
            <CustomSelect
              label="Loja"
              required
              value={form.lojaId}
              onChange={(val) => {
                setForm({ ...form, lojaId: val });
                setItensSelecionados([]);
                setMotosSelecionadas([]);
              }}
              options={lojas.map(l => ({ value: String(l.id), label: l.nomeFantasia }))}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">Cliente *</label>
              <button type="button" onClick={() => setShowQuickCliente(true)} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-0.5 font-medium">
                + Novo Cliente
              </button>
            </div>
            <CustomSelect
              value={form.clienteId}
              onChange={(val) => setForm({ ...form, clienteId: val })}
              options={clientes.map(c => ({ value: String(c.id), label: c.nome }))}
              required
            />
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Motos</label>
              <button type="button" onClick={adicionarMoto} className="btn btn-sm btn-secondary" disabled={produtos.filter(p => p.tipo === 'MOTO').length === 0}>
                + Adicionar Moto
              </button>
            </div>
            {produtos.filter(p => p.tipo === 'MOTO').length === 0 && form.lojaId ? (
              <p className="text-gray-500 text-sm">Nenhuma moto disponivel nesta loja</p>
            ) : motosSelecionadas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma moto adicionada</p>
            ) : (
              <div className="space-y-3">
                {motosSelecionadas.map((item, index) => {
                  const unidadesDoModelo = item.produtoId
                    ? unidadesDisponiveis.filter(u => u.produtoId === parseInt(item.produtoId))
                    : [];
                  return (
                  <div key={index} className="p-3 bg-zinc-800 rounded-lg">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <CustomSelect
                        value={item.produtoId}
                        onChange={(val) => atualizarMoto(index, 'produtoId', val)}
                        className="flex-1"
                        placeholder="Selecione uma moto..."
                        options={produtos.filter(p => p.tipo === 'MOTO').map(p => {
                          const statusTag = p.estoque <= 0 ? ' [Sem estoque]' : ` [${p.estoque} un]`;
                          return {
                            value: String(p.id),
                            label: `${p.nome}${statusTag} - R$ ${Number(p.preco).toFixed(2)}`,
                            disabled: p.estoque <= 0 && form.tipo === 'VENDA'
                          };
                        })}
                      />
                      <div className="flex gap-3 items-end flex-wrap">
                        {!isCartao && (
                          <>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-zinc-500">Desconto %</span>
                              <div className={`flex items-center w-24 bg-zinc-800 border rounded-lg focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors ${parseFloat(item.desconto) > maxDescontoRole ? 'border-red-500 focus-within:border-red-500' : 'border-zinc-700 focus-within:border-orange-500'}`}>
                                <input
                                  type="number" step="0.1" min="0" max={maxDescontoRole}
                                  value={item.desconto}
                                  onChange={(e) => atualizarMoto(index, 'desconto', e.target.value)}
                                  className={`flex-1 min-w-0 bg-transparent py-2.5 pl-3 pr-1 text-sm outline-none border-none focus:ring-0 ${parseFloat(item.desconto) > maxDescontoRole ? 'text-red-400' : 'text-yellow-400'}`}
                                  placeholder="0"
                                />
                                <span className="pr-2 text-gray-500 text-xs shrink-0 select-none">%</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-zinc-500">Desconto R$</span>
                              <div className="flex items-center w-28 bg-zinc-800 border border-zinc-700 rounded-lg focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors">
                                <span className="pl-2 pr-0.5 text-gray-500 text-xs shrink-0 select-none whitespace-nowrap">-R$</span>
                                <input
                                  type="number" step="0.01" min="0"
                                  value={item.descontoValor}
                                  onChange={(e) => atualizarMoto(index, 'descontoValor', e.target.value)}
                                  className="flex-1 min-w-0 bg-transparent py-2.5 pr-2 text-sm text-yellow-400 outline-none border-none focus:ring-0"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-zinc-500">Preço</span>
                          <div className="flex items-center gap-1 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1.5">
                            <span className="text-gray-500 text-xs">R$</span>
                            <span className="text-green-400 text-sm font-medium">{Number(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removerMoto(index)} className="text-red-500 hover:text-red-400 font-bold mb-1">✕</button>
                      </div>
                    </div>
                    {item.produtoId && !isCartao && (
                      <div className="mt-1 ml-1">
                        {parseFloat(item.desconto) > maxDescontoRole ? (
                          <p className="text-xs text-red-400 font-medium">⚠ O desconto máximo permitido para este perfil é de {maxDescontoRole}%.</p>
                        ) : (
                          <p className="text-xs text-gray-500">Desconto máx. para este perfil: {maxDescontoRole}%</p>
                        )}
                      </div>
                    )}
                    {item.produtoId && (
                      <>
                        {unidadesDoModelo.length > 0 && (
                          <div className="mt-3">
                            <CustomSelect
                              value={item.unidadeId}
                              onChange={(val) => atualizarMoto(index, 'unidadeId', val)}
                              placeholder="Selecione unidade fisica (opcional)..."
                              options={[
                                { value: '', label: 'Preencher manualmente' },
                                ...unidadesDoModelo.map(u => ({
                                  value: String(u.id),
                                  label: `Chassi: ${u.chassi || 'N/A'} | Motor: ${u.codigoMotor || 'N/A'} | Cor: ${u.cor || 'N/A'}`
                                }))
                              ]}
                            />
                          </div>
                        )}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400">Numero do Chassi *</label>
                            <input
                              type="text"
                              value={item.chassi || ''}
                              onChange={(e) => atualizarMoto(index, 'chassi', e.target.value)}
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
                              onChange={(e) => atualizarMoto(index, 'motor', e.target.value)}
                              className="input"
                              placeholder="Ex: E3K6E0000000"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Pecas / Acessorios</label>
              <button type="button" onClick={adicionarItem} className="btn btn-sm btn-secondary">
                + Adicionar Peca
              </button>
            </div>
            {itensSelecionados.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma peca adicionada</p>
            ) : (
              <div className="space-y-2">
                {itensSelecionados.map((item, index) => {
                  const produtoAtual = produtos.find(p => p.id === parseInt(item.produtoId));
                  const maxQtd = produtoAtual && form.tipo === 'VENDA' ? produtoAtual.estoque : 9999;
                  return (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <CustomSelect
                      value={item.produtoId}
                      onChange={(val) => atualizarItem(index, 'produtoId', val)}
                      className="flex-1"
                      placeholder="Selecione uma peca..."
                      options={produtos.filter(p => p.tipo !== 'MOTO').map(p => {
                        const statusTag = p.estoque <= 0 ? ' [Sem estoque]' : p.estoque <= 3 ? ` [Baixo: ${p.estoque}]` : ` [${p.estoque} un]`;
                        return {
                          value: String(p.id),
                          label: `${p.nome}${statusTag} - R$ ${Number(p.preco).toFixed(2)}`,
                          disabled: p.estoque <= 0 && form.tipo === 'VENDA'
                        };
                      })}
                    />
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-500">Qtd.</span>
                        <input
                          type="number" min="1" max={maxQtd}
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="input w-16"
                        />
                      </div>
                      {!isCartao && (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-zinc-500">Desconto %</span>
                            <div className={`flex items-center w-24 bg-zinc-800 border rounded-lg focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors ${parseFloat(item.desconto) > maxDescontoRole ? 'border-red-500 focus-within:border-red-500' : 'border-zinc-700 focus-within:border-orange-500'}`}>
                              <input
                                type="number" step="0.1" min="0" max={maxDescontoRole}
                                value={item.desconto}
                                onChange={(e) => atualizarItem(index, 'desconto', e.target.value)}
                                className={`flex-1 min-w-0 bg-transparent py-2.5 pl-3 pr-1 text-sm outline-none border-none focus:ring-0 ${parseFloat(item.desconto) > maxDescontoRole ? 'text-red-400' : 'text-yellow-400'}`}
                                placeholder="0"
                              />
                              <span className="pr-2 text-gray-500 text-xs shrink-0 select-none">%</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-zinc-500">Desconto R$</span>
                            <div className="flex items-center w-28 bg-zinc-800 border border-zinc-700 rounded-lg focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors">
                              <span className="pl-2 pr-0.5 text-gray-500 text-xs shrink-0 select-none whitespace-nowrap">-R$</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={item.descontoValor}
                                onChange={(e) => atualizarItem(index, 'descontoValor', e.target.value)}
                                className="flex-1 min-w-0 bg-transparent py-2.5 pr-2 text-sm text-yellow-400 outline-none border-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-500">Preço</span>
                        <div className="flex items-center w-28 bg-zinc-800 border border-zinc-700 rounded-lg focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors">
                          <span className="pl-2 pr-0.5 text-gray-500 text-xs shrink-0 select-none">R$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={item.preco}
                            onChange={(e) => atualizarItem(index, 'preco', parseFloat(e.target.value) || 0)}
                            className="flex-1 min-w-0 bg-transparent py-2.5 pr-2 text-sm text-green-400 outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => removerItem(index)} className="text-red-500 hover:text-red-400 font-bold mb-1">✕</button>
                    </div>
                    {item.produtoId && !isCartao && (
                      <div className="mt-1">
                        {parseFloat(item.desconto) > maxDescontoRole ? (
                          <p className="text-xs text-red-400 font-medium">⚠ O desconto máximo permitido para este perfil é de {maxDescontoRole}%.</p>
                        ) : (
                          <p className="text-xs text-gray-500">Desconto máx. para este perfil: {maxDescontoRole}%</p>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── PAGAMENTO ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <div>
              <CustomSelect
                label="Forma de Pagamento"
                required
                value={form.formaPagamento}
                onChange={(val) => {
                  setForm(f => ({ ...f, formaPagamento: val, parcelas: '1' }));
                  if (val === 'COMBINADO') {
                    const total = calcularTotal();
                    setPagamentosCompostos([
                      { tipo: 'PIX', valor: '', parcelas: '1', obs: '' },
                      { tipo: 'CARTAO_CREDITO', valor: total > 0 ? total.toFixed(2) : '', parcelas: '1', obs: '' },
                    ]);
                  } else {
                    setPagamentosCompostos([{ tipo: 'PIX', valor: '', parcelas: '1', obs: '' }]);
                  }
                }}
                options={[
                  { value: 'PIX', label: '💰 PIX' },
                  { value: 'DINHEIRO', label: '💵 Dinheiro' },
                  { value: 'CARTAO_DEBITO', label: '💳 Cartão Débito' },
                  { value: 'CARTAO_CREDITO', label: '💳 Cartão Crédito' },
                  { value: 'FINANCIAMENTO', label: '🏦 Financiamento' },
                  { value: 'COMBINADO', label: '🔀 Combinado (entrada + parcelamento)' }
                ]}
              />
            </div>

            {/* Aviso cartão sem desconto */}
            {isCartao && !isCombinado && (
              <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-start gap-2">
                <span className="text-blue-400">ℹ</span>
                <p className="text-sm text-blue-300">Vendas no cartão não possuem desconto. O valor será cobrado integralmente.</p>
              </div>
            )}

            {/* Parcelas para crédito/financiamento simples */}
            {isCredito && !isCombinado && (
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-3">
                <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">💳 Parcelamento</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-32">
                    <label className="block text-xs text-zinc-400 mb-1">Nº de Parcelas</label>
                    <select
                      value={form.parcelas}
                      onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      {TODAS_PARCELAS.map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  {calcularTotal() > 0 && (() => {
                    const n = parseInt(form.parcelas) || 1;
                    const base = calcularTotal();
                    const taxa = TAXAS_MAQUINA[n] ?? 0;
                    const totalComTaxa = base * (1 + taxa);
                    const parcela = totalComTaxa / n;
                    return (
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Valor por parcela</p>
                        <p className="text-lg font-bold text-orange-400">
                          R$ {parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Taxa: {(taxa * 100).toFixed(2)}% · Total: R$ {totalComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })()}
                </div>
                {/* Atalho: adicionar entrada */}
                <button
                  type="button"
                  onClick={() => ativarCombinado('PIX')}
                  className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-400/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Adicionar entrada (PIX/Dinheiro) antes do crédito
                </button>
              </div>
            )}

            {/* Atalho para pagamento simples (PIX/Dinheiro): adicionar crédito */}
            {(form.formaPagamento === 'PIX' || form.formaPagamento === 'DINHEIRO') && (
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => ativarCombinado(form.formaPagamento)}
                  className="text-xs text-zinc-400 hover:text-orange-300 border border-zinc-700 hover:border-orange-500/40 px-3 py-1.5 rounded-lg transition-colors">
                  🔀 Dividir: entrada + parcelar restante no crédito
                </button>
              </div>
            )}

            {/* COMBINADO — UI principal redesenhada */}
            {isCombinado && (
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl overflow-hidden">
                {/* Header com total */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800">
                  <p className="text-sm font-semibold text-orange-400">🔀 Pagamento Combinado</p>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Base da venda</p>
                    <p className="text-xs text-zinc-400">R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Total a pagar (c/ encargos)</p>
                    <p className="text-sm font-bold text-orange-300">R$ {totalComEncargos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {pagamentosCompostos.map((pag, i) => {
                    const valorPag = parseFloat(pag.valor) || 0;
                    const nParcelas = parseInt(pag.parcelas) || 1;
                    // Taxa da máquina aplicada ao valor parcelado
                    const taxaMaq = precisaParcelas(pag.tipo) ? (TAXAS_MAQUINA[nParcelas] ?? 0) : 0;
                    const valorComTaxa = valorPag * (1 + taxaMaq);
                    const valorParc = precisaParcelas(pag.tipo) && valorPag > 0
                      ? valorComTaxa / nParcelas
                      : null;
                    // Acumulado antes deste item
                    const acumuladoAntes = pagamentosCompostos.slice(0, i).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
                    const restanteParaEste = Math.max(0, calcularTotal() - acumuladoAntes);

                    return (
                      <div key={i} className={`rounded-lg border p-3 space-y-2 ${i === 0 ? 'border-blue-500/40 bg-blue-500/5' : 'border-zinc-700 bg-zinc-900/40'}`}>
                        {/* Label da linha */}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-700 text-zinc-400'}`}>
                            {i === 0 ? '💰 Entrada' : `💳 Pagamento ${i + 1}`}
                          </span>
                          {i === 0 && pagamentosCompostos.length === 2 && restanteParaEste > 0 && (
                            <span className="text-xs text-zinc-500">Restante: R$ {restanteParaEste.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          )}
                          {pagamentosCompostos.length > 1 && (
                            <button type="button" onClick={() => removePagamento(i)} className="text-red-400 hover:text-red-300 text-xs ml-auto pl-2">✕</button>
                          )}
                        </div>

                        {/* Campos */}
                        <div className="flex gap-2 flex-wrap items-end">
                          {/* Tipo */}
                          <div className="flex-1 min-w-32">
                            <label className="block text-xs text-zinc-400 mb-1">Forma</label>
                            <select
                              value={pag.tipo}
                              onChange={(e) => updatePagamento(i, 'tipo', e.target.value)}
                              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                            >
                              <option value="PIX">PIX</option>
                              <option value="DINHEIRO">Dinheiro</option>
                              <option value="CARTAO_DEBITO">Cartão Débito</option>
                              <option value="CARTAO_CREDITO">Cartão Crédito</option>
                              <option value="FINANCIAMENTO">Financiamento</option>
                            </select>
                          </div>

                          {/* Valor */}
                          <div className="w-36">
                            <label className="block text-xs text-zinc-400 mb-1">Valor (R$)</label>
                            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50 transition-colors">
                              <span className="pl-2 pr-0.5 text-zinc-500 text-xs shrink-0 select-none">R$</span>
                              <input
                                type="number" step="0.01" min="0"
                                value={pag.valor}
                                onChange={(e) => i === 0 ? updateEntrada(e.target.value) : updatePagamento(i, 'valor', e.target.value)}
                                className="flex-1 min-w-0 bg-transparent py-1.5 pr-2 text-sm text-white outline-none border-none focus:ring-0"
                                placeholder="0,00"
                              />
                            </div>
                          </div>

                          {/* Parcelas (só crédito/financiamento) */}
                          {precisaParcelas(pag.tipo) && (
                            <div className="w-24">
                              <label className="block text-xs text-zinc-400 mb-1">Parcelas</label>
                              <select
                                value={pag.parcelas}
                                onChange={(e) => updatePagamento(i, 'parcelas', e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                              >
                                {TODAS_PARCELAS.map(n => (
                                  <option key={n} value={n}>{n}x</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Simulação taxa da máquina (crédito/financiamento) */}
                        {precisaParcelas(pag.tipo) && valorPag > 0 && (
                          <div className="rounded-lg bg-orange-950/30 border border-orange-500/20 px-3 py-2 space-y-1">
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>Valor financiado</span>
                              <span className="font-medium text-white">R$ {valorPag.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>Taxa da máquina ({nParcelas}x)</span>
                              <span className="text-yellow-400">+{(taxaMaq * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>Total com encargos</span>
                              <span className="font-medium text-white">R$ {valorComTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-t border-orange-500/20 pt-1 flex items-center justify-between">
                              <span className="text-xs font-semibold text-orange-300">{nParcelas}x de</span>
                              <span className="text-base font-bold text-orange-400">R$ {valorParc!.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Botão adicionar método */}
                  <button type="button" onClick={addPagamento}
                    className="w-full py-2 text-xs text-zinc-400 hover:text-orange-400 border border-dashed border-zinc-700 hover:border-orange-500/40 rounded-lg transition-colors">
                    + Adicionar outra forma de pagamento
                  </button>

                  {/* Resumo do total */}
                  <div className="space-y-1.5">
                    {/* Validação entrada vs valor do produto */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                      Math.abs(totalPagamentosCompostos - calcularTotal()) < 0.01
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      <span>
                        {Math.abs(totalPagamentosCompostos - calcularTotal()) < 0.01
                          ? '✓ Entrada + restante conferem'
                          : `⚠ Falta distribuir: R$ ${Math.abs(totalPagamentosCompostos - calcularTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                      <span>
                        R$ {totalPagamentosCompostos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Total real com encargos */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <span className="text-xs font-semibold text-orange-300">💳 Total a pagar pelo cliente</span>
                      <span className="text-sm font-bold text-orange-400">
                        R$ {totalComEncargos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
            
            {(motosSelecionadas.filter(m => m.produtoId).length > 0 || itensSelecionados.filter(i => i.produtoId).length > 0) && (
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                {motosSelecionadas.filter(m => m.produtoId).map((item, idx) => {
                  const subtotal = item.preco * item.quantidade;
                  const desc = isCartao ? 0 : (parseFloat(item.desconto) || 0);
                  const descontoValor = subtotal * desc / 100;
                  const finalItem = subtotal - descontoValor;
                  return (
                    <div key={`m-${idx}`} className="text-xs border-b border-zinc-700/50 pb-2 last:border-0">
                      <div className="flex justify-between text-gray-300">
                        <span>{item.displayName || 'Moto'}</span>
                        <span className="text-gray-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {desc > 0 && (
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-500">Desconto ({desc}%):</span>
                          <span className="text-red-400">- R$ {descontoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {desc > 0 && (
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Final:</span>
                          <span className="text-green-400">R$ {finalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {itensSelecionados.filter(i => i.produtoId).map((item, idx) => {
                  const produto = produtos.find(p => p.id === parseInt(item.produtoId));
                  const nomeExibicao = produto?.nome || 'Peca';
                  const subtotal = item.preco * item.quantidade;
                  const desc = isCartao ? 0 : (parseFloat(item.desconto) || 0);
                  const descontoValor = subtotal * desc / 100;
                  const finalItem = subtotal - descontoValor;
                  return (
                    <div key={`p-${idx}`} className="text-xs border-b border-zinc-700/50 pb-2 last:border-0">
                      <div className="flex justify-between text-gray-300">
                        <span>{nomeExibicao} (x{item.quantidade})</span>
                        <span className="text-gray-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {desc > 0 && (
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-500">Desconto ({desc}%):</span>
                          <span className="text-red-400">- R$ {descontoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {desc > 0 && (
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Final:</span>
                          <span className="text-green-400">R$ {finalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-lg font-bold border-t border-zinc-700 pt-2">
                <span>Total a Pagar:</span>
                <span className="text-green-400">
                  R$ {(isCombinado ? totalComEncargos : calcularTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {isCombinado && totalComEncargos > calcularTotal() && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Base do produto:</span>
                  <span>R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {formErro && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
              {formErro}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setModalOpen(false); setFormErro(''); }} className="btn btn-secondary">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

            <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[400px] mb-4">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-2 text-gray-400 text-sm">Produto</th>
                  <th className="text-center p-2 text-gray-400 text-sm">Qtd</th>
                  <th className="text-right p-2 text-gray-400 text-sm">Valor Unit.</th>
                  <th className="text-right p-2 text-gray-400 text-sm">Desc.</th>
                  <th className="text-right p-2 text-gray-400 text-sm">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {vendaDetalhada?.itens?.map((item, i) => {
                  const desc = Number(item.desconto || 0);
                  const subtotalBruto = Number(item.precoUnitario) * item.quantidade;
                  const subtotalFinal = subtotalBruto * (1 - desc / 100);
                  return (
                    <tr key={i} className="border-b border-zinc-800">
                      <td className="p-2">{item.produto?.nome}</td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-right">R$ {Number(item.precoUnitario).toFixed(2)}</td>
                      <td className="p-2 text-right">
                        {desc > 0 ? (
                          <span className="text-yellow-400 font-semibold">{desc}%</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {desc > 0 ? (
                          <div>
                            <span className="text-green-400">R$ {subtotalFinal.toFixed(2)}</span>
                            <span className="text-red-400 text-xs block">-R$ {(subtotalBruto - subtotalFinal).toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>R$ {subtotalBruto.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

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

      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancelar Venda">
        <div className="space-y-4">
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm font-medium">Atenção: Esta ação irá:</p>
            <ul className="text-red-300 text-xs mt-2 space-y-1 list-disc list-inside">
              <li>Restaurar o estoque dos produtos</li>
              <li>Remover contas a receber vinculadas</li>
              <li>Cancelar comissões do vendedor</li>
              <li>Desativar garantias geradas</li>
              <li>Remover entrada do caixa</li>
            </ul>
          </div>
          <div>
            <label className="label">Motivo do cancelamento / estorno *</label>
            <textarea
              value={cancelMotivo}
              onChange={e => setCancelMotivo(e.target.value)}
              className="input w-full h-24 resize-none"
              placeholder="Ex: Cliente desistiu da compra, erro no pedido, etc."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCancelModalOpen(false)} className="btn btn-secondary">
              Voltar
            </button>
            <button
              onClick={confirmarCancelamento}
              disabled={cancelMotivo.trim().length < 3}
              className="btn btn-danger"
            >
              Confirmar Cancelamento
            </button>
          </div>
        </div>
      </Modal>

      {showQuickCliente && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowQuickCliente(false); }}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-full max-w-md">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="font-bold text-white">Novo Cliente</h3>
              <button onClick={() => setShowQuickCliente(false)} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nome *</label>
                <input autoFocus type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickCliente.nome} onChange={e => setQuickCliente(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" onKeyDown={e => e.key === 'Enter' && criarClienteRapido()} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">CPF / CNPJ</label>
                <input type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickCliente.cpfCnpj} onChange={e => setQuickCliente(p => ({ ...p, cpfCnpj: e.target.value }))} placeholder="Opcional" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Telefone</label>
                <input type="text" className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50" value={quickCliente.telefone} onChange={e => setQuickCliente(p => ({ ...p, telefone: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3 justify-end">
              <button onClick={() => setShowQuickCliente(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={criarClienteRapido} disabled={!quickCliente.nome.trim() || quickClienteLoading} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium transition-colors">
                {quickClienteLoading ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
