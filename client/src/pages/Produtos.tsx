import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { CustomSelect } from '../components/CustomSelect';

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  custo: number;
  percentualLucro: number;
  preco: number;
  precoTabela?: number | null;
  precoCartao?: number | null;
  parcela10x?: number | null;
  precoDinheiro?: number | null;
  descricao: string;
}

const initialForm = {
  id: 0,
  nome: '',
  tipo: 'PECA',
  descricao: '',
  preco: '',
  precoTabela: '',
  precoCartao: '',
  parcela10x: '',
  precoDinheiro: '',
};

const TIPO_LABEL: Record<string, string> = {
  MOTO:    'Moto',
  PECA:    'Peça',
  SERVICO: 'Serviço',
};

const TIPO_BADGE: Record<string, string> = {
  MOTO:    'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  PECA:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  SERVICO: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

const fmtBRL = (v: number | null | undefined) =>
  v && Number(v) > 0 ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const parseNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
};

function normalizarModelo(nome: string): string {
  return nome
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-_.]+/g, '');
}

interface ImportResultado {
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<ImportResultado | null>(null);
  const [importErro, setImportErro] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProdutos = () => {
    setLoading(true);
    api.get<Produto[]>('/produtos')
      .then(setProdutos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProdutos(); }, []);

  // ── Importar Tabela de Preços (XLSX) ─────────────────────────────────────────
  function importarTabelaPrecos(e: React.ChangeEvent<HTMLInputElement>) {
    setImportErro('');
    setImportResultado(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Encontrar aba "Tabela de Preços" ou primeira aba
        const sheetName =
          wb.SheetNames.find(n =>
            n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '').includes('tabeladepreco')
          ) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) { setImportErro('Planilha vazia ou sem dados.'); setImportando(false); return; }

        // ── Normalizar cabeçalho: minúsculo + sem acento + trim ──────────────
        const normH = (h: any) =>
          String(h).toLowerCase().trim()
            .normalize('NFD').replace(/[̀-ͯ]/g, '');

        const header = raw[0].map(normH);

        // Mapa nome→índice para matching exato
        const hMap: Record<string, number> = {};
        header.forEach((h, i) => { if (h) hMap[h] = i; });

        // Prioridade: nome exato normalizado → fallback fuzzy
        const findCol = (exactos: string[], fuzzy: string[] = []): number => {
          for (const e of exactos) if (hMap[e] !== undefined) return hMap[e];
          return header.findIndex(h => fuzzy.some(t => h.includes(t)));
        };

        const iModelo   = findCol(['modelo'],                              ['model', 'nome']);
        const iDe       = findCol(['de'],                                  ['tabela', 'preco de', 'antigo']);
        const iCartao   = findCol(['por cartao 10x', 'cartao 10x'],        ['cartao', 'card']);
        const iParcela  = findCol(['parcela 10x', 'parcela'],              ['installment']);
        const iDinheiro = findCol(['dinheiro ou pix', 'dinheiro/pix'],     ['dinheiro', 'pix', 'avista']);

        if (iModelo === -1) {
          setImportErro('Coluna "Modelo" não encontrada. Verifique se a aba é "Tabela de Preços" e o cabeçalho A1 é "Modelo".');
          setImportando(false); return;
        }

        // Função para checar se o valor é número puro (não pode ser nome de modelo)
        const ehNumeroPuro = (v: string) => v !== '' && !isNaN(Number(v.replace(',', '.').replace(/\s/g, '')));

        interface LinhaTabela {
          modelo: string;
          de: number | null;
          porCartao10x: number | null;
          parcela10x: number | null;
          dinheiroOuPix: number | null;
        }

        const ignoradasNumericas: string[] = [];

        const linhas: LinhaTabela[] = raw.slice(1)
          .filter((row: any[]) => {
            const modelo = String(row[iModelo] ?? '').trim();
            if (!modelo) return false; // linha vazia
            const nomNorm = normalizarModelo(modelo);
            if (nomNorm === 'MODELO' || nomNorm === 'PRODUTO' || nomNorm === '') return false; // cabeçalho repetido
            if (ehNumeroPuro(modelo)) {
              ignoradasNumericas.push(`Linha ignorada: Modelo="${modelo}" é um número (possível erro de coluna)`);
              return false;
            }
            return true;
          })
          .map((row: any[]) => ({
            modelo:        String(row[iModelo] ?? '').trim(),
            de:            iDe      >= 0 ? parseNum(row[iDe])      : null,
            porCartao10x:  iCartao  >= 0 ? parseNum(row[iCartao])  : null,
            parcela10x:    iParcela >= 0 ? parseNum(row[iParcela]) : null,
            dinheiroOuPix: iDinheiro >= 0 ? parseNum(row[iDinheiro]) : null,
          }));

        if (linhas.length === 0 && ignoradasNumericas.length > 0) {
          setImportErro(
            `Todas as linhas foram ignoradas porque o sistema detectou números na coluna Modelo. ` +
            `Verifique se o cabeçalho "Modelo" está na célula A1 da aba "Tabela de Preços". ` +
            `Colunas detectadas — Modelo:${iModelo} De:${iDe} Cartão:${iCartao} Parcela:${iParcela} Dinheiro:${iDinheiro}`
          );
          setImportando(false); return;
        }

        if (linhas.length === 0) { setImportErro('Nenhuma linha de produto encontrada na planilha.'); setImportando(false); return; }

        const result = await api.post<ImportResultado>('/produtos/importar-tabela-precos', { linhas });
        // Adicionar avisos de linhas numéricas ao resultado
        if (ignoradasNumericas.length > 0) {
          result.erros = [...(result.erros || []), ...ignoradasNumericas];
          result.ignorados = (result.ignorados || 0) + ignoradasNumericas.length;
        }
        setImportResultado(result);
        loadProdutos();
      } catch (err: any) {
        setImportErro(err.message || 'Erro ao processar a planilha.');
      } finally {
        setImportando(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dados: any = { nome: form.nome, tipo: form.tipo, descricao: form.descricao || null };
      if (editando && form.id) {
        if (form.preco !== '' && !isNaN(Number(form.preco))) dados.preco = Number(form.preco);
        if (form.precoTabela   !== '') dados.precoTabela   = parseNum(form.precoTabela);
        if (form.precoCartao   !== '') dados.precoCartao   = parseNum(form.precoCartao);
        if (form.parcela10x    !== '') dados.parcela10x    = parseNum(form.parcela10x);
        if (form.precoDinheiro !== '') dados.precoDinheiro = parseNum(form.precoDinheiro);
        await api.put(`/produtos/${form.id}`, dados);
      } else {
        await api.post('/produtos', dados);
      }
      setModalOpen(false);
      setForm(initialForm);
      setEditando(false);
      loadProdutos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (produto: Produto) => {
    setForm({
      id: produto.id,
      nome: produto.nome,
      tipo: produto.tipo,
      descricao: produto.descricao || '',
      preco:         produto.preco      > 0 ? String(produto.preco)         : '',
      precoTabela:   produto.precoTabela   ? String(produto.precoTabela)   : '',
      precoCartao:   produto.precoCartao   ? String(produto.precoCartao)   : '',
      parcela10x:    produto.parcela10x    ? String(produto.parcela10x)    : '',
      precoDinheiro: produto.precoDinheiro ? String(produto.precoDinheiro) : '',
    });
    setEditando(true);
    setModalOpen(true);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try { await api.delete(`/produtos/${id}`); loadProdutos(); }
    catch (err: any) { alert(err.message); }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} produto(s)?`)) return;
    try { await Promise.all(selecionados.map(id => api.delete(`/produtos/${id}`))); setSelecionados([]); loadProdutos(); }
    catch (err: any) { alert(err.message); }
  };

  const abrirNovo = () => { setForm(initialForm); setEditando(false); setModalOpen(true); };
  const toggleSelecao = (id: number) => setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = busca === '' || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo.toLowerCase().includes(busca.toLowerCase());
    const matchTipo  = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const inp = 'w-full bg-[#09090b] border border-[#27272a] text-white rounded-lg px-3 h-10 text-sm outline-none focus:border-orange-500/50';

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-400">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-sm text-zinc-400 mt-1">Gerencie o catálogo de produtos e importe tabelas de preços</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Importar Tabela de Preços */}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importarTabelaPrecos} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            {importando ? '⏳ Importando...' : '📊 Importar Tabela de Preços'}
          </button>

          {produtosFiltrados.length > 0 && (
            <button
              onClick={() => selecionados.length === produtosFiltrados.length ? setSelecionados([]) : setSelecionados(produtosFiltrados.map(p => p.id))}
              className="btn btn-secondary text-sm"
            >
              {selecionados.length === produtosFiltrados.length ? 'Desmarcar' : 'Selecionar todos'}
            </button>
          )}
          {selecionados.length > 0 && (
            <button onClick={handleExcluirSelecionados} className="btn btn-danger">Excluir ({selecionados.length})</button>
          )}
          <button onClick={abrirNovo} className="btn btn-primary">+ Novo Produto</button>
        </div>
      </div>

      {/* Resultado da importação */}
      {importErro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>❌ {importErro}</span>
          <button onClick={() => setImportErro('')} className="ml-4 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {importResultado && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">✅ Importação concluída</span>
            <button onClick={() => setImportResultado(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
          <div className="flex gap-4 text-xs mt-1">
            <span className="text-green-300">🆕 Criados: <strong>{importResultado.criados}</strong></span>
            <span className="text-blue-300">♻️ Atualizados: <strong>{importResultado.atualizados}</strong></span>
            <span className="text-zinc-400">⏭️ Ignorados: <strong>{importResultado.ignorados}</strong></span>
            {importResultado.erros.length > 0 && <span className="text-red-400">❌ Erros: <strong>{importResultado.erros.length}</strong></span>}
          </div>
          {importResultado.erros.length > 0 && (
            <ul className="mt-2 text-xs text-red-400 space-y-0.5">
              {importResultado.erros.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['TODOS', 'MOTO', 'PECA', 'SERVICO'].map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)} className={`btn text-sm ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`}>
                {t === 'TODOS' ? 'Todos' : TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-400">{produtosFiltrados.length} de {produtos.length} produtos</span>
        </div>
      </div>

      {/* Lista */}
      {produtosFiltrados.length === 0 ? (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center text-zinc-500">Nenhum produto encontrado</div>
      ) : (
        <div className="space-y-2">
          {produtosFiltrados.map(produto => (
            <div key={produto.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(produto.id)}
                  onChange={() => toggleSelecao(produto.id)}
                  className="rounded mt-1 accent-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{produto.nome}</h3>
                      <p className="text-xs text-orange-400 font-mono mt-0.5">{produto.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[produto.tipo] || 'bg-zinc-700 text-zinc-300'}`}>
                        {TIPO_LABEL[produto.tipo] || produto.tipo}
                      </span>
                      <button onClick={() => handleEditar(produto)} className="btn btn-sm btn-secondary">Editar</button>
                      <button onClick={() => handleExcluir(produto.id)} className="btn btn-sm btn-danger">Excluir</button>
                    </div>
                  </div>

                  {/* Preços */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {produto.precoTabela ? (
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-zinc-500 text-xs mb-0.5">De</p>
                        <p className="text-zinc-400 font-medium line-through">{fmtBRL(Number(produto.precoTabela))}</p>
                      </div>
                    ) : null}
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500 text-xs mb-0.5">Por Cartão 10x</p>
                      <p className={`font-semibold ${Number(produto.precoCartao || produto.preco) > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>
                        {fmtBRL(Number(produto.precoCartao || produto.preco))}
                      </p>
                    </div>
                    {produto.parcela10x ? (
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-zinc-500 text-xs mb-0.5">Parcela 10x</p>
                        <p className="text-zinc-200 font-medium">{fmtBRL(Number(produto.parcela10x))}</p>
                      </div>
                    ) : null}
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <p className="text-zinc-500 text-xs mb-0.5">Dinheiro / PIX</p>
                      <p className={`font-semibold ${Number(produto.precoDinheiro) > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                        {fmtBRL(Number(produto.precoDinheiro))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="label">Nome / Modelo *</label>
            <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              className="input" placeholder="Ex: TM11, Mônaco 125, E-Trek..." required />
          </div>

          <CustomSelect
            label="Tipo *"
            required
            value={form.tipo}
            onChange={val => setForm({ ...form, tipo: val })}
            options={[
              { value: 'MOTO',    label: 'Moto / Scooter' },
              { value: 'PECA',    label: 'Peça / Acessório' },
              { value: 'SERVICO', label: 'Serviço' },
            ]}
          />

          <div>
            <label className="label">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
              className="input" rows={2} placeholder="Descrição opcional..." />
          </div>

          {/* Precificação — sempre visível no edit, oculta no novo */}
          {editando && (
            <div className="border border-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">💰 Tabela de Preços</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">De (preço tabela / antigo)</label>
                  <input type="number" step="0.01" min="0" value={form.precoTabela}
                    onChange={e => setForm({ ...form, precoTabela: e.target.value })}
                    className={inp} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Por Cartão 10x</label>
                  <input type="number" step="0.01" min="0" value={form.precoCartao}
                    onChange={e => {
                      const v = e.target.value;
                      const parcela = v && !isNaN(Number(v)) ? String((Number(v) / 10).toFixed(2)) : form.parcela10x;
                      setForm({ ...form, precoCartao: v, preco: v, parcela10x: parcela });
                    }}
                    className={inp} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Parcela 10x (calculada ou manual)</label>
                  <input type="number" step="0.01" min="0" value={form.parcela10x}
                    onChange={e => setForm({ ...form, parcela10x: e.target.value })}
                    className={inp} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Dinheiro / PIX</label>
                  <input type="number" step="0.01" min="0" value={form.precoDinheiro}
                    onChange={e => setForm({ ...form, precoDinheiro: e.target.value })}
                    className={inp} placeholder="0,00" />
                </div>
              </div>
              <p className="text-xs text-zinc-600">A Parcela 10x é calculada automaticamente ao preencher "Por Cartão 10x", mas pode ser editada manualmente.</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar produto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
