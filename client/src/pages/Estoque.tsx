import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { Button, Input, Select } from '../components/ui';

interface ItemEstoque {
  id: number;
  quantidade: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  produto: { id: number; nome: string; tipo: string };
  loja: { id: number; nomeFantasia: string };
}

interface Produto {
  id: number;
  nome: string;
  tipo: string;
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

const initialForm = {
  produtoId: '',
  lojaId: '',
  quantidade: '',
  estoqueMinimo: '',
  estoqueMaximo: ''
};

export function Estoque() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState<number | null>(null);

  const loadEstoque = () => {
    setLoading(true);
    api.get<ItemEstoque[]>('/estoque')
      .then(setEstoque)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEstoque();
    api.get<Produto[]>('/produtos').then(setProdutos).catch(console.error);
    api.get<Loja[]>('/lojas').then(setLojas).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/estoque/${editando}`, {
          quantidade: Number(form.quantidade),
          estoqueMinimo: Number(form.estoqueMinimo),
          estoqueMaximo: Number(form.estoqueMaximo)
        });
      } else {
        await api.post('/estoque', {
          produtoId: Number(form.produtoId),
          lojaId: Number(form.lojaId),
          quantidade: Number(form.quantidade),
          estoqueMinimo: Number(form.estoqueMinimo),
          estoqueMaximo: Number(form.estoqueMaximo)
        });
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(null);
      loadEstoque();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (item: ItemEstoque) => {
    setForm({
      produtoId: String(item.produto.id),
      lojaId: String(item.loja.id),
      quantidade: String(item.quantidade),
      estoqueMinimo: String(item.estoqueMinimo),
      estoqueMaximo: String(item.estoqueMaximo || 0)
    });
    setEditando(item.id);
    setModalOpen(true);
  };

  const handleNovo = () => {
    setForm(initialForm);
    setEditando(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Estoque</h1>
        <Button variant="primary" onClick={handleNovo}>+ Adicionar ao Estoque</Button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Carregando...</div>
      ) : estoque.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">Nenhum item no estoque</div>
      ) : (
        <div className="space-y-3">
          {estoque.map(item => (
            <div key={item.id} className={`card ${item.quantidade <= item.estoqueMinimo ? 'border-red-500/50' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-white">{item.produto?.nome}</h3>
                  <p className="text-sm text-gray-400">{item.loja?.nomeFantasia}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.produto?.tipo === 'MOTO' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {item.produto?.tipo}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.quantidade <= item.estoqueMinimo ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {item.quantidade <= item.estoqueMinimo ? 'Baixo' : 'OK'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => handleEditar(item)}>Editar</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Quantidade</p>
                  <p className="text-white text-xl font-bold">{item.quantidade}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Minimo</p>
                  <p className="text-gray-300">{item.estoqueMinimo}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Maximo</p>
                  <p className="text-gray-300">{item.estoqueMaximo || '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Estoque' : 'Adicionar ao Estoque'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editando && (
            <>
              <Select
                label="Produto *"
                value={form.produtoId}
                onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
                required
                placeholder="Selecione um produto"
                options={produtos.map(p => ({ value: p.id, label: `${p.nome} (${p.tipo})` }))}
              />

              <Select
                label="Loja *"
                value={form.lojaId}
                onChange={(e) => setForm({ ...form, lojaId: e.target.value })}
                required
                placeholder="Selecione uma loja"
                options={lojas.map(l => ({ value: l.id, label: l.nomeFantasia }))}
              />
            </>
          )}

          <Input
            label="Quantidade"
            type="number"
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
          />

          <Input
            label="Estoque Minimo"
            type="number"
            value={form.estoqueMinimo}
            onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
          />

          <Input
            label="Estoque Maximo"
            type="number"
            value={form.estoqueMaximo}
            onChange={(e) => setForm({ ...form, estoqueMaximo: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {editando ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
