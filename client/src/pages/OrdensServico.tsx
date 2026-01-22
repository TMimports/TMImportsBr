import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';
import { useAuth } from '../contexts/AuthContext';

interface OrdemServico {
  id: number;
  numero: string;
  tipo: string;
  status: string;
  valorTotal: number;
  cliente: { nome: string };
  tecnico?: string;
  createdAt: string;
}

interface Cliente {
  id: number;
  nome: string;
}

interface Servico {
  id: number;
  nome: string;
  preco: number;
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

interface Usuario {
  id: number;
  nome: string;
  role: string;
}

interface ItemServico {
  servicoId: string;
  quantidade: number;
  preco: number;
}

interface ItemPeca {
  produtoId: string;
  quantidade: number;
  preco: number;
}

export function OrdensServico() {
  useAuth();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    clienteId: '',
    lojaId: '',
    tecnicoId: '',
    motoDescricao: '',
    observacoes: ''
  });

  const [servicosSelecionados, setServicosSelecionados] = useState<ItemServico[]>([]);
  const [pecasSelecionadas, setPecasSelecionadas] = useState<ItemPeca[]>([]);

  const loadData = () => {
    Promise.all([
      api.get<OrdemServico[]>('/os'),
      api.get<Cliente[]>('/clientes'),
      api.get<Servico[]>('/servicos'),
      api.get<Produto[]>('/produtos'),
      api.get<Loja[]>('/lojas'),
      api.get<Usuario[]>('/usuarios')
    ])
      .then(([ordensData, clientesData, servicosData, produtosData, lojasData, usuariosData]) => {
        setOrdens(ordensData);
        setClientes(clientesData);
        setServicos(servicosData);
        setProdutos(produtosData.filter(p => p.tipo === 'PECA'));
        setLojas(lojasData);
        setTecnicos(usuariosData.filter(u => u.role === 'TECNICO'));
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

  const adicionarServico = () => {
    setServicosSelecionados([...servicosSelecionados, { servicoId: '', quantidade: 1, preco: 0 }]);
  };

  const removerServico = (index: number) => {
    setServicosSelecionados(servicosSelecionados.filter((_, i) => i !== index));
  };

  const atualizarServico = (index: number, field: string, value: any) => {
    const novos = [...servicosSelecionados];
    if (field === 'servicoId') {
      const servico = servicos.find(s => s.id === parseInt(value));
      novos[index] = { ...novos[index], servicoId: value, preco: servico?.preco || 0 };
    } else {
      novos[index] = { ...novos[index], [field]: value };
    }
    setServicosSelecionados(novos);
  };

  const adicionarPeca = () => {
    setPecasSelecionadas([...pecasSelecionadas, { produtoId: '', quantidade: 1, preco: 0 }]);
  };

  const removerPeca = (index: number) => {
    setPecasSelecionadas(pecasSelecionadas.filter((_, i) => i !== index));
  };

  const atualizarPeca = (index: number, field: string, value: any) => {
    const novas = [...pecasSelecionadas];
    if (field === 'produtoId') {
      const produto = produtos.find(p => p.id === parseInt(value));
      novas[index] = { ...novas[index], produtoId: value, preco: produto?.preco || 0 };
    } else {
      novas[index] = { ...novas[index], [field]: value };
    }
    setPecasSelecionadas(novas);
  };

  const calcularTotal = () => {
    const totalServicos = servicosSelecionados.reduce((acc, s) => acc + (s.preco * s.quantidade), 0);
    const totalPecas = pecasSelecionadas.reduce((acc, p) => acc + (p.preco * p.quantidade), 0);
    return totalServicos + totalPecas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.lojaId) {
      alert('Selecione uma loja');
      return;
    }

    if (servicosSelecionados.length === 0 && pecasSelecionadas.length === 0) {
      alert('Adicione pelo menos um servico ou peca');
      return;
    }

    setSaving(true);
    try {
      const itens: any[] = [];
      
      servicosSelecionados.forEach(s => {
        if (s.servicoId) {
          itens.push({
            servicoId: parseInt(s.servicoId),
            quantidade: s.quantidade,
            precoUnitario: s.preco
          });
        }
      });

      pecasSelecionadas.forEach(p => {
        if (p.produtoId) {
          itens.push({
            produtoId: parseInt(p.produtoId),
            quantidade: p.quantidade,
            precoUnitario: p.preco
          });
        }
      });

      const tecnicoSelecionado = tecnicos.find(t => t.id === parseInt(form.tecnicoId));

      await api.post('/os', {
        clienteId: parseInt(form.clienteId),
        lojaId: parseInt(form.lojaId),
        tecnico: tecnicoSelecionado?.nome || form.tecnicoId || null,
        motoDescricao: form.motoDescricao,
        observacoes: form.observacoes,
        itens
      });

      setModalOpen(false);
      setForm({ clienteId: '', lojaId: lojas.length === 1 ? String(lojas[0].id) : '', tecnicoId: '', motoDescricao: '', observacoes: '' });
      setServicosSelecionados([]);
      setPecasSelecionadas([]);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusLabels: Record<string, string> = {
    ORCAMENTO: 'Orcamento',
    EM_EXECUCAO: 'Em Execucao',
    EXECUTADA: 'Executada',
    ABERTA: 'Aberta',
    CONCLUIDA: 'Concluida'
  };

  const statusColors: Record<string, string> = {
    ORCAMENTO: 'badge-warning',
    EM_EXECUCAO: 'badge-primary',
    EXECUTADA: 'badge-success',
    ABERTA: 'badge-primary',
    CONCLUIDA: 'badge-success'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ordens de Servico</h1>
        <div className="flex gap-2">
          <ImportExport entity="os" onImportSuccess={loadData} />
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ Nova OS</button>
        </div>
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">#</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Cliente</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tecnico</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhuma OS encontrada
                </td>
              </tr>
            ) : (
              ordens.map(os => (
                <tr key={os.id} className="hover:bg-zinc-700 cursor-pointer">
                  <td className="p-3 border-b border-zinc-700">{os.numero || os.id}</td>
                  <td className="p-3 border-b border-zinc-700">{os.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{os.tecnico || '-'}</td>
                  <td className="p-3 border-b border-zinc-700 font-semibold text-green-400">
                    R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    <span className={`badge ${statusColors[os.status] || 'badge-primary'}`}>
                      {statusLabels[os.status] || os.status}
                    </span>
                  </td>
                  <td className="p-3 border-b border-zinc-700">
                    {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova Ordem de Servico">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
            <label className="label">Descricao da Moto/Veiculo</label>
            <input
              type="text"
              value={form.motoDescricao}
              onChange={(e) => setForm({ ...form, motoDescricao: e.target.value })}
              className="input"
              placeholder="Ex: Honda Biz 125 - Placa ABC1234"
            />
          </div>

          <div>
            <label className="label">Tecnico</label>
            <select
              value={form.tecnicoId}
              onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })}
              className="input"
            >
              <option value="">Selecione...</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Servicos</label>
              <button type="button" onClick={adicionarServico} className="btn btn-sm btn-secondary">
                + Adicionar Servico
              </button>
            </div>
            {servicosSelecionados.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum servico adicionado</p>
            ) : (
              <div className="space-y-2">
                {servicosSelecionados.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={item.servicoId}
                      onChange={(e) => atualizarServico(index, 'servicoId', e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">Selecione...</option>
                      {servicos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nome} - R$ {Number(s.preco).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarServico(index, 'quantidade', parseInt(e.target.value))}
                      className="input w-20"
                    />
                    <span className="text-green-400 w-24 text-right">
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removerServico(index)} className="text-red-500 hover:text-red-400">
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Pecas</label>
              <button type="button" onClick={adicionarPeca} className="btn btn-sm btn-secondary">
                + Adicionar Peca
              </button>
            </div>
            {pecasSelecionadas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma peca adicionada</p>
            ) : (
              <div className="space-y-2">
                {pecasSelecionadas.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={item.produtoId}
                      onChange={(e) => atualizarPeca(index, 'produtoId', e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">Selecione...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} - R$ {Number(p.preco).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarPeca(index, 'quantidade', parseInt(e.target.value))}
                      className="input w-20"
                    />
                    <span className="text-green-400 w-24 text-right">
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removerPeca(index)} className="text-red-500 hover:text-red-400">
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Observacoes</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-400">
                R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar OS'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
