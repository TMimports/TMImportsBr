import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportPlanilha } from '../components/ImportPlanilha';
import { CustomSelect } from '../components/CustomSelect';

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

interface Margens {
  lucroMoto: number;
  lucroPeca: number;
}

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
  const [margens, setMargens] = useState<Margens>({ lucroMoto: 30, lucroPeca: 60 });

  const loadProdutos = () => {
    setLoading(true);
    Promise.all([
      api.get<Produto[]>('/produtos'),
      api.get<any>('/configuracoes')
    ])
      .then(([produtosData, config]) => {
        setProdutos(produtosData);
        if (config) {
          setMargens({
            lucroMoto: Number(config.lucroMoto ?? 30),
            lucroPeca: Number(config.lucroPeca ?? 60)
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const calcularPreco = (custo: number, tipo: string) => {
    const margem = tipo === 'MOTO' ? margens.lucroMoto : margens.lucroPeca;
    if (tipo === 'MOTO') {
      return custo * (1 + margem / 100);
    }
    return custo / (1 - margem / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const custo = parseFloat(form.custo);
      const preco = calcularPreco(custo, form.tipo);
      
      const dados = {
        nome: form.nome,
        tipo: form.tipo,
        custo,
        preco,
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex flex-wrap gap-2">
          <ImportPlanilha tipo="produtos" onSuccess={loadProdutos} />
          {produtosFiltrados.length > 0 && (
            <button 
              onClick={() => selecionados.length === produtosFiltrados.length ? setSelecionados([]) : setSelecionados(produtosFiltrados.map(p => p.id))}
              className="btn btn-secondary text-sm"
            >
              {selecionados.length === produtosFiltrados.length ? 'Desmarcar' : 'Selecionar todos'}
            </button>
          )}
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

      {produtosFiltrados.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {produtosFiltrados.map(produto => (
            <div key={produto.id} className="card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(produto.id)}
                  onChange={() => toggleSelecao(produto.id)}
                  className="rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{produto.nome}</h3>
                      <p className="text-sm text-orange-400 font-mono">{produto.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${produto.tipo === 'MOTO' ? 'badge-primary' : 'badge-success'}`}>
                        {produto.tipo}
                      </span>
                      <button onClick={() => handleEditar(produto)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(produto.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Custo: </span>
                      <span className="text-gray-300">R$ {Number(produto.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lucro: </span>
                      <span className="text-gray-300">{Number(produto.percentualLucro).toFixed(2)}%</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-gray-500">Preco: </span>
                      <span className="text-green-400 font-semibold">R$ {Number(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <CustomSelect
            label="Tipo"
            required
            value={form.tipo}
            onChange={(val) => setForm({ ...form, tipo: val })}
            options={[
              { value: 'MOTO', label: `Moto (Margem ${margens.lucroMoto}%)` },
              { value: 'PECA', label: `Peca (Margem ${margens.lucroPeca}%)` }
            ]}
          />
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
                Margem: {form.tipo === 'MOTO' ? margens.lucroMoto : margens.lucroPeca}% (Custo / {(100 - (form.tipo === 'MOTO' ? margens.lucroMoto : margens.lucroPeca)).toFixed(0)}%)
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
