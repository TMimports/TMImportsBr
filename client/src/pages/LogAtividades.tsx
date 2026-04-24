import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface LogEntry {
  id: number;
  usuarioId: number | null;
  userName: string | null;
  userRole: string | null;
  acao: string;
  entidade: string;
  entidadeId: number | null;
  detalhes: string | null;
  ip: string | null;
  createdAt: string;
  usuario: { id: number; nome: string; role: string } | null;
}

interface LogResponse {
  total: number;
  page: number;
  limit: number;
  logs: LogEntry[];
}

const ACAO_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN:           { label: 'Login',            color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  TROCAR_SENHA:    { label: 'Troca de Senha',   color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  CRIAR_VENDA:     { label: 'Nova Venda',       color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  CRIAR_ORCAMENTO: { label: 'Novo Orçamento',   color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  EXCLUIR_VENDA:   { label: 'Excluiu Venda',    color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  CRIAR_CLIENTE:   { label: 'Novo Cliente',     color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  EDITAR_CLIENTE:  { label: 'Editou Cliente',   color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  EXCLUIR_CLIENTE: { label: 'Excluiu Cliente',  color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  EXPORTAR_EXCEL:  { label: 'Exportou Excel',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  DELETE:          { label: 'Exclusão',         color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN_GERAL:      'Admin Geral',
  ADMIN_FINANCEIRO: 'Admin Financeiro',
  ADMIN_REDE:       'Admin Rede',
  DONO_LOJA:        'Dono de Loja',
  GERENTE_LOJA:     'Gerente',
  VENDEDOR:         'Vendedor',
  TECNICO:          'Técnico',
  ADMIN_COMERCIAL:  'Admin Comercial',
};

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function BadgeAcao({ acao }: { acao: string }) {
  const info = ACAO_LABELS[acao] ?? { label: acao, color: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${info.color}`}>
      {info.label}
    </span>
  );
}

export function LogAtividades() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [filtros, setFiltros] = useState({
    busca: '',
    acao: '',
    dataInicio: '',
    dataFim: '',
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);

  const buscar = useCallback(async (pg: number, f: typeof filtros) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (f.busca)      params.set('busca',      f.busca);
      if (f.acao)       params.set('acao',        f.acao);
      if (f.dataInicio) params.set('dataInicio',  f.dataInicio);
      if (f.dataFim)    params.set('dataFim',     f.dataFim);
      const data = await api.get<LogResponse>(`/log-atividades?${params}`);
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buscar(page, filtrosAplicados);
  }, [page, filtrosAplicados, buscar]);

  function aplicarFiltros() {
    setPage(1);
    setFiltrosAplicados({ ...filtros });
  }

  function limparFiltros() {
    const vazio = { busca: '', acao: '', dataInicio: '', dataFim: '' };
    setFiltros(vazio);
    setPage(1);
    setFiltrosAplicados(vazio);
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Log de Atividades</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Rastreio completo de ações realizadas no sistema</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {total.toLocaleString('pt-BR')} registro{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar usuário ou descrição..."
            value={filtros.busca}
            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
            className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
              placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <select
            value={filtros.acao}
            onChange={e => setFiltros(f => ({ ...f, acao: e.target.value }))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
              focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACAO_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltros}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium
                px-3 py-2 rounded-lg transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={limparFiltros}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm px-3 py-2 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Data início</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
                focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Data fim</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white
                focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Data / Hora</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">Ação</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32 hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-nowrap">
                      {formatarDataHora(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">
                        {log.userName || log.usuario?.nome || <span className="text-zinc-600 italic">Sistema</span>}
                      </div>
                      {(log.userRole || log.usuario?.role) && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {ROLE_LABELS[log.userRole || log.usuario?.role || ''] || log.userRole || log.usuario?.role}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeAcao acao={log.acao} />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300 max-w-md">
                      <span className="line-clamp-2">{log.detalhes || log.dados || '—'}</span>
                      {log.entidade && log.entidade !== '' && log.entidadeId && (
                        <span className="text-xs text-zinc-600 mt-0.5 block">
                          {log.entidade} #{log.entidadeId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 font-mono hidden lg:table-cell">
                      {log.ip || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Página {page} de {totalPages} — {total.toLocaleString('pt-BR')} registros
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
