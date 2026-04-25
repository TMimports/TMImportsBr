import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LojaEstoque {
  lojaId: number;
  nomeFantasia: string;
  endereco?: string;
  quantidade: number;
}

interface ResultadoBusca {
  produto: { id: number; nome: string; tipo: string; codigo: string; preco: number };
  lojas: LojaEstoque[];
}

interface Transferencia {
  id: number;
  status: 'SOLICITADA' | 'APROVADA' | 'REJEITADA' | 'CONCLUIDA';
  quantidade: number;
  createdAt: string;
  produto: { id: number; nome: string; tipo: string; codigo: string } | null;
  lojaOrigem: { id: number; nomeFantasia: string } | null;
  lojaDestino: { id: number; nomeFantasia: string } | null;
  solicitadoPorUser: { id: number; nome: string; role: string } | null;
  aprovadoPorUser: { id: number; nome: string; role: string } | null;
  unidadeFisica: { id: number; chassi: string; cor?: string; ano?: number } | null;
}

interface UnidadeFisica {
  id: number;
  chassi: string;
  cor?: string;
  ano?: number;
  produtoId: number;
}

interface Loja {
  id: number;
  nomeFantasia: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SOLICITADA: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    APROVADA:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    REJEITADA:  'bg-red-500/15 text-red-400 border border-red-500/30',
    CONCLUIDA:  'bg-green-500/15 text-green-400 border border-green-500/30',
  };
  const label: Record<string, string> = {
    SOLICITADA: '⏳ Aguardando aprovação',
    APROVADA:   '🚚 Em trânsito',
    REJEITADA:  '✕ Rejeitada',
    CONCLUIDA:  '✓ Concluída',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-zinc-700 text-zinc-300'}`}>
      {label[status] || status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Transferencias() {
  const { user } = useAuth();
  const role = user?.role || '';
  const podeAprovar = ['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(role);
  const minhaLojaId = user?.lojaId || null;

  // Search
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscaFeita, setBuscaFeita] = useState(false);

  // Available lojas
  const [minhasLojas, setMinhasLojas] = useState<Loja[]>([]);

  // Request modal
  const [solicitando, setSolicitando] = useState<{ produto: ResultadoBusca['produto']; origem: LojaEstoque } | null>(null);
  const [formLojaDestino, setFormLojaDestino] = useState('');
  const [formQtd, setFormQtd] = useState('1');
  const [formObs, setFormObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  // Transfer list
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Approval with chassi (for admins)
  const [aprovandoTransf, setAprovandoTransf] = useState<Transferencia | null>(null);
  const [chassisDisponiveis, setChassiDisponiveis] = useState<UnidadeFisica[]>([]);
  const [chassiSelecionado, setChassiSelecionado] = useState('');
  const [carregandoChassi, setCarregandoChassi] = useState(false);
  const [erroAprovacao, setErroAprovacao] = useState('');

  // Bulk selection
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [aprovandoLote, setAprovandoLote] = useState(false);

  // Actions
  const [atualizando, setAtualizando] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState('');

  const carregarLojas = useCallback(async () => {
    try {
      const data = await api.get<Loja[]>('/lojas?ativo=true');
      setMinhasLojas(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const carregarTransferencias = useCallback(async () => {
    try {
      const data = await api.get<Transferencia[]>('/transferencias');
      setTransferencias(Array.isArray(data) ? data : []);
    } catch {
      setTransferencias([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarLojas();
    carregarTransferencias();
  }, [carregarLojas, carregarTransferencias]);

  const buscarProduto = async () => {
    if (busca.trim().length < 2) return;
    setBuscando(true);
    setBuscaFeita(true);
    try {
      const data = await api.get<ResultadoBusca[]>(`/estoque/buscar-rede?q=${encodeURIComponent(busca.trim())}`);
      setResultados(Array.isArray(data) ? data : []);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  const abrirSolicitar = (produto: ResultadoBusca['produto'], origem: LojaEstoque) => {
    setSolicitando({ produto, origem });
    setFormLojaDestino(minhaLojaId ? String(minhaLojaId) : '');
    setFormQtd('1');
    setFormObs('');
    setErroForm('');
  };

  const enviarSolicitacao = async () => {
    if (!solicitando) return;
    if (!formLojaDestino) { setErroForm('Selecione a loja de destino'); return; }
    if (Number(formLojaDestino) === solicitando.origem.lojaId) { setErroForm('Origem e destino devem ser diferentes'); return; }

    setEnviando(true);
    setErroForm('');
    try {
      await api.post('/transferencias', {
        produtoId:     solicitando.produto.id,
        lojaOrigemId:  solicitando.origem.lojaId,
        lojaDestinoId: Number(formLojaDestino),
        quantidade:    solicitando.produto.tipo === 'MOTO' ? 1 : Number(formQtd),
      });
      setSolicitando(null);
      setResultados([]);
      setBusca('');
      setBuscaFeita(false);
      await carregarTransferencias();
    } catch (err: any) {
      setErroForm(err.message || 'Erro ao solicitar transferência');
    } finally {
      setEnviando(false);
    }
  };

  // Open approval modal (for admins) — loads available chassi from origem
  const abrirAprovacao = async (t: Transferencia) => {
    setAprovandoTransf(t);
    setErroAprovacao('');
    setChassiDisponiveis([]);

    // Se o chassi já está definido na transferência, apenas pré-seleciona
    if (t.unidadeFisica) {
      setChassiSelecionado(String(t.unidadeFisica.id));
      return;
    }

    setChassiSelecionado('');
    if (t.produto?.tipo === 'MOTO' && t.lojaOrigem) {
      setCarregandoChassi(true);
      try {
        const data = await api.get<any[]>(`/unidades/disponiveis/${t.lojaOrigem.id}`);
        const filtradas = Array.isArray(data) ? data.filter(u => u.produtoId === t.produto?.id) : [];
        setChassiDisponiveis(filtradas);
      } catch {
        setChassiDisponiveis([]);
      } finally {
        setCarregandoChassi(false);
      }
    }
  };

  const toggleSelecionado = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodosPendentes = () => {
    const aprovavéis = grupos.pendentes.filter(t => t.produto?.tipo !== 'MOTO' || t.unidadeFisica);
    const todosSelected = aprovavéis.length > 0 && aprovavéis.every(t => selecionados.has(t.id));
    if (todosSelected) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(aprovavéis.map(t => t.id)));
    }
  };

  const aprovarLote = async () => {
    if (selecionados.size === 0) return;
    if (!confirm(`Aprovar ${selecionados.size} transferência(s) selecionada(s)?`)) return;
    setAprovandoLote(true);
    setErroAcao('');
    try {
      for (const id of Array.from(selecionados)) {
        const t = transferencias.find(x => x.id === id);
        if (!t) continue;
        await api.put(`/transferencias/${id}/aprovar`, {
          unidadeFisicaId: t.unidadeFisica?.id,
        });
      }
      setSelecionados(new Set());
      await carregarTransferencias();
    } catch (err: any) {
      setErroAcao(err.message || 'Erro ao aprovar em lote');
    } finally {
      setAprovandoLote(false);
    }
  };

  const confirmarAprovacao = async () => {
    if (!aprovandoTransf) return;
    const isMoto = aprovandoTransf.produto?.tipo === 'MOTO';
    const jaTemChassi = !!aprovandoTransf.unidadeFisica;
    if (isMoto && !jaTemChassi && !chassiSelecionado) { setErroAprovacao('Selecione o chassi para autorizar'); return; }

    setAtualizando(aprovandoTransf.id);
    setErroAprovacao('');
    try {
      await api.put(`/transferencias/${aprovandoTransf.id}/aprovar`, {
        unidadeFisicaId: chassiSelecionado ? Number(chassiSelecionado) : undefined,
      });
      setAprovandoTransf(null);
      await carregarTransferencias();
    } catch (err: any) {
      setErroAprovacao(err.message || 'Erro ao aprovar');
    } finally {
      setAtualizando(null);
    }
  };

  const rejeitar = async (id: number) => {
    if (!confirm('Tem certeza que deseja rejeitar esta transferência?')) return;
    setAtualizando(id);
    setErroAcao('');
    try {
      await api.put(`/transferencias/${id}/rejeitar`, {});
      await carregarTransferencias();
    } catch (err: any) {
      setErroAcao(err.message || 'Erro ao rejeitar');
    } finally {
      setAtualizando(null);
    }
  };

  const concluir = async (id: number) => {
    if (!confirm('Confirmar recebimento desta transferência? O estoque será atualizado.')) return;
    setAtualizando(id);
    setErroAcao('');
    try {
      await api.put(`/transferencias/${id}/concluir`, {});
      await carregarTransferencias();
    } catch (err: any) {
      setErroAcao(err.message || 'Erro ao concluir');
    } finally {
      setAtualizando(null);
    }
  };

  const destinoOptions = minhasLojas.filter(l => !solicitando || l.id !== solicitando.origem.lojaId);
  const grupos = {
    pendentes:  transferencias.filter(t => t.status === 'SOLICITADA'),
    transito:   transferencias.filter(t => t.status === 'APROVADA'),
    concluidas: transferencias.filter(t => ['CONCLUIDA', 'REJEITADA'].includes(t.status)),
  };
  const listFiltrada = filtroStatus
    ? transferencias.filter(t => t.status === filtroStatus)
    : transferencias;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transferências</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Solicite, aprove e acompanhe transferências de estoque entre lojas</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2.5 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
            {grupos.pendentes.length} pendente{grupos.pendentes.length !== 1 ? 's' : ''}
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            {grupos.transito.length} em trânsito
          </span>
        </div>
      </div>

      {/* ── Busca de produto ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Buscar produto na rede</h2>
        <p className="text-zinc-500 text-xs mb-4">Digite o código ou nome do produto para ver onde ele está disponível</p>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-[#09090b] border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Ex: TM13, Honda Biz, Pneu Traseiro..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscarProduto(); }}
          />
          <button
            onClick={buscarProduto}
            disabled={buscando || busca.trim().length < 2}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          {buscaFeita && (
            <button
              onClick={() => { setResultados([]); setBusca(''); setBuscaFeita(false); }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {buscaFeita && !buscando && (
          <div className="mt-4">
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Nenhum produto encontrado com "{busca}"
              </div>
            ) : (
              <div className="space-y-4">
                {resultados.map(res => (
                  <div key={res.produto.id} className="border border-zinc-700/60 rounded-xl overflow-hidden">
                    <div className="bg-zinc-800/60 px-4 py-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${res.produto.tipo === 'MOTO' ? 'bg-orange-400' : res.produto.tipo === 'PECA' ? 'bg-blue-400' : 'bg-green-400'}`} />
                      <div>
                        <span className="text-white font-semibold text-sm">{res.produto.nome}</span>
                        <span className="text-zinc-500 text-xs ml-2">{res.produto.codigo}</span>
                      </div>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${res.produto.tipo === 'MOTO' ? 'bg-orange-500/20 text-orange-400' : res.produto.tipo === 'PECA' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                        {res.produto.tipo}
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {res.lojas.map(loja => (
                        <div key={loja.lojaId} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-200">{loja.nomeFantasia}</div>
                            {loja.endereco && <div className="text-xs text-zinc-500">{loja.endereco}</div>}
                          </div>
                          <div className="text-center px-3">
                            <div className={`text-lg font-bold ${loja.quantidade <= 1 ? 'text-red-400' : loja.quantidade <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {loja.quantidade}
                            </div>
                            <div className="text-xs text-zinc-500">em estoque</div>
                          </div>
                          {loja.lojaId !== minhaLojaId ? (
                            <button
                              onClick={() => abrirSolicitar(res.produto, loja)}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                            >
                              Solicitar →
                            </button>
                          ) : (
                            <span className="px-4 py-2 bg-zinc-800 text-zinc-500 text-xs rounded-lg flex-shrink-0">Minha loja</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de Solicitação (store users — SEM chassi) ── */}
      {solicitando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSolicitando(null); }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Solicitar Transferência</h3>
              <p className="text-zinc-400 text-sm mt-0.5">
                {solicitando.produto.tipo === 'MOTO'
                  ? 'O financeiro escolherá e liberará o chassi após aprovação'
                  : 'Aguardará aprovação do financeiro antes de ser liberada'}
              </p>
            </div>
            <div className="p-5 space-y-4">

              {/* Info do produto */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-500">Produto</span>
                  <span className="text-sm font-semibold text-white">{solicitando.produto.nome}</span>
                  <span className="text-xs text-zinc-500">{solicitando.produto.codigo}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>📦 Origem: <strong className="text-zinc-200">{solicitando.origem.nomeFantasia}</strong></span>
                  <span>Qtd disponível: <strong className="text-green-400">{solicitando.origem.quantidade}</strong></span>
                </div>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loja de Destino *</label>
                <select
                  value={formLojaDestino}
                  onChange={e => setFormLojaDestino(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
                >
                  <option value="">Selecione o destino...</option>
                  {destinoOptions.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nomeFantasia}{l.id === minhaLojaId ? ' (minha loja)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade (apenas não-MOTO) */}
              {solicitando.produto.tipo !== 'MOTO' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    max={solicitando.origem.quantidade}
                    value={formQtd}
                    onChange={e => setFormQtd(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Info para MOTO — chassi será definido pelo financeiro */}
              {solicitando.produto.tipo === 'MOTO' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-blue-300 text-xs leading-relaxed">
                    🏍️ Para motos, o chassi específico será selecionado e liberado pelo financeiro ao aprovar o pedido. Você receberá uma confirmação quando estiver em trânsito.
                  </p>
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observação (opcional)</label>
                <input
                  type="text"
                  value={formObs}
                  onChange={e => setFormObs(e.target.value)}
                  placeholder="Motivo, urgência, etc."
                  className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              {erroForm && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">{erroForm}</div>
              )}
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3">
              <button onClick={() => setSolicitando(null)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={enviarSolicitacao}
                disabled={enviando}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {enviando ? 'Enviando...' : 'Solicitar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Aprovação com Chassi (apenas admins) ── */}
      {aprovandoTransf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setAprovandoTransf(null); }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Aprovar Transferência #{aprovandoTransf.id}</h3>
              <p className="text-zinc-400 text-sm mt-0.5">
                {aprovandoTransf.produto?.tipo === 'MOTO' && !aprovandoTransf.unidadeFisica
                  ? 'Selecione o chassi que será transferido'
                  : 'Confirme a aprovação desta transferência'}
              </p>
            </div>
            <div className="p-5 space-y-4">

              {/* Info */}
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{aprovandoTransf.produto?.nome || '—'}</span>
                  <span className="text-xs text-zinc-500">{aprovandoTransf.produto?.codigo}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                  <span>📦 <strong className="text-zinc-200">{aprovandoTransf.lojaOrigem?.nomeFantasia}</strong></span>
                  <span className="text-orange-400">→</span>
                  <span>🏪 <strong className="text-zinc-200">{aprovandoTransf.lojaDestino?.nomeFantasia}</strong></span>
                </div>
                <div className="text-xs text-zinc-500">
                  Solicitado por: {aprovandoTransf.solicitadoPorUser?.nome || '?'}
                </div>
              </div>

              {/* Chassi — only for MOTO */}
              {aprovandoTransf.produto?.tipo === 'MOTO' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Chassi a transferir</label>
                  {aprovandoTransf.unidadeFisica ? (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm p-3 rounded-lg flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="font-mono font-semibold">{aprovandoTransf.unidadeFisica.chassi}</span>
                      {aprovandoTransf.unidadeFisica.cor && <span className="text-zinc-400">· {aprovandoTransf.unidadeFisica.cor}</span>}
                      {aprovandoTransf.unidadeFisica.ano && <span className="text-zinc-500">({aprovandoTransf.unidadeFisica.ano})</span>}
                    </div>
                  ) : carregandoChassi ? (
                    <div className="text-zinc-500 text-xs py-3 text-center">Carregando chassi disponíveis...</div>
                  ) : chassisDisponiveis.length === 0 ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                      Nenhum chassi disponível na loja de origem para este modelo
                    </div>
                  ) : (
                    <select
                      value={chassiSelecionado}
                      onChange={e => setChassiSelecionado(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
                    >
                      <option value="">Selecione o chassi...</option>
                      {chassisDisponiveis.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.chassi}{u.cor ? ` — ${u.cor}` : ''}{u.ano ? ` (${u.ano})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {erroAprovacao && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">{erroAprovacao}</div>
              )}
            </div>
            <div className="p-5 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => setAprovandoTransf(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprovacao}
                disabled={
                  atualizando === aprovandoTransf.id ||
                  (aprovandoTransf.produto?.tipo === 'MOTO' && !aprovandoTransf.unidadeFisica && (carregandoChassi || chassisDisponiveis.length === 0))
                }
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {atualizando === aprovandoTransf.id ? 'Aprovando...' : '✓ Aprovar e Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Transferências ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-white">
            {podeAprovar ? 'Todas as Transferências' : 'Minhas Transferências'}
          </h2>
          <div className="flex gap-2 flex-wrap">
            {['', 'SOLICITADA', 'APROVADA', 'CONCLUIDA', 'REJEITADA'].map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filtroStatus === s ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                {s === '' ? 'Todas' : s === 'SOLICITADA' ? `Pendentes (${grupos.pendentes.length})` : s === 'APROVADA' ? 'Em trânsito' : s === 'CONCLUIDA' ? 'Concluídas' : 'Rejeitadas'}
              </button>
            ))}
          </div>
        </div>

        {erroAcao && (
          <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">{erroAcao}</div>
        )}

        {/* Barra de aprovação em lote */}
        {podeAprovar && selecionados.size > 0 && (
          <div className="mx-5 mb-2 mt-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-orange-300 text-sm font-medium">
              {selecionados.size} transferência{selecionados.size !== 1 ? 's' : ''} selecionada{selecionados.size !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setSelecionados(new Set())} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                Limpar seleção
              </button>
              <button
                onClick={aprovarLote}
                disabled={aprovandoLote}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {aprovandoLote ? 'Aprovando...' : `✓ Aprovar Todas (${selecionados.size})`}
              </button>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="py-16 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : listFiltrada.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🔄</div>
            <div className="text-zinc-400 text-sm">Nenhuma transferência encontrada</div>
            <div className="text-zinc-600 text-xs mt-1">Use a busca acima para solicitar uma nova transferência</div>
          </div>
        ) : (
          <>
          {/* Selecionar todos (apenas pendentes aprováveis) */}
          {podeAprovar && (filtroStatus === '' || filtroStatus === 'SOLICITADA') && grupos.pendentes.some(t => t.produto?.tipo !== 'MOTO' || t.unidadeFisica) && (
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="sel-todos"
                checked={grupos.pendentes.filter(t => t.produto?.tipo !== 'MOTO' || t.unidadeFisica).every(t => selecionados.has(t.id))}
                onChange={toggleTodosPendentes}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <label htmlFor="sel-todos" className="text-xs text-zinc-400 cursor-pointer select-none">
                Selecionar todos os pendentes aprovável
              </label>
            </div>
          )}
          <div className="divide-y divide-zinc-800">
            {listFiltrada.map(t => {
              const isPendente  = t.status === 'SOLICITADA';
              const isTransito  = t.status === 'APROVADA';
              const possoAprovar = podeAprovar && isPendente;
              const possoReceber = isTransito && (minhaLojaId === t.lojaDestino?.id || podeAprovar);
              const podeSelecionar = possoAprovar && (t.produto?.tipo !== 'MOTO' || !!t.unidadeFisica);

              return (
                <div key={t.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${selecionados.has(t.id) ? 'bg-orange-500/5' : ''}`}>
                  {podeSelecionar && (
                    <input
                      type="checkbox"
                      checked={selecionados.has(t.id)}
                      onChange={() => toggleSelecionado(t.id)}
                      className="w-4 h-4 accent-orange-500 cursor-pointer flex-shrink-0"
                    />
                  )}
                  {possoAprovar && !podeSelecionar && (
                    <div className="w-4 h-4 flex-shrink-0" title="Chassi pendente — aprove individualmente">
                      <span className="text-yellow-500 text-xs">!</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-zinc-500">#{t.id} · {fmtDate(t.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white truncate">
                      {t.produto?.nome || '—'}
                      {t.unidadeFisica && (
                        <span className="text-orange-400 ml-1.5 text-xs font-mono">
                          {t.unidadeFisica.chassi}
                          {t.unidadeFisica.cor ? ` · ${t.unidadeFisica.cor}` : ''}
                        </span>
                      )}
                      {!t.unidadeFisica && t.produto?.tipo === 'MOTO' && isPendente && (
                        <span className="text-yellow-500 ml-1.5 text-xs">chassi a definir</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      <span>Qtd: <strong className="text-zinc-200">{t.quantidade}</strong></span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-300">{t.lojaOrigem?.nomeFantasia || '?'}</span>
                      <span className="text-orange-400">→</span>
                      <span className="text-zinc-300">{t.lojaDestino?.nomeFantasia || '?'}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-600">
                      Solicitado por: {t.solicitadoPorUser?.nome || '?'}
                      {t.aprovadoPorUser && ` · Aprovado por: ${t.aprovadoPorUser.nome}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {possoAprovar && (
                      <>
                        <button
                          onClick={() => abrirAprovacao(t)}
                          disabled={atualizando === t.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          ✓ Aprovar
                        </button>
                        <button
                          onClick={() => rejeitar(t.id)}
                          disabled={atualizando === t.id}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors border border-red-500/30"
                        >
                          ✕ Rejeitar
                        </button>
                      </>
                    )}
                    {possoReceber && (
                      <button
                        onClick={() => concluir(t.id)}
                        disabled={atualizando === t.id}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg transition-colors border border-blue-500/30"
                      >
                        📦 Confirmar Recebimento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
