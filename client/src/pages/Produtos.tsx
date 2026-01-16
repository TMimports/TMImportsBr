import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { ImportPlanilha } from '../components/ImportPlanilha';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  custo: number;
  percentualLucro: number;
  preco: number;
  descricao: string;
}

const initialForm = {
  id: 0,
  nome: '',
  tipo: 'PECA',
  custo: '',
  descricao: ''
};

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  const loadProdutos = () => {
    setLoading(true);
    api.get<Produto[]>('/produtos')
      .then(setProdutos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const calcularPreco = (custo: number, tipo: string) => {
    const percentualCusto = tipo === 'MOTO' ? 0.7368 : 0.40;
    return custo / percentualCusto;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dados = {
        nome: form.nome,
        tipo: form.tipo,
        custo: parseFloat(form.custo),
        descricao: form.descricao
      };
      
      if (editando && form.id) {
        await api.put(`/produtos/${form.id}`, dados);
      } else {
        await api.post('/produtos', dados);
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(false);
      loadProdutos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (produto: Produto) => {
    setForm({
      id: produto.id,
      nome: produto.nome,
      tipo: produto.tipo,
      custo: String(produto.custo),
      descricao: produto.descricao || ''
    });
    setEditando(true);
    setModalOpen(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/produtos/${id}`);
      loadProdutos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} produto(s)?`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/produtos/${id}`)));
      setSelecionados([]);
      loadProdutos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelecao = (id: number) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const abrirNovo = () => {
    setForm(initialForm);
    setEditando(false);
    setModalOpen(true);
  };

  const precoCalculado = form.custo ? calcularPreco(parseFloat(form.custo), form.tipo) : 0;

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = busca === '' || 
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          <ImportPlanilha tipo="produtos" onSuccess={loadProdutos} />
          <ImportExport entity="produtos" onImportSuccess={loadProdutos} />
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">
              Excluir ({selecionados.length})
            </button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Novo Produto</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome ou codigo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="input w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroTipo('TODOS')}
              className={`btn ${filtroTipo === 'TODOS' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('PECA')}
              className={`btn ${filtroTipo === 'PECA' ? 'btn-success' : 'btn-secondary'}`}
            >
              Pecas
            </button>
            <button
              onClick={() => setFiltroTipo('MOTO')}
              className={`btn ${filtroTipo === 'MOTO' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Motos
            </button>
          </div>
          <div className="text-sm text-gray-400">
            {produtosFiltrados.length} de {produtos.length} produtos
          </div>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700">
                <input
                  type="checkbox"
                  checked={selecionados.length === produtosFiltrados.length && produtosFiltrados.length > 0}
                  onChange={() => {
                    if (selecionados.length === produtosFiltrados.length) {
                      setSelecionados([]);
                    } else {
                      setSelecionados(produtosFiltrados.map(p => p.id));
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Codigo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Custo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Lucro %</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Preco</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              produtosFiltrados.map(produto => (
                <tr key={produto.id} className="hover:bg-zinc-700">
                  <td className="p-3 border-b border-zinc-700">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(produto.id)}
                      onChange={() => toggleSelecao(produto.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 border-b border-zinc-700 font-mono text-sm">{produto.codigo}</td>
                  <td className="p-3 border-b border-zinc-700">{produto.nome}</td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${produto.tipo === 'MOTO' ? 'badge-primary' : 'badge-success'}`}>
                      {produto.tipo}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    R$ {Number(produto.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">{Number(produto.percentualLucro).toFixed(2)}%</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <div className="table-actions">
                      <button onClick={() => handleEditar(produto)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(produto.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="input"
            >
              <option value="MOTO">Moto (Lucro 26,32% | Custo 73,68%)</option>
              <option value="PECA">Peca (Lucro 60% | Custo 40%)</option>
            </select>
          </div>
          <div>
            <label className="label">Custo (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={form.custo}
              onChange={(e) => setForm({ ...form, custo: e.target.value })}
              className="input"
              required
            />
          </div>
          {form.custo && (
            <div className="p-3 bg-zinc-700 rounded-lg">
              <p className="text-sm text-gray-400">Preco calculado automaticamente:</p>
              <p className="text-xl font-bold text-green-400">
                R$ {precoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                Formula: Custo / {form.tipo === 'MOTO' ? '73,68%' : '40%'} = Preco
              </p>
            </div>
          )}
          <div>
            <label className="label">Descricao</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
