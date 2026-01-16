import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  custo: number;
  percentualLucro: number;
  preco: number;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'PECA', custo: '', descricao: '' });

  const loadProdutos = () => {
    api.get<Produto[]>('/produtos')
      .then(setProdutos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/produtos', {
        ...form,
        custo: parseFloat(form.custo)
      });
      setModalOpen(false);
      setForm({ nome: '', tipo: 'PECA', custo: '', descricao: '' });
      loadProdutos();
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
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          <ImportExport entity="produtos" onImportSuccess={loadProdutos} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Novo Produto</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Codigo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Nome</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Custo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Lucro %</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Preco</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              produtos.map(produto => (
                <tr key={produto.id} className="hover:bg-zinc-700 cursor-pointer">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Produto">
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
              <option value="MOTO">Moto (26.32% lucro)</option>
              <option value="PECA">Peca (60% lucro)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              O preco e calculado automaticamente com base no tipo
            </p>
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
