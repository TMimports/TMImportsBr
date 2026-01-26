import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ContaReceber {
  id: number;
  lojaId: number;
  clienteId: number | null;
  descricao: string;
  valor: number;
  vencimento: string;
  recorrente: boolean;
  recorrencia: string | null;
  pago: boolean;
  dataPago: string | null;
  createdAt: string;
  loja: { id: number; nomeFantasia: string };
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

export function ContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'pagas'>('pendentes');
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });

  const [form, setForm] = useState({
    lojaId: '',
    descricao: '',
    valor: '',
    vencimento: '',
    recorrente: false,
    recorrencia: 'MENSAL'
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<ContaReceber[]>('/financeiro/contas-receber'),
      api.get<Loja[]>('/lojas')
    ])
      .then(([contasData, lojasData]) => {
        setContas(contasData);
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
    try {
      const dados = {
        ...form,
        valor: Number(form.valor),
        lojaId: Number(form.lojaId)
      };
      
      if (editando) {
        await api.put(`/financeiro/contas-receber/${editando}`, dados);
      } else {
        await api.post('/financeiro/contas-receber', dados);
      }
      setModalOpen(false);
      setEditando(null);
      setForm({ lojaId: lojas.length === 1 ? String(lojas[0].id) : '', descricao: '', valor: '', vencimento: '', recorrente: false, recorrencia: 'MENSAL' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar conta a receber');
    }
  };

  const handleEditar = (conta: ContaReceber) => {
    setEditando(conta.id);
    setForm({
      lojaId: String(conta.lojaId),
      descricao: conta.descricao,
      valor: String(conta.valor),
      vencimento: conta.vencimento.split('T')[0],
      recorrente: conta.recorrente,
      recorrencia: conta.recorrencia || 'MENSAL'
    });
    setModalOpen(true);
  };

  const marcarRecebido = async (id: number) => {
    try {
      await api.put(`/financeiro/contas-receber/${id}/receber`, {});
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao marcar como recebido');
    }
  };

  const contasFiltradas = contas.filter(c => {
    const vencimento = new Date(c.vencimento);
    const mesVencimento = `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, '0')}`;
    if (mesVencimento !== mesSelecionado) return false;
    if (filtro === 'pendentes') return !c.pago;
    if (filtro === 'pagas') return c.pago;
    return true;
  });

  const totalPendente = contas.filter(c => !c.pago).reduce((acc, c) => acc + Number(c.valor), 0);
  const totalRecebido = contas.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contas a Receber</h1>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          + Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-400 text-sm">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-400">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Total Recebido</p>
          <p className="text-2xl font-bold text-green-400">
            R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Mes</p>
          <input 
            type="month"
            value={mesSelecionado} 
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Filtrar</p>
          <select 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value as any)}
            className="input mt-1"
          >
            <option value="todas">Todas</option>
            <option value="pendentes">Pendentes</option>
            <option value="pagas">Recebidas</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left p-3 text-gray-400">Loja</th>
              <th className="text-left p-3 text-gray-400">Descricao</th>
              <th className="text-right p-3 text-gray-400">Valor</th>
              <th className="text-left p-3 text-gray-400">Vencimento</th>
              <th className="text-left p-3 text-gray-400">Status</th>
              <th className="text-left p-3 text-gray-400">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {contasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhuma conta encontrada
                </td>
              </tr>
            ) : (
              contasFiltradas.map(conta => (
                <tr key={conta.id} className="border-b border-zinc-800 hover:bg-zinc-800">
                  <td className="p-3">{conta.loja?.nomeFantasia}</td>
                  <td className="p-3">
                    {conta.descricao}
                    {conta.recorrente && (
                      <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                        {conta.recorrencia}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-400">
                    R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    {new Date(conta.vencimento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${conta.pago ? 'badge-success' : 'badge-warning'}`}>
                      {conta.pago ? 'Recebido' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {!conta.pago && (
                      <>
                        <button 
                          onClick={() => handleEditar(conta)}
                          className="btn btn-sm btn-secondary"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => marcarRecebido(conta.id)}
                          className="btn btn-sm btn-success"
                        >
                          Receber
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editando ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {lojas.length > 1 && (
                <div>
                  <label className="label">Loja</label>
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
                <label className="label">Descricao</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Vencimento</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recorrente"
                  checked={form.recorrente}
                  onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
                />
                <label htmlFor="recorrente">Conta Recorrente</label>
              </div>

              {form.recorrente && (
                <div>
                  <label className="label">Frequencia</label>
                  <select
                    value={form.recorrencia}
                    onChange={(e) => setForm({ ...form, recorrencia: e.target.value })}
                    className="input"
                  >
                    <option value="SEMANAL">Semanal (52 lancamentos)</option>
                    <option value="QUINZENAL">Quinzenal (26 lancamentos)</option>
                    <option value="MENSAL">Mensal (12 lancamentos)</option>
                    <option value="SEMESTRAL">Semestral (4 lancamentos)</option>
                    <option value="ANUAL">Anual (2 lancamentos)</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setModalOpen(false); setEditando(null); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editando ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
