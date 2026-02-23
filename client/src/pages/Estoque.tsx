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
  loja: { id: number; nomeFantasia: string; grupo?: { id: number; nome: string } };
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

interface GrupoEstoque {
  grupoId: number;
  grupoNome: string;
  itens: ItemEstoque[];
}

export function Estoque() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState<number | null>(null);
  const [grupoAberto, setGrupoAberto] = useState<number | null>(null);

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

  const agruparPorGrupo = (): GrupoEstoque[] => {
    const map = new Map<number, GrupoEstoque>();

    for (const item of estoque) {
      const grupoId = item.loja?.grupo?.id || 0;
      const grupoNome = item.loja?.grupo?.nome || 'Sem Grupo';

      if (!map.has(grupoId)) {
        map.set(grupoId, { grupoId, grupoNome, itens: [] });
      }
      map.get(grupoId)!.itens.push(item);
    }

    return Array.from(map.values()).sort((a, b) => a.grupoNome.localeCompare(b.grupoNome));
  };

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

  const toggleGrupo = (grupoId: number) => {
    setGrupoAberto(grupoAberto === grupoId ? null : grupoId);
  };

  const grupos = agruparPorGrupo();

  useEffect(() => {
    if (grupos.length > 0 && grupoAberto === null) {
      setGrupoAberto(grupos[0].grupoId);
    }
  }, [estoque]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Estoque</h1>
        <Button variant="primary" onClick={handleNovo}>+ Adicionar</Button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Carregando...</div>
      ) : estoque.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">Nenhum item no estoque</div>
      ) : (
        <div className="space-y-4">
          {grupos.map(grupo => {
            const isOpen = grupoAberto === grupo.grupoId;
            const totalItens = grupo.itens.length;
            const alertas = grupo.itens.filter(i => i.quantidade <= i.estoqueMinimo).length;

            return (
              <div key={grupo.grupoId} className="border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGrupo(grupo.grupoId)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-orange-500 text-lg">{isOpen ? '▼' : '▶'}</span>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-white">{grupo.grupoNome}</h2>
                      <p className="text-xs text-gray-400">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alertas > 0 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                        {alertas} baixo{alertas > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-gray-300">
                      {totalItens}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-3 space-y-2 bg-zinc-950">
                    {grupo.itens.map(item => (
                      <div key={item.id} className={`p-3 rounded-lg border ${item.quantidade <= item.estoqueMinimo ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-white text-sm truncate">{item.produto?.nome}</h3>
                            <p className="text-xs text-gray-500">{item.loja?.nomeFantasia}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.produto?.tipo === 'MOTO' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                              {item.produto?.tipo}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.quantidade <= item.estoqueMinimo ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                              {item.quantidade <= item.estoqueMinimo ? 'Baixo' : 'OK'}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => handleEditar(item)}>Editar</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 text-[10px]">Qtd</p>
                            <p className="text-white text-lg font-bold">{item.quantidade}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[10px]">Min</p>
                            <p className="text-gray-300">{item.estoqueMinimo}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-[10px]">Max</p>
                            <p className="text-gray-300">{item.estoqueMaximo || '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
