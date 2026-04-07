import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface NotaFiscal {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  status: string;
  numero?: string;
  serie?: string;
  chaveAcesso?: string;
  emitenteCnpj?: string;
  emitenteNome?: string;
  destinatarioCnpj?: string;
  destinatarioNome?: string;
  valorTotal: number;
  valorIcms?: number;
  valorIpi?: number;
  valorPis?: number;
  valorCofins?: number;
  dataEmissao: string;
  dataEntrada?: string;
  observacoes?: string;
  fornecedorId?: number;
  pedidoCompraId?: number;
  vendaId?: number;
  lojaId: number;
  loja?: { id: number; nomeFantasia?: string; cnpj: string };
  fornecedor?: { id: number; razaoSocial: string; cnpj?: string };
  _count?: { itens: number };
}

const STATUS_COLOR: Record<string, string> = {
  PENDENTE: 'text-yellow-400 bg-yellow-400/10',
  AUTORIZADA: 'text-green-400 bg-green-400/10',
  CANCELADA: 'text-red-400 bg-red-400/10',
  INUTILIZADA: 'text-zinc-400 bg-zinc-400/10',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

function imprimirNF(nf: NotaFiscal) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { alert('Permita pop-ups para imprimir.'); return; }
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>NF-e #${nf.numero ?? nf.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: bold; }
    .header h2 { font-size: 13px; color: #555; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-autorizada { background: #d1fae5; color: #065f46; }
    .badge-pendente { background: #fef3c7; color: #92400e; }
    .badge-cancelada { background: #fee2e2; color: #991b1b; }
    .section { margin-bottom: 14px; }
    .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #555; border-bottom: 1px solid #ddd; margin-bottom: 8px; padding-bottom: 4px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
    .field label { color: #666; font-size: 10px; display: block; }
    .field span { font-weight: 600; }
    .chave { font-family: monospace; font-size: 9px; word-break: break-all; background: #f3f4f6; padding: 4px 6px; border-radius: 4px; }
    .totais { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
    .totais-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totais-row.total { font-weight: bold; font-size: 14px; border-top: 1px solid #d1d5db; padding-top: 6px; margin-top: 4px; }
    .obs { background: #fafafa; border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; color: #444; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    @media print {
      body { padding: 10px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NOTA FISCAL ELETRÔNICA</h1>
    <h2>${nf.tipo === 'ENTRADA' ? '📥 Nota de Entrada' : '📤 Nota de Saída'} &nbsp;|&nbsp;
      <span class="badge badge-${(nf.status || '').toLowerCase()}">${nf.status}</span>
    </h2>
  </div>

  <div class="section">
    <div class="section-title">Identificação</div>
    <div class="grid2">
      <div class="field"><label>Número / Série</label><span>${nf.numero ?? '—'} / ${nf.serie ?? '001'}</span></div>
      <div class="field"><label>Data de Emissão</label><span>${fmtDate(nf.dataEmissao)}</span></div>
      ${nf.dataEntrada ? `<div class="field"><label>Data de Entrada</label><span>${fmtDate(nf.dataEntrada)}</span></div>` : ''}
    </div>
    ${nf.chaveAcesso ? `<div style="margin-top:8px;"><div class="section-title" style="margin-bottom:4px;">Chave de Acesso</div><div class="chave">${nf.chaveAcesso}</div></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Emitente</div>
    <div class="grid2">
      <div class="field"><label>Razão Social</label><span>${nf.emitenteNome ?? (nf.loja?.nomeFantasia ?? '—')}</span></div>
      <div class="field"><label>CNPJ</label><span>${nf.emitenteCnpj ?? (nf.loja?.cnpj ?? '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Destinatário</div>
    <div class="grid2">
      <div class="field"><label>Razão Social</label><span>${nf.destinatarioNome ?? (nf.fornecedor?.razaoSocial ?? '—')}</span></div>
      <div class="field"><label>CNPJ / CPF</label><span>${nf.destinatarioCnpj ?? (nf.fornecedor?.cnpj ?? '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div class="totais">
      <div class="totais-row"><span>ICMS</span><span>${fmt(Number(nf.valorIcms ?? 0))}</span></div>
      <div class="totais-row"><span>IPI</span><span>${fmt(Number(nf.valorIpi ?? 0))}</span></div>
      <div class="totais-row"><span>PIS</span><span>${fmt(Number(nf.valorPis ?? 0))}</span></div>
      <div class="totais-row"><span>COFINS</span><span>${fmt(Number(nf.valorCofins ?? 0))}</span></div>
      <div class="totais-row total"><span>TOTAL DA NOTA</span><span>${fmt(Number(nf.valorTotal))}</span></div>
    </div>
  </div>

  ${nf.observacoes ? `<div class="section"><div class="section-title">Observações</div><div class="obs">${nf.observacoes}</div></div>` : ''}

  <div class="footer">
    Documento gerado pelo sistema TM Imports / Tecle Motos &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')}
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="background:#f97316;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer;font-weight:bold;">
      🖨️ Imprimir / Salvar PDF
    </button>
  </div>
</body>
</html>`;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export function NotasFiscais() {
  const { user } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<NotaFiscal | null>(null);
  const [lojas, setLojas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [form, setForm] = useState<Partial<NotaFiscal & { itens: any[] }>>({
    tipo: 'ENTRADA', status: 'PENDENTE', valorTotal: 0, itens: [],
  });

  useEffect(() => { loadNotas(); loadLojas(); loadFornecedores(); }, []);
  useEffect(() => { loadNotas(); }, [filtroTipo, filtroStatus, filtroMes]);

  async function loadNotas() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroMes) params.set('mes', filtroMes);
      const data = await api.get<any>(`/notas-fiscais?${params}`);
      setNotas(Array.isArray(data) ? data : []);
    } catch { setNotas([]); } finally { setLoading(false); }
  }

  async function loadLojas() {
    try {
      const data = await api.get<any>('/lojas');
      setLojas(Array.isArray(data) ? data : data.lojas ?? []);
    } catch { setLojas([]); }
  }

  async function loadFornecedores() {
    try {
      const data = await api.get<any>('/fornecedores');
      setFornecedores(Array.isArray(data) ? data : data.data ?? []);
    } catch { setFornecedores([]); }
  }

  async function saveNota() {
    const { itens, ...body } = form;
    if (form.id) {
      await api.put(`/notas-fiscais/${form.id}`, { ...body, itens });
    } else {
      await api.post('/notas-fiscais', { ...body, itens });
    }
    setShowModal(false);
    setForm({ tipo: 'ENTRADA', status: 'PENDENTE', valorTotal: 0, itens: [] });
    loadNotas();
  }

  async function cancelarNota(id: number) {
    if (!confirm('Cancelar esta nota fiscal?')) return;
    await api.delete(`/notas-fiscais/${id}`);
    loadNotas();
  }

  const totalEntrada = notas.filter(n => n.tipo === 'ENTRADA').reduce((s, n) => s + Number(n.valorTotal), 0);
  const totalSaida = notas.filter(n => n.tipo === 'SAIDA').reduce((s, n) => s + Number(n.valorTotal), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notas Fiscais</h1>
          <p className="text-zinc-400 text-sm mt-1">Controle fiscal de entradas e saídas</p>
        </div>
        <button
          onClick={() => { setForm({ tipo: 'ENTRADA', status: 'PENDENTE', valorTotal: 0, itens: [], lojaId: lojas[0]?.id }); setShowModal(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          + Nova NF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="text-zinc-400 text-xs">Total Notas</div>
          <div className="text-2xl font-bold text-white">{notas.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="text-zinc-400 text-xs">Entradas (valor)</div>
          <div className="text-xl font-bold text-green-400">{fmt(totalEntrada)}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="text-zinc-400 text-xs">Saídas (valor)</div>
          <div className="text-xl font-bold text-orange-400">{fmt(totalSaida)}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="text-zinc-400 text-xs">Autorizadas</div>
          <div className="text-2xl font-bold text-blue-400">
            {notas.filter(n => n.status === 'AUTORIZADA').length}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="AUTORIZADA">Autorizada</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="INUTILIZADA">Inutilizada</option>
        </select>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm" />
        {(filtroTipo || filtroStatus || filtroMes) && (
          <button onClick={() => { setFiltroTipo(''); setFiltroStatus(''); setFiltroMes(''); }}
            className="text-zinc-400 hover:text-white text-sm px-2">✕ Limpar</button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-zinc-400 text-center py-12">Carregando...</div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-zinc-400 font-medium">Tipo</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Número/Série</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Emitente/Destinatário</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Data Emissão</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Valor Total</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {notas.length === 0 && (
                <tr><td colSpan={7} className="text-center p-8 text-zinc-500">Nenhuma nota fiscal encontrada</td></tr>
              )}
              {notas.map(n => (
                <tr key={n.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      n.tipo === 'ENTRADA' ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'
                    }`}>{n.tipo}</span>
                  </td>
                  <td className="p-4 text-white">
                    {n.numero ? `${n.numero}/${n.serie ?? '001'}` : '—'}
                    {n.chaveAcesso && (
                      <div className="text-xs text-zinc-500 font-mono">{n.chaveAcesso.slice(0, 20)}...</div>
                    )}
                  </td>
                  <td className="p-4">
                    {n.tipo === 'ENTRADA' ? (
                      <div>
                        <div className="text-white">{n.emitenteNome ?? n.fornecedor?.razaoSocial ?? '—'}</div>
                        {n.emitenteCnpj && <div className="text-xs text-zinc-500">{n.emitenteCnpj}</div>}
                      </div>
                    ) : (
                      <div>
                        <div className="text-white">{n.destinatarioNome ?? '—'}</div>
                        {n.destinatarioCnpj && <div className="text-xs text-zinc-500">{n.destinatarioCnpj}</div>}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-zinc-300">
                    {new Date(n.dataEmissao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-right text-white font-medium">{fmt(Number(n.valorTotal))}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_COLOR[n.status] ?? ''}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setSelected(n)} className="text-zinc-400 hover:text-white text-xs">Ver</button>
                      {n.status !== 'CANCELADA' && (
                        <button onClick={() => cancelarNota(n.id)} className="text-red-400 hover:text-red-300 text-xs">Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Visualização */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold text-white">NF-e #{selected.numero ?? selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-400">Tipo:</span> <span className="text-white">{selected.tipo}</span></div>
              <div><span className="text-zinc-400">Status:</span>
                <span className={`ml-1 px-2 py-0.5 rounded text-xs ${STATUS_COLOR[selected.status]}`}>{selected.status}</span>
              </div>
              <div><span className="text-zinc-400">Número/Série:</span> <span className="text-white">{selected.numero ?? '—'}/{selected.serie ?? '001'}</span></div>
              <div><span className="text-zinc-400">Data Emissão:</span> <span className="text-white">{new Date(selected.dataEmissao).toLocaleDateString('pt-BR')}</span></div>
              {selected.dataEntrada && (
                <div><span className="text-zinc-400">Data Entrada:</span> <span className="text-white">{new Date(selected.dataEntrada).toLocaleDateString('pt-BR')}</span></div>
              )}
              {selected.chaveAcesso && (
                <div className="col-span-2"><span className="text-zinc-400">Chave:</span> <span className="text-white font-mono text-xs">{selected.chaveAcesso}</span></div>
              )}
              <div><span className="text-zinc-400">Emitente:</span> <span className="text-white">{selected.emitenteNome ?? '—'}</span></div>
              <div><span className="text-zinc-400">CNPJ Emit.:</span> <span className="text-white">{selected.emitenteCnpj ?? '—'}</span></div>
              <div><span className="text-zinc-400">Destinatário:</span> <span className="text-white">{selected.destinatarioNome ?? '—'}</span></div>
              <div><span className="text-zinc-400">CNPJ Dest.:</span> <span className="text-white">{selected.destinatarioCnpj ?? '—'}</span></div>
            </div>
            <div className="border-t border-zinc-800 pt-3 grid grid-cols-3 gap-3 text-sm">
              <div className="bg-zinc-800 rounded p-3 text-center">
                <div className="text-zinc-400 text-xs">Valor Total</div>
                <div className="text-white font-bold">{fmt(Number(selected.valorTotal))}</div>
              </div>
              <div className="bg-zinc-800 rounded p-3 text-center">
                <div className="text-zinc-400 text-xs">ICMS</div>
                <div className="text-white">{fmt(Number(selected.valorIcms ?? 0))}</div>
              </div>
              <div className="bg-zinc-800 rounded p-3 text-center">
                <div className="text-zinc-400 text-xs">IPI</div>
                <div className="text-white">{fmt(Number(selected.valorIpi ?? 0))}</div>
              </div>
            </div>
            {selected.observacoes && (
              <div className="bg-zinc-800 rounded p-3 text-sm text-zinc-300">{selected.observacoes}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => imprimirNF(selected)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5"
              >
                🖨️ Imprimir / PDF
              </button>
              <button onClick={() => setSelected(null)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova NF */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold text-white">Nova Nota Fiscal</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-zinc-400">Tipo *</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as any }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1">
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1">
                  <option value="PENDENTE">Pendente</option>
                  <option value="AUTORIZADA">Autorizada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400">Número NF</label>
                <input value={form.numero ?? ''} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Série</label>
                <input value={form.serie ?? ''} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))}
                  placeholder="001" className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-zinc-400">Chave de Acesso (44 dígitos)</label>
                <input value={form.chaveAcesso ?? ''} onChange={e => setForm(p => ({ ...p, chaveAcesso: e.target.value }))}
                  maxLength={44} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 font-mono text-xs" />
              </div>
              <div>
                <label className="text-zinc-400">Nome Emitente</label>
                <input value={form.emitenteNome ?? ''} onChange={e => setForm(p => ({ ...p, emitenteNome: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">CNPJ Emitente</label>
                <input value={form.emitenteCnpj ?? ''} onChange={e => setForm(p => ({ ...p, emitenteCnpj: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Nome Destinatário</label>
                <input value={form.destinatarioNome ?? ''} onChange={e => setForm(p => ({ ...p, destinatarioNome: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">CNPJ Destinatário</label>
                <input value={form.destinatarioCnpj ?? ''} onChange={e => setForm(p => ({ ...p, destinatarioCnpj: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Data Emissão *</label>
                <input type="date" value={form.dataEmissao ? String(form.dataEmissao).slice(0, 10) : ''}
                  onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Data Entrada</label>
                <input type="date" value={form.dataEntrada ? String(form.dataEntrada).slice(0, 10) : ''}
                  onChange={e => setForm(p => ({ ...p, dataEntrada: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Valor Total *</label>
                <input type="number" step="0.01" value={form.valorTotal ?? 0}
                  onChange={e => setForm(p => ({ ...p, valorTotal: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-zinc-400">Valor ICMS</label>
                <input type="number" step="0.01" value={form.valorIcms ?? 0}
                  onChange={e => setForm(p => ({ ...p, valorIcms: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1" />
              </div>
              {fornecedores.length > 0 && (
                <div>
                  <label className="text-zinc-400">Fornecedor (opcional)</label>
                  <select value={form.fornecedorId ?? ''} onChange={e => setForm(p => ({ ...p, fornecedorId: Number(e.target.value) || undefined }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1">
                    <option value="">Sem vínculo</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
                  </select>
                </div>
              )}
              {(user?.role === 'ADMIN_GERAL' || user?.role === 'ADMIN_FINANCEIRO') && lojas.length > 0 && (
                <div>
                  <label className="text-zinc-400">Loja</label>
                  <select value={form.lojaId ?? ''} onChange={e => setForm(p => ({ ...p, lojaId: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1">
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nomeFantasia || l.razaoSocial}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-zinc-400">Observações</label>
                <textarea value={form.observacoes ?? ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  rows={2} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 mt-1 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm">Cancelar</button>
              <button onClick={saveNota} disabled={!form.valorTotal || !form.dataEmissao}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
