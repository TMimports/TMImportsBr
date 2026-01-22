import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { useAuth } from '../contexts/AuthContext';

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

export function Vendas() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    produtoId: '',
    lojaId: '',
    quantidade: '1',
    formaPagamento: 'PIX',
    desconto: '0'
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const produto = produtos.find(p => p.id === parseInt(form.produtoId));
      await api.post('/vendas', {
        clienteId: parseInt(form.clienteId),
        lojaId: parseInt(form.lojaId),
        itens: [{
          produtoId: parseInt(form.produtoId),
          quantidade: parseInt(form.quantidade),
          precoUnitario: produto?.preco || 0,
          desconto: parseFloat(form.desconto)
        }],
        formaPagamento: form.formaPagamento
      });
      setModalOpen(false);
      setForm({ clienteId: '', produtoId: '', lojaId: lojas.length === 1 ? String(lojas[0].id) : '', quantidade: '1', formaPagamento: 'PIX', desconto: '0' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
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
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Vendedor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Pagamento</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma venda encontrada
                </td>
              </tr>
            ) : (
              vendas.map(venda => (
                <tr key={venda.id} className="hover:bg-zinc-700 cursor-pointer">
                  <td className="p-3 border-b border-zinc-700">{venda.id}</td>
                  <td className="p-3 border-b border-zinc-700">{venda.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{venda.vendedor?.nome}</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(venda.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{venda.formaPagamento}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${venda.confirmadaFinanceiro ? 'badge-success' : 'badge-warning'}`}>
                      {venda.confirmadaFinanceiro ? 'Confirmada' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(venda.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova Venda">
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="label">Produto *</label>
            <select
              value={form.produtoId}
              onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
              className="input"
              required
            >
              <option value="">Selecione...</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} - R$ {Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantidade *</label>
            <input
              type="number"
              min="1"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              className="input"
              required
            />
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
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
