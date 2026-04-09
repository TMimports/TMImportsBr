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
  descricao: '',
  preco: '',
};

const TIPO_LABEL: Record<string, string> = {
  MOTO:    'Moto',
  PECA:    'Peça',
  SERVICO: 'Serviço',
};

const TIPO_BADGE: Record<string, string> = {
  MOTO:    'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  PECA:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  SERVICO: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

const fmtBRL = (v: number) =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

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

  useEffect(() => { loadProdutos(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dados: any = {
        nome: form.nome,
        tipo: form.tipo,
        descricao: form.descricao || null
      };
      if (editando && form.id) {
        if (form.preco !== '' && !isNaN(Number(form.preco))) {
          dados.preco = Number(form.preco);
        }
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
      descricao: produto.descricao || '',
      preco: produto.preco > 0 ? String(produto.preco) : '',
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

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = busca === '' ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-400">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Custo e preço de venda calculados automaticamente via Pedido de Compra (custo médio ponderado)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportPlanilha tipo="produtos" onSuccess={loadProdutos} />
          {produtosFiltrados.length > 0 && (
            <button
              onClick={() => selecionados.length === produtosFiltrados.length
                ? setSelecionados([])
                : setSelecionados(produtosFiltrados.map(p => p.id))}
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

      {/* Filtros */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['TODOS', 'MOTO', 'PECA', 'SERVICO'].map(t => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`btn text-sm ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t === 'TODOS' ? 'Todos' : TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-400">
            {produtosFiltrados.length} de {produtos.length} produtos
          </span>
        </div>
      </div>

      {/* Lista */}
      {produtosFiltrados.length === 0 ? (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-zinc-500">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {produtosFiltrados.map(produto => (
            <div key={produto.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(produto.id)}
                  onChange={() => toggleSelecao(produto.id)}
                  className="rounded mt-1 accent-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{produto.nome}</h3>
                      <p className="text-xs text-orange-400 font-mono mt-0.5">{produto.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[produto.tipo] || 'bg-zinc-700 text-zinc-300'}`}>
                        {TIPO_LABEL[produto.tipo] || produto.tipo}
                      </span>
                      <button onClick={() => handleEditar(produto)} className="btn btn-sm btn-secondary">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(produto.id)} className="btn btn-sm btn-danger">
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* Valores — leitura automática via PedidoCompra */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500 text-xs mb-0.5">Custo médio</p>
                      <p className="text-zinc-200 font-medium">{fmtBRL(Number(produto.custo))}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500 text-xs mb-0.5">Margem</p>
                      <p className="text-zinc-200 font-medium">
                        {produto.preco > 0 && produto.custo > 0
                          ? `${(((produto.preco - produto.custo) / produto.preco) * 100).toFixed(1)}%`
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2 col-span-2 sm:col-span-1">
                      <p className="text-zinc-500 text-xs mb-0.5">Preço de venda</p>
                      <p className={`font-semibold ${produto.preco > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                        {fmtBRL(Number(produto.preco))}
                      </p>
                    </div>
                  </div>

                  {produto.custo === 0 && (
                    <p className="text-xs text-amber-500/80 mt-2">
                      ⚠️ Aguardando entrada via Pedido de Compra para definir custo e preço de venda
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Aviso informativo */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
            <p className="font-medium mb-1">ℹ️ Custo e preço definidos pelo Pedido de Compra</p>
            <p className="text-blue-400/80 text-xs">
              Cadastre o produto com nome e tipo. O custo médio e o preço de venda serão calculados automaticamente
              quando o primeiro Pedido de Compra for confirmado, com base no custo médio ponderado das entradas.
            </p>
          </div>

          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="input"
              placeholder="Ex: Módulo X-15, Bateria 60V, Fan 3000W..."
              required
            />
          </div>

          <CustomSelect
            label="Tipo *"
            required
            value={form.tipo}
            onChange={val => setForm({ ...form, tipo: val })}
            options={[
              { value: 'MOTO',    label: 'Moto / Scooter' },
              { value: 'PECA',    label: 'Peça / Acessório' },
              { value: 'SERVICO', label: 'Serviço' },
            ]}
          />

          <div>
            <label className="label">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              className="input"
              rows={3}
              placeholder="Descrição opcional do produto..."
            />
          </div>

          {/* Preço de venda manual (somente ao editar) */}
          {editando && (() => {
            const p = produtos.find(x => x.id === form.id);
            const precoNum = Number(form.preco) || 0;
            const margem = p && p.custo > 0 && precoNum > 0
              ? (((precoNum - p.custo) / precoNum) * 100).toFixed(1) + '%'
              : '—';
            return (
              <div className="bg-zinc-800 rounded-lg p-3 space-y-3">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Precificação</p>
                {p && p.custo > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <div>
                      <p className="text-zinc-500 text-xs">Custo médio</p>
                      <p className="text-zinc-200 font-semibold">{fmtBRL(p.custo)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs">Margem (informativo)</p>
                      <p className={`font-semibold ${Number(margem) > 0 ? 'text-green-400' : 'text-zinc-400'}`}>{margem}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Preço de Venda (R$) — editável manualmente</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco}
                    onChange={e => setForm({ ...form, preco: e.target.value })}
                    className="w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-xs text-zinc-500">O custo é definido automaticamente via Pedido de Compra.</p>
              </div>
            );
          })()}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar produto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
