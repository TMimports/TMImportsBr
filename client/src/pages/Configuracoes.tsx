import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Button, Input, Select } from '../components/ui';
import { Lojas } from './Lojas';

interface Configuracao {
  id: number;
  comissaoVendedorMoto: number;
  comissaoTecnico: number;
  comissaoPecaHabilitada: boolean;
  periodoComissao: string;
  descontoMaxMoto: number;
  descontoMaxPeca: number;
  descontoMaxServico: number;
  descontoMaxOS: number;
  lucroMoto: number;
  lucroPeca: number;
}

interface LogConfig {
  id: number;
  campo: string;
  valorAnterior: string;
  valorNovo: string;
  createdAt: string;
  usuario: { nome: string };
}

const periodos = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'MENSAL', label: 'Mensal' }
];

type ConfigTab = 'parametros' | 'lojas';

export function Configuracoes() {
  const [tab, setTab] = useState<ConfigTab>('parametros');
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [logs, setLogs] = useState<LogConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Configuracao>('/configuracoes'),
      api.get<LogConfig[]>('/configuracoes/logs')
    ])
      .then(([cfg, lg]) => {
        setConfig(cfg);
        setLogs(lg);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await api.put<Configuracao>('/configuracoes', {
        comissaoVendedorMoto: Number(config.comissaoVendedorMoto),
        comissaoTecnico: Number(config.comissaoTecnico),
        comissaoPecaHabilitada: config.comissaoPecaHabilitada,
        periodoComissao: config.periodoComissao,
        descontoMaxMoto: Number(config.descontoMaxMoto),
        descontoMaxPeca: Number(config.descontoMaxPeca),
        descontoMaxServico: Number(config.descontoMaxServico),
        descontoMaxOS: Number(config.descontoMaxOS),
        lucroMoto: Number(config.lucroMoto),
        lucroPeca: Number(config.lucroPeca)
      });
      setConfig(updated);
      const newLogs = await api.get<LogConfig[]>('/configuracoes/logs');
      setLogs(newLogs);
      alert('Configuracoes salvas com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!config) {
    return <div className="text-center text-red-400">Erro ao carregar configuracoes</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Configurações do Sistema</h1>
        {tab === 'parametros' && (
          <Button variant="secondary" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? 'Ocultar Histórico' : 'Ver Histórico'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { key: 'parametros', label: '⚙️ Parâmetros' },
          { key: 'lojas',      label: '🏪 Unidades / Lojas' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as ConfigTab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${tab === t.key
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lojas' && <Lojas />}

      {tab === 'parametros' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-orange-400">Comissoes</h2>
          
          <Input
            label="Comissao Vendedor - Moto (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.comissaoVendedorMoto}
            onChange={(e) => setConfig({ ...config, comissaoVendedorMoto: Number(e.target.value) })}
          />

          <Input
            label="Comissao Tecnico (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.comissaoTecnico}
            onChange={(e) => setConfig({ ...config, comissaoTecnico: Number(e.target.value) })}
          />

          <Select
            label="Periodo de Comissao"
            value={config.periodoComissao}
            onChange={(e) => setConfig({ ...config, periodoComissao: e.target.value })}
            options={periodos}
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.comissaoPecaHabilitada}
                onChange={(e) => setConfig({ ...config, comissaoPecaHabilitada: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-300">Habilitar Comissao sobre Pecas</span>
            </label>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-orange-400">Descontos Maximos</h2>
          <p className="text-sm text-gray-400">Gerentes tem o dobro do limite definido aqui.</p>
          
          <Input
            label="Desconto Max. Moto (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.descontoMaxMoto}
            onChange={(e) => setConfig({ ...config, descontoMaxMoto: Number(e.target.value) })}
          />

          <Input
            label="Desconto Max. Peca (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.descontoMaxPeca}
            onChange={(e) => setConfig({ ...config, descontoMaxPeca: Number(e.target.value) })}
          />

          <Input
            label="Desconto Max. Servico (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.descontoMaxServico}
            onChange={(e) => setConfig({ ...config, descontoMaxServico: Number(e.target.value) })}
          />

          <Input
            label="Desconto Max. O/S (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={config.descontoMaxOS}
            onChange={(e) => setConfig({ ...config, descontoMaxOS: Number(e.target.value) })}
          />
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-orange-400">Margens de Lucro</h2>
          <p className="text-sm text-gray-400">Margem aplicada sobre o custo para calcular preco de venda.</p>
          
          <Input
            label="Margem Lucro Moto (%)"
            type="number"
            step="0.1"
            min="0"
            max="500"
            value={config.lucroMoto}
            onChange={(e) => setConfig({ ...config, lucroMoto: Number(e.target.value) })}
          />

          <Input
            label="Margem Lucro Peca (%)"
            type="number"
            step="0.1"
            min="0"
            max="500"
            value={config.lucroPeca}
            onChange={(e) => setConfig({ ...config, lucroPeca: Number(e.target.value) })}
          />

          <button
            onClick={async () => {
              if (!confirm('Recalcular os precos de TODOS os produtos com as margens atuais? (Salve as configuracoes antes)')) return;
              setRecalculando(true);
              try {
                const result = await api.post<{ atualizados: number; totalProdutos: number }>('/configuracoes/recalcular-precos', {});
                alert(`${result.atualizados} de ${result.totalProdutos} produtos atualizados com as novas margens.`);
              } catch (err: any) {
                alert(err.message || 'Erro ao recalcular');
              } finally {
                setRecalculando(false);
              }
            }}
            disabled={recalculando}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {recalculando ? 'Recalculando...' : 'Recalcular Precos dos Produtos'}
          </button>
        </div>
      </div>}

      {tab === 'parametros' && (
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Salvar Configurações
        </Button>
      </div>
      )}

      {tab === 'parametros' && showLogs && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Historico de Alteracoes</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-zinc-800">
                  <th className="pb-2 pr-3 whitespace-nowrap">Data</th>
                  <th className="pb-2 pr-3">Usuário</th>
                  <th className="pb-2 pr-3">Campo</th>
                  <th className="pb-2 pr-3">Valor Anterior</th>
                  <th className="pb-2">Novo Valor</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">Nenhuma alteracao registrada</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="border-b border-zinc-800/50">
                      <td className="py-2 text-gray-300">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 text-white">{log.usuario.nome}</td>
                      <td className="py-2 text-orange-400">{log.campo}</td>
                      <td className="py-2 text-red-400">{log.valorAnterior}</td>
                      <td className="py-2 text-green-400">{log.valorNovo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
