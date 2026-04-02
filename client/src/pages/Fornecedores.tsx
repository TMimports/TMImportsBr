import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Fornecedor {
  id: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  cpf?: string;
  classe: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cidade?: string;
  estado?: string;
  contato?: string;
  site?: string;
  observacoes?: string;
  ativo: boolean;
  lojaId: number;
  loja?: { id: number; nomeFantasia?: string; cnpj: string };
  _count?: { interacoes: number; contasPagar: number };
}

interface Interacao {
  id: number;
  tipo: string;
  titulo: string;
  descricao?: string;
  resultado?: string;
  proximoContato?: string;
  createdAt: string;
  usuario: { id: number; nome: string };
}

const TIPO_INTERACAO = ['LIGACAO', 'EMAIL', 'REUNIAO', 'VISITA', 'OBSERVACAO', 'FOLLOW_UP'];
const TIPO_LABEL: Record<string, string> = {
  LIGACAO: '📞 Ligação', EMAIL: '📧 E-mail', REUNIAO: '🤝 Reunião',
  VISITA: '🏢 Visita', OBSERVACAO: '📝 Observação', FOLLOW_UP: '🔔 Follow-up',
};
const CLASSE_LABEL: Record<string, string> = {
  PRODUTO: 'Produto', SERVICO: 'Serviço', AMBOS: 'Produto e Serviço',
};

export function Fornecedores() {
  const { token, user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showInteracao, setShowInteracao] = useState(false);
  const [lojas, setLojas] = useState<any[]>([]);
  const [form, setForm] = useState<Partial<Fornecedor>>({});
  const [interForm, setInterForm] = useState({ tipo: 'OBSERVACAO', titulo: '', descricao: '', resultado: '', proximoContato: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadFornecedores(); loadLojas(); }, []);

  async function loadFornecedores() {
    setLoading(true);
    try {
      const r = await fetch('/api/fornecedores', { headers });
      setFornecedores(await r.json());
    } finally { setLoading(false); }
  }

  async function loadLojas() {
    try {
      const r = await fetch('/api/lojas', { headers });
      const data = await r.json();
      setLojas(Array.isArray(data) ? data : data.lojas ?? []);
    } catch {}
  }

  async function openDetail(f: Fornecedor) {
    setSelected(f);
    const r = await fetch(`/api/crm/interacoes?fornecedorId=${f.id}`, { headers });
    setInteracoes(await r.json());
  }

  async function saveFornecedor() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/fornecedores/${form.id}` : '/api/fornecedores';
    await fetch(url, { method, headers, body: JSON.stringify(form) });
    setShowModal(false);
    setForm({});
    loadFornecedores();
  }

  async function saveInteracao() {
    if (!selected) return;
    await fetch('/api/crm/interacoes', {
      method: 'POST', headers,
      body: JSON.stringify({ ...interForm, fornecedorId: selected.id }),
    });
    setShowInteracao(false);
    setInterForm({ tipo: 'OBSERVACAO', titulo: '', descricao: '', resultado: '', proximoContato: '' });
    openDetail(selected);
  }

  const filtered = fornecedores.filter(f =>
    f.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
    (f.nomeFantasia ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (f.cnpj ?? '').includes(busca)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fornecedores</h1>
          <p className="text-zinc-400 text-sm mt-1">CRM de fornecedores e histórico de relacionamento</p>
        </div>
        <button
          onClick={() => { setForm({ ativo: true, classe: 'PRODUTO', lojaId: lojas[0]?.id }); setShowModal(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          + Novo Fornecedor
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, fantasia ou CNPJ..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500"
      />

      {loading ? (
        <div className="text-zinc-400 text-center py-12">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lista */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-zinc-500 text-center py-8 bg-zinc-900 rounded-lg">Nenhum fornecedor encontrado</div>
            )}
            {filtered.map(f => (
              <div
                key={f.id}
                onClick={() => openDetail(f)}
                className={`bg-zinc-900 rounded-lg p-4 cursor-pointer border transition-colors ${
                  selected?.id === f.id ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{f.razaoSocial}</div>
                    {f.nomeFantasia && <div className="text-zinc-400 text-sm">{f.nomeFantasia}</div>}
                    <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                      {f.cnpj && <span>CNPJ: {f.cnpj}</span>}
                      {f.cidade && <span>📍 {f.cidade}/{f.estado}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.classe === 'PRODUTO' ? 'bg-blue-500/20 text-blue-300' :
                      f.classe === 'SERVICO' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>{CLASSE_LABEL[f.classe]}</span>
                    {f._count && (
                      <span className="text-xs text-zinc-500">{f._count.interacoes} interações</span>
                    )}
                    {!f.ativo && <span className="text-xs text-red-400">Inativo</span>}
                  </div>
                </div>
                {f.telefone && <div className="text-xs text-zinc-500 mt-1">📞 {f.telefone}</div>}
              </div>
            ))}
          </div>

          {/* Detalhe e Timeline */}
          {selected ? (
            <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.razaoSocial}</h2>
                  {selected.nomeFantasia && <p className="text-zinc-400 text-sm">{selected.nomeFantasia}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setForm(selected); setShowModal(true); }}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm"
                  >Editar</button>
                  <button
                    onClick={() => setShowInteracao(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
                  >+ Interação</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {selected.cnpj && <div><span className="text-zinc-400">CNPJ:</span> <span className="text-white">{selected.cnpj}</span></div>}
                {selected.email && <div><span className="text-zinc-400">E-mail:</span> <span className="text-white">{selected.email}</span></div>}
                {selected.telefone && <div><span className="text-zinc-400">Tel:</span> <span className="text-white">{selected.telefone}</span></div>}
                {selected.celular && <div><span className="text-zinc-400">Cel:</span> <span className="text-white">{selected.celular}</span></div>}
                {selected.contato && <div><span className="text-zinc-400">Contato:</span> <span className="text-white">{selected.contato}</span></div>}
                {selected.site && <div><span className="text-zinc-400">Site:</span> <a href={selected.site} target="_blank" className="text-orange-400">{selected.site}</a></div>}
                {selected.cidade && (
                  <div className="col-span-2"><span className="text-zinc-400">Endereço:</span> <span className="text-white">{selected.cidade}/{selected.estado}</span></div>
                )}
              </div>

              {selected.observacoes && (
                <div className="bg-zinc-800 rounded p-3 text-sm text-zinc-300">{selected.observacoes}</div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">📋 Histórico de Interações</h3>
                {interacoes.length === 0 ? (
                  <div className="text-zinc-500 text-sm text-center py-4">Nenhuma interação registrada</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {interacoes.map(i => (
                      <div key={i.id} className="bg-zinc-800 rounded p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-orange-400">{TIPO_LABEL[i.tipo] ?? i.tipo}</span>
                          <span className="text-zinc-500 text-xs">
                            {new Date(i.createdAt).toLocaleDateString('pt-BR')} — {i.usuario.nome}
                          </span>
                        </div>
                        <div className="text-white font-medium mt-0.5">{i.titulo}</div>
                        {i.descricao && <div className="text-zinc-400 mt-1">{i.descricao}</div>}
                        {i.resultado && <div className="text-green-400 mt-1">✓ {i.resultado}</div>}
                        {i.proximoContato && (
                          <div className="text-yellow-400 mt-1 text-xs">
                            🔔 Próximo contato: {new Date(i.proximoContato).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 text-sm">
              Selecione um fornecedor para ver os detalhes
            </div>
          )}
        </div>
      )}

      {/* Modal Fornecedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold text-white">{form.id ? 'Editar' : 'Novo'} Fornecedor</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-zinc-400 text-sm">Razão Social *</label>
                <input value={form.razaoSocial ?? ''} onChange={e => setForm(p => ({ ...p, razaoSocial: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Nome Fantasia</label>
                <input value={form.nomeFantasia ?? ''} onChange={e => setForm(p => ({ ...p, nomeFantasia: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Classe</label>
                <select value={form.classe ?? 'PRODUTO'} onChange={e => setForm(p => ({ ...p, classe: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm">
                  <option value="PRODUTO">Produto</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="AMBOS">Ambos</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">CNPJ</label>
                <input value={form.cnpj ?? ''} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">CPF</label>
                <input value={form.cpf ?? ''} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">E-mail</label>
                <input value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" type="email" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Telefone</label>
                <input value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Celular</label>
                <input value={form.celular ?? ''} onChange={e => setForm(p => ({ ...p, celular: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Nome do Contato</label>
                <input value={form.contato ?? ''} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Cidade</label>
                <input value={form.cidade ?? ''} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Estado</label>
                <input value={form.estado ?? ''} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" maxLength={2} placeholder="SP" />
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Site</label>
                <input value={form.site ?? ''} onChange={e => setForm(p => ({ ...p, site: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" placeholder="https://" />
              </div>
              {(user?.role === 'ADMIN_GERAL' || user?.role === 'ADMIN_FINANCEIRO') && lojas.length > 0 && (
                <div>
                  <label className="text-zinc-400 text-sm">Loja</label>
                  <select value={form.lojaId ?? ''} onChange={e => setForm(p => ({ ...p, lojaId: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm">
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia || l.razaoSocial}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-zinc-400 text-sm">Observações</label>
                <textarea value={form.observacoes ?? ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  rows={3} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm">Cancelar</button>
              <button onClick={saveFornecedor} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Interação */}
      {showInteracao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold text-white">Nova Interação</h2>
              <button onClick={() => setShowInteracao(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Tipo *</label>
              <select value={interForm.tipo} onChange={e => setInterForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm">
                {TIPO_INTERACAO.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Título *</label>
              <input value={interForm.titulo} onChange={e => setInterForm(p => ({ ...p, titulo: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Descrição</label>
              <textarea value={interForm.descricao} onChange={e => setInterForm(p => ({ ...p, descricao: e.target.value }))}
                rows={3} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm resize-none" />
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Resultado / Conclusão</label>
              <input value={interForm.resultado} onChange={e => setInterForm(p => ({ ...p, resultado: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
            </div>
            {interForm.tipo === 'FOLLOW_UP' && (
              <div>
                <label className="text-zinc-400 text-sm">Próximo Contato</label>
                <input type="date" value={interForm.proximoContato} onChange={e => setInterForm(p => ({ ...p, proximoContato: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 text-sm" />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowInteracao(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm">Cancelar</button>
              <button onClick={saveInteracao} disabled={!interForm.titulo} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
