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

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">Produto</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Loja</th>
                <th className="pb-3 font-medium">Quantidade</th>
                <th className="pb-3 font-medium">Minimo</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : estoque.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Nenhum item no estoque</td>
                </tr>
              ) : (
                estoque.map(item => (
                  <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 text-white font-medium">{item.produto?.nome}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.produto?.tipo === 'MOTO' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                        {item.produto?.tipo}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{item.loja?.nomeFantasia}</td>
                    <td className="py-3 text-white font-semibold">{item.quantidade}</td>
                    <td className="py-3 text-gray-400">{item.estoqueMinimo}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.quantidade <= item.estoqueMinimo ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {item.quantidade <= item.estoqueMinimo ? 'Baixo' : 'OK'}
                      </span>
                    </td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" onClick={() => handleEditar(item)}>Editar</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
