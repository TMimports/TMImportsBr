import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { Button, Input, Select } from '../components/ui';

interface ContaPagar {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  loja?: { nomeFantasia: string };
}


interface Loja {
  id: number;
  nomeFantasia: string;
}

const categorias = [
  'LUZ', 'AGUA', 'GAS', 'INTERNET', 'ALUGUEL', 'IPTU', 'CONDOMINIO', 'FORNECEDORES', 'OUTROS'
];

const initialForm = {
  lojaId: '',
  categoria: 'OUTROS',
  descricao: '',
  valor: '',
  vencimento: '',
  recorrente: false,
  recorrencia: 'MENSAL'
};

const recorrencias = [
  { value: 'SEMANAL', label: 'Semanal (52x)' },
  { value: 'QUINZENAL', label: 'Quinzenal (26x)' },
  { value: 'MENSAL', label: 'Mensal (12x)' },
  { value: 'SEMESTRAL', label: 'Semestral (4x)' },
  { value: 'ANUAL', label: 'Anual (2x)' }
];

export function Financeiro() {
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadData = () => {
    setLoading(true);
    api.get<ContaPagar[]>('/financeiro/contas-pagar')
      .then(setContasPagar)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    api.get<Loja[]>('/lojas').then(setLojas).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/financeiro/contas-pagar', {
        lojaId: Number(form.lojaId),
        categoria: form.categoria,
        descricao: form.descricao,
        valor: Number(form.valor),
        vencimento: form.vencimento,
        recorrente: form.recorrente,
        recorrencia: form.recorrente ? form.recorrencia : null
      });
      setModalOpen(false);
      setForm(initialForm);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarPago = async (id: number) => {
    try {
      await api.put(`/financeiro/contas-pagar/${id}/pagar`, {});
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Financeiro</h1>
        <Button variant="primary" onClick={() => setModalOpen(true)}>+ Nova Conta a Pagar</Button>
      </div>


      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">Descricao</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium">Loja</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Vencimento</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : contasPagar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Nenhuma conta a pagar</td>
                </tr>
              ) : (
                contasPagar.map(conta => (
                  <tr key={conta.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 text-white">{conta.descricao}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-gray-300">
                        {conta.categoria}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{conta.loja?.nomeFantasia || '-'}</td>
                    <td className="py-3 font-semibold text-red-400">
                      R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-gray-300">
                      {new Date(conta.vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${conta.pago ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {conta.pago ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3">
                      {!conta.pago && (
                        <Button variant="success" size="sm" onClick={() => handleMarcarPago(conta.id)}>
                          Marcar Pago
                        </Button>
                      )}
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
        title="Nova Conta a Pagar"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Loja *"
            value={form.lojaId}
            onChange={(e) => setForm({ ...form, lojaId: e.target.value })}
            required
            placeholder="Selecione uma loja"
            options={lojas.map(l => ({ value: l.id, label: l.nomeFantasia }))}
          />

          <Select
            label="Categoria *"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            required
            options={categorias.map(c => ({ value: c, label: c }))}
          />

          <Input
            label="Descricao *"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            required
          />

          <Input
            label="Valor *"
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />

          <Input
            label="Vencimento *"
            type="date"
            value={form.vencimento}
            onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            required
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-300">Conta Recorrente</span>
            </label>
          </div>

          {form.recorrente && (
            <Select
              label="Frequencia"
              value={form.recorrencia}
              onChange={(e) => setForm({ ...form, recorrencia: e.target.value })}
              options={recorrencias}
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
