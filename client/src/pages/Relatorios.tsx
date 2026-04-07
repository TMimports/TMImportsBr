import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Destinatario {
  id: number;
  nome: string;
  email: string;
  role: string;
  relatorios: string[];
  loja?: { nomeFantasia: string };
}

const roleLabels: Record<string, string> = {
  ADMIN_GERAL: 'Administrador Geral',
  ADMIN_FINANCEIRO: 'Admin Financeiro',
  ADMIN_REDE: 'Admin de Rede',
  DONO_LOJA: 'Dono da Loja',
  GERENTE_LOJA: 'Gerente da Loja',
};

const tipoLabels: Record<string, { label: string; cor: string; desc: string }> = {
  GERAL: { label: 'Relatório Geral', cor: 'text-orange-400 bg-orange-500/10 border-orange-500/30', desc: 'Visão completa: financeiro + comercial + estoque' },
  FINANCEIRO: { label: 'Relatório Financeiro', cor: 'text-green-400 bg-green-500/10 border-green-500/30', desc: 'Contas a pagar/receber, fluxo de caixa, inadimplência' },
  COMERCIAL: { label: 'Relatório Comercial', cor: 'text-blue-400 bg-blue-500/10 border-blue-500/30', desc: 'Vendas, OS, ranking de vendedores, performance por loja' },
};

export function Relatorios() {
  const { user } = useAuth();
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [form, setForm] = useState({
    tipo: '',
    periodo: 'SEMANAL'
  });

  useEffect(() => {
    api.get<Destinatario[]>('/relatorios/destinatarios')
      .then(setDestinatarios)
      .catch(() => setDestinatarios([]))
      .finally(() => setLoading(false));
  }, []);

  const mostrarMsg = (tipo: 'ok' | 'erro', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 6000);
  };

  const handleDisparar = async () => {
    if (!form.periodo) return;
    setEnviando(true);
    setMsg(null);
    try {
      const body: any = { periodo: form.periodo };
      if (form.tipo) body.tipo = form.tipo;

      const res = await api.post<any>('/relatorios/disparar', body);
      mostrarMsg('ok', `✅ ${res.mensagem} — ${res.enviados} email(s) enviado(s)`);
    } catch (err: any) {
      mostrarMsg('erro', `❌ ${err.message || 'Erro ao enviar relatórios'}`);
    } finally {
      setEnviando(false);
    }
  };

  const handleTestarEmail = async () => {
    setTestando(true);
    setMsg(null);
    try {
      const res = await api.post<any>('/relatorios/testar-email', { email: user?.email });
      if (res.ok) {
        mostrarMsg('ok', `✅ Email de teste enviado para ${user?.email}`);
      } else {
        mostrarMsg('erro', `❌ Erro: ${res.erro}`);
      }
    } catch (err: any) {
      mostrarMsg('erro', `❌ ${err.message}`);
    } finally {
      setTestando(false);
    }
  };

  const geralCount = destinatarios.filter(d => d.relatorios.includes('GERAL')).length;
  const financeirosCount = destinatarios.filter(d => d.relatorios.includes('FINANCEIRO')).length;
  const comercialCount = destinatarios.filter(d => d.relatorios.includes('COMERCIAL')).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios Automáticos</h1>
          <p className="text-gray-400 text-sm mt-1">
            Enviados por email automaticamente toda segunda-feira (semanal) e no dia 1 de cada mês (mensal)
          </p>
        </div>
        <button
          onClick={handleTestarEmail}
          disabled={testando}
          className="btn btn-secondary text-sm"
        >
          {testando ? 'Enviando...' : '📧 Testar Email'}
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-lg border text-sm font-medium ${msg.tipo === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {msg.texto}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{geralCount}</div>
          <div className="text-sm text-gray-400 mt-1">Recebem Rel. Geral</div>
          <div className="text-xs text-gray-500 mt-1">Diretores / Admin Geral</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{financeirosCount}</div>
          <div className="text-sm text-gray-400 mt-1">Recebem Rel. Financeiro</div>
          <div className="text-xs text-gray-500 mt-1">Admin Financeiro</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{comercialCount}</div>
          <div className="text-sm text-gray-400 mt-1">Recebem Rel. Comercial</div>
          <div className="text-xs text-gray-500 mt-1">Donos / Gerentes / Admin Rede</div>
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📤 Disparar Relatório Agora</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Tipo de Relatório</label>
            <select
              className="input"
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="">Todos (por perfil de acesso)</option>
              <option value="GERAL">Relatório Geral</option>
              <option value="FINANCEIRO">Relatório Financeiro</option>
              <option value="COMERCIAL">Relatório Comercial</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              "Todos" envia cada tipo para o perfil certo automaticamente
            </p>
          </div>
          <div>
            <label className="label">Período</label>
            <select
              className="input"
              value={form.periodo}
              onChange={e => setForm({ ...form, periodo: e.target.value })}
            >
              <option value="SEMANAL">Semanal (últimos 7 dias)</option>
              <option value="MENSAL">Mensal (mês anterior completo)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleDisparar}
          disabled={enviando}
          className="btn btn-primary w-full sm:w-auto"
        >
          {enviando ? '⏳ Enviando...' : '🚀 Enviar Relatório'}
        </button>
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-2">📋 O que cada relatório inclui</h2>
        <div className="space-y-3 mt-4">
          {Object.entries(tipoLabels).map(([tipo, info]) => (
            <div key={tipo} className={`border rounded-lg p-4 ${info.cor}`}>
              <div className="font-semibold mb-1">{info.label}</div>
              <div className="text-sm opacity-80 mb-2">{info.desc}</div>
              <div className="text-xs opacity-70">
                {tipo === 'GERAL' && '• Indicadores financeiros (saldo, inadimplência, fluxo de caixa)\n• Métricas comerciais (vendas, orçamentos, ranking)\n• Estoque (unidades, itens críticos, valor estimado)\n• Alertas automáticos + sugestões de ação'}
                {tipo === 'FINANCEIRO' && '• A receber / A pagar (pendente e vencido)\n• Total recebido e pago no período\n• Saldo líquido do fluxo de caixa\n• Alertas de inadimplência e contas vencidas'}
                {tipo === 'COMERCIAL' && '• Total de vendas e faturamento\n• Orçamentos gerados e taxa de conversão\n• Ranking dos melhores vendedores\n• Performance por loja\n• Ordens de serviço e receita'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-1">👥 Destinatários Cadastrados</h2>
        <p className="text-sm text-gray-400 mb-4">
          O relatório enviado é determinado pelo perfil de cada usuário. Para adicionar alguém, cadastre o usuário com o perfil correto em <strong className="text-white">Configurações → Usuários</strong>.
        </p>

        {loading ? (
          <div className="text-gray-400 text-sm">Carregando...</div>
        ) : destinatarios.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            Nenhum destinatário configurado ainda.<br />
            Cadastre usuários com perfil de Admin, Dono de Loja ou Gerente.
          </div>
        ) : (
          <div className="space-y-2">
            {destinatarios.map(d => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div>
                  <div className="font-medium text-white text-sm">{d.nome}</div>
                  <div className="text-xs text-gray-400">{d.email}{d.loja ? ` · ${d.loja.nomeFantasia}` : ''}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{roleLabels[d.role] || d.role}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.relatorios.map(r => (
                    <span key={r} className={`text-xs px-2 py-0.5 rounded-full border ${tipoLabels[r]?.cor || 'text-gray-400 border-gray-600'}`}>
                      {tipoLabels[r]?.label || r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4 bg-zinc-900/50 border-zinc-700">
        <h3 className="font-semibold text-white mb-2">🕐 Agenda Automática</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-orange-400 mt-0.5">📅</span>
            <div>
              <div className="text-white font-medium">Toda segunda-feira às 07:00</div>
              <div className="text-gray-400">Relatório Semanal (últimos 7 dias)</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-400 mt-0.5">📆</span>
            <div>
              <div className="text-white font-medium">Dia 1 de cada mês às 07:30</div>
              <div className="text-gray-400">Relatório Mensal (mês anterior completo)</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Horário de Brasília. O relatório chega por email com planilha XLSX em anexo.
        </p>
      </div>
    </div>
  );
}
