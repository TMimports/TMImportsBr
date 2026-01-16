import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ImportExport } from '../components/ImportExport';

interface OrdemServico {
  id: number;
  tipo: string;
  status: string;
  valorTotal: number;
  cliente: { nome: string };
  tecnico?: { nome: string };
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

export function OrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    servicoId: '',
    tipo: 'MANUTENCAO',
    observacoes: ''
  });

  const loadData = () => {
    Promise.all([
      api.get<OrdemServico[]>('/os'),
      api.get<Cliente[]>('/clientes'),
      api.get<Servico[]>('/servicos')
    ])
      .then(([ordensData, clientesData, servicosData]) => {
        setOrdens(ordensData);
        setClientes(clientesData);
        setServicos(servicosData);
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
      await api.post('/os', {
        clienteId: parseInt(form.clienteId),
        tipo: form.tipo,
        observacoes: form.observacoes,
        itens: [{
          servicoId: parseInt(form.servicoId),
          quantidade: 1
        }]
      });
      setModalOpen(false);
      setForm({ clienteId: '', servicoId: '', tipo: 'MANUTENCAO', observacoes: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusLabels: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANDAMENTO: 'Em Andamento',
    AGUARDANDO_PECA: 'Aguardando Peca',
    CONCLUIDA: 'Concluida',
    ENTREGUE: 'Entregue',
    CANCELADA: 'Cancelada'
  };

  const statusColors: Record<string, string> = {
    ABERTA: 'badge-primary',
    EM_ANDAMENTO: 'badge-warning',
    AGUARDANDO_PECA: 'badge-danger',
    CONCLUIDA: 'badge-success',
    ENTREGUE: 'badge-success',
    CANCELADA: 'badge-danger'
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
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tipo</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Tecnico</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Valor</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Status</th>
              <th className="text-left p-3 border-b border-zinc-700 text-gray-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nenhuma OS encontrada
                </td>
              </tr>
            ) : (
              ordens.map(os => (
                <tr key={os.id} className="hover:bg-zinc-700 cursor-pointer">
                  <td className="p-3 border-b border-zinc-700">{os.id}</td>
                  <td className="p-3 border-b border-zinc-700">{os.cliente?.nome}</td>
                  <td className="p-3 border-b border-zinc-700">{os.tipo}</td>
                  <td className="p-3 border-b border-zinc-700">{os.tecnico?.nome || '-'}</td>
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="label">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="input"
            >
              <option value="MANUTENCAO">Manutencao</option>
              <option value="REVISAO">Revisao</option>
              <option value="REPARO">Reparo</option>
              <option value="GARANTIA">Garantia</option>
            </select>
          </div>
          <div>
            <label className="label">Servico *</label>
            <select
              value={form.servicoId}
              onChange={(e) => setForm({ ...form, servicoId: e.target.value })}
              className="input"
              required
            >
              <option value="">Selecione...</option>
              {servicos.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} - R$ {Number(s.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
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
