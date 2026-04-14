import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from '../index.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xls|xlsx|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo invalido. Use XLS, XLSX ou CSV.'));
    }
  }
});

// ── Parser de número no formato brasileiro ──────────────────────────────────
// Suporta: "R$ 1.234,56" "1.234,56" "1234,56" "1.234" "1234.56" "10%" e células numéricas do Excel
function parseBR(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  // Strip prefixos monetários e espaços
  const s = String(val).trim()
    .replace(/\s/g, '')
    .replace('%', '')
    .replace(/^R\$/, '')
    .replace(/^-R\$/, '-');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato BR: "1.234,56" → 1234.56
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Formato US: "1,234.56" → 1234.56
      return parseFloat(s.replace(/,/g, '')) || 0;
    }
  }
  if (s.includes(',')) {
    // Só vírgula: "1234,56" → 1234.56
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
}

// Valor máximo para Decimal(10,2) no Postgres
const MAX_MONEY = 99_999_999.99;
function clampMoney(v: number): number {
  if (!isFinite(v) || isNaN(v)) return 0;
  return Math.min(Math.max(v, 0), MAX_MONEY);
}

async function gerarCodigoProduto(tipo: string): Promise<string> {
  const prefixo = tipo === 'MOTO' ? 'TMMOT' : 'TMPEC';
  
  const ultimo = await prisma.produto.findFirst({
    where: { codigo: { startsWith: prefixo } },
    orderBy: { codigo: 'desc' }
  });
  
  let numero = 1;
  if (ultimo) {
    const match = ultimo.codigo.match(/\d+$/);
    if (match) {
      numero = parseInt(match[0]) + 1;
    }
  }
  
  return `${prefixo}${String(numero).padStart(5, '0')}`;
}

async function gerarCodigoOS(): Promise<string> {
  const prefixo = 'TMOS';
  const ano = new Date().getFullYear();
  
  const ultimo = await prisma.ordemServico.findFirst({
    where: { numero: { startsWith: `${prefixo}${ano}` } },
    orderBy: { numero: 'desc' }
  });
  
  let numero = 1;
  if (ultimo) {
    const match = ultimo.numero.match(/\d{4}$/);
    if (match) {
      numero = parseInt(match[0]) + 1;
    }
  }
  
  return `${prefixo}${ano}${String(numero).padStart(4, '0')}`;
}

async function gerarNumeroSerieUnidade(): Promise<string> {
  const prefixo = 'TMUNI';
  
  const ultimo = await prisma.unidadeFisica.findFirst({
    where: { numeroSerie: { startsWith: prefixo } },
    orderBy: { numeroSerie: 'desc' }
  });
  
  let numero = 1;
  if (ultimo && ultimo.numeroSerie) {
    const match = ultimo.numeroSerie.match(/\d+$/);
    if (match) {
      numero = parseInt(match[0]) + 1;
    }
  }
  
  return `${prefixo}${String(numero).padStart(5, '0')}`;
}

router.post('/produtos', verifyToken, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const produtosCriados: any[] = [];
    const produtosAtualizados: any[] = [];
    let erros: string[] = [];

    const config = await prisma.configuracao.findFirst();
    if (!config) {
      return res.status(400).json({ error: 'Configurações não encontradas. Defina as margens na aba Configurações antes de importar.' });
    }
    const margemMoto = Number(config.lucroMoto);
    const margemPeca = Number(config.lucroPeca);

    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      if (!row || !row[1]) continue;

      const nome = String(row[1] || '').trim();
      if (!nome) {
        erros.push(`Linha ${i + 1}: Nome do produto vazio`);
        continue;
      }

      try {
        // Coluna C (índice 2) = custo — suporta formato BR e numérico do Excel
        const custo           = clampMoney(parseBR(row[2]));
        const categoria       = String(row[11] || 'Peça').trim().toLowerCase();
        const tipo            = categoria.includes('moto') ? 'MOTO' : 'PECA';
        const percentualLucro = tipo === 'MOTO' ? margemMoto : margemPeca;

        // Proteção contra divisão por zero ou margem >= 100%
        const denominador = 1 - percentualLucro / 100;
        const preco = clampMoney(
          custo > 0 && denominador > 0.001
            ? custo / denominador
            : custo > 0 ? custo * 1.3 : 0
        );

        const existente = await prisma.produto.findFirst({ where: { nome } });
        if (existente) {
          const produtoAtualizado = await prisma.produto.update({
            where: { id: existente.id },
            data: { tipo, custo, percentualLucro, preco, ativo: true }
          });
          produtosAtualizados.push(produtoAtualizado);
          continue;
        }

        const codigo = await gerarCodigoProduto(tipo);
        const produto = await prisma.produto.create({
          data: { codigo, nome, tipo, custo, percentualLucro, preco, ativo: true }
        });
        produtosCriados.push(produto);
      } catch (lineErr: any) {
        console.error(`Importação linha ${i + 1}:`, lineErr.message);
        erros.push(`Linha ${i + 1}: ${lineErr.message}`);
      }
    }

    res.json({
      sucesso: true,
      criados: produtosCriados.length,
      atualizados: produtosAtualizados.length,
      erros: erros.length,
      detalhesErros: erros.slice(0, 10),
      produtos: [...produtosCriados, ...produtosAtualizados].slice(0, 5)
    });
  } catch (error: any) {
    console.error('Erro na importacao:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/servicos', verifyToken, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const servicos: any[] = [];
    let erros: string[] = [];

    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      if (!row || !row[0]) continue;

      const nome = String(row[0] || '').trim();
      const preco = parseFloat(row[1]) || 0;
      const duracao = parseInt(row[2]) || null;

      if (!nome) {
        erros.push(`Linha ${i + 1}: Nome do servico vazio`);
        continue;
      }

      const existente = await prisma.servico.findFirst({ where: { nome } });
      if (existente) {
        erros.push(`Linha ${i + 1}: Servico "${nome}" ja existe`);
        continue;
      }

      const servico = await prisma.servico.create({
        data: {
          nome,
          preco,
          duracao,
          ativo: true
        }
      });

      servicos.push(servico);
    }

    res.json({
      sucesso: true,
      importados: servicos.length,
      erros: erros.length,
      detalhesErros: erros.slice(0, 10)
    });
  } catch (error: any) {
    console.error('Erro na importacao:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/unidades', verifyToken, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { lojaId } = req.body;
    if (!lojaId) {
      return res.status(400).json({ error: 'Loja e obrigatoria' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const unidades: any[] = [];
    let erros: string[] = [];

    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      if (!row || !row[0]) continue;

      const produtoNome = String(row[0] || '').trim();
      const cor = String(row[1] || '').trim();
      const chassi = String(row[2] || '').trim();
      const motor = String(row[3] || '').trim();
      const ano = parseInt(row[4]) || new Date().getFullYear();

      const produto = await prisma.produto.findFirst({ 
        where: { nome: { contains: produtoNome }, tipo: 'MOTO' } 
      });

      if (!produto) {
        erros.push(`Linha ${i + 1}: Produto "${produtoNome}" nao encontrado`);
        continue;
      }

      if (chassi) {
        const chassiExistente = await prisma.unidadeFisica.findFirst({ where: { chassi } });
        if (chassiExistente) {
          erros.push(`Linha ${i + 1}: Chassi "${chassi}" ja cadastrado`);
          continue;
        }
      }

      const numeroSerie = await gerarNumeroSerieUnidade();

      const unidade = await prisma.unidadeFisica.create({
        data: {
          produtoId: produto.id,
          lojaId: parseInt(lojaId),
          cor: cor || null,
          chassi: chassi || null,
          codigoMotor: motor || null,
          ano,
          numeroSerie,
          status: 'ESTOQUE'
        }
      });

      unidades.push(unidade);
    }

    res.json({
      sucesso: true,
      importados: unidades.length,
      erros: erros.length,
      detalhesErros: erros.slice(0, 10)
    });
  } catch (error: any) {
    console.error('Erro na importacao:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /importacao/estoque — importar planilha de estoque geral ─────────────
// Não gera financeiro. Registra LogEstoque com origem = IMPORTACAO_ESTOQUE.
router.post('/estoque', verifyToken, upload.single('arquivo'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const userId: number = req.user?.id ?? 1;

    // Carregar todas as lojas para resolução de nome → id
    const todasLojas = await prisma.loja.findMany({ select: { id: true, nomeFantasia: true, razaoSocial: true } });
    function resolverLoja(nomeInput: string): number | null {
      if (!nomeInput) return null;
      const n = nomeInput.trim().toLowerCase();
      const exata = todasLojas.find(l =>
        (l.nomeFantasia ?? '').toLowerCase() === n || (l.razaoSocial ?? '').toLowerCase() === n
      );
      if (exata) return exata.id;
      // Busca parcial: nome contém a entrada ou entrada contém o nome
      const parcial = todasLojas.find(l => {
        const nf = (l.nomeFantasia ?? '').toLowerCase();
        return nf.includes(n) || n.includes(nf.split(' ').slice(-1)[0] ?? '');
      });
      return parcial?.id ?? null;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    if (rows.length < 2) return res.status(400).json({ error: 'Planilha vazia ou sem dados' });

    // Detectar cabeçalho (primeira linha)
    const header: string[] = (rows[0] as any[]).map(h => String(h || '').toLowerCase().trim());

    const colIdx = (keywords: string[]) => header.findIndex(h => keywords.some(k => h.includes(k)));

    const iModelo    = colIdx(['model', 'produto', 'nome', 'descricao']);
    const iCor       = colIdx(['cor']);
    const iCusto     = colIdx(['custo', 'cif', 'valor custo', 'preco custo']);
    const iFornec    = colIdx(['fornec']);
    const iLoja      = colIdx(['estoque', 'unidade', 'loja', 'destino']);
    const iQtd       = colIdx(['qtd', 'quantidade', 'qty']);
    const iChassi    = colIdx(['chassi', 'chassis']);

    if (iModelo < 0) return res.status(400).json({ error: 'Coluna de modelo/produto não encontrada no cabeçalho' });
    if (iLoja < 0)   return res.status(400).json({ error: 'Coluna de loja/unidade de destino não encontrada' });

    let criados = 0, atualizados = 0, entradasLancadas = 0;
    const erros: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nomeModelo = String(row[iModelo] || '').trim();
      if (!nomeModelo) continue;

      const nomeLojaStr = iLoja >= 0 ? String(row[iLoja] || '').trim() : '';
      const lojaId = resolverLoja(nomeLojaStr);
      if (!lojaId) { erros.push(`Linha ${i + 1}: loja "${nomeLojaStr}" não encontrada`); continue; }

      const cor       = iCor >= 0 ? String(row[iCor] || '').trim() : null;
      const custo     = clampMoney(parseBR(iCusto >= 0 ? row[iCusto] : 0));
      const qtd       = Math.max(1, Number(iQtd >= 0 ? (row[iQtd] || 1) : 1));
      const chassiVal = iChassi >= 0 ? String(row[iChassi] || '').trim() : null;

      try {
        // Encontrar ou criar produto
        let produto = await prisma.produto.findFirst({ where: { nome: { equals: nomeModelo, mode: 'insensitive' } } });
        if (!produto) {
          const tipoProduto = nomeModelo.toLowerCase().includes('moto') || chassiVal ? 'MOTO' : 'PECA';
          const codigo = await gerarCodigoProduto(tipoProduto);
          produto = await prisma.produto.create({ data: { codigo, nome: nomeModelo, tipo: tipoProduto, custo, preco: custo > 0 ? custo * 1.3 : 0, percentualLucro: 30, ativo: true } });
          criados++;
        } else if (custo > 0 && Number(produto.custo) !== custo) {
          await prisma.produto.update({ where: { id: produto.id }, data: { custo } });
          atualizados++;
        }

        // Se tem chassi e é MOTO → criar UnidadeFisica
        if (chassiVal && produto.tipo === 'MOTO') {
          const dup = await prisma.unidadeFisica.findFirst({ where: { chassi: chassiVal } });
          if (dup) { erros.push(`Linha ${i + 1}: chassi "${chassiVal}" já cadastrado`); continue; }

          const prefixo = 'TMUNI';
          const ultimo = await prisma.unidadeFisica.findFirst({ where: { numeroSerie: { startsWith: prefixo } }, orderBy: { numeroSerie: 'desc' } });
          let seq = 1;
          if (ultimo?.numeroSerie) { const m = ultimo.numeroSerie.match(/\d+$/); if (m) seq = parseInt(m[0]) + 1; }
          await prisma.unidadeFisica.create({
            data: { produtoId: produto.id, lojaId, chassi: chassiVal, cor: cor || null, ano: new Date().getFullYear(), numeroSerie: `${prefixo}${String(seq).padStart(5, '0')}`, status: 'ESTOQUE', createdBy: userId },
          });
        }

        // Lançar entrada de estoque
        const estoqueAtual = await prisma.estoque.findUnique({ where: { produtoId_lojaId: { produtoId: produto.id, lojaId } } });
        const qtdAnt = estoqueAtual?.quantidade ?? 0;
        await prisma.estoque.upsert({
          where: { produtoId_lojaId: { produtoId: produto.id, lojaId } },
          update: { quantidade: { increment: qtd } },
          create: { produtoId: produto.id, lojaId, quantidade: qtd },
        });
        await prisma.logEstoque.create({
          data: { tipo: 'ENTRADA', origem: 'IMPORTACAO_ESTOQUE', produtoId: produto.id, lojaId, quantidade: qtd, quantidadeAnterior: qtdAnt, quantidadeNova: qtdAnt + qtd, usuarioId: userId },
        });
        entradasLancadas++;
      } catch (lineErr: any) {
        erros.push(`Linha ${i + 1} (${nomeModelo}): ${lineErr.message}`);
      }
    }

    res.json({
      sucesso: true,
      totalLinhas: rows.length - 1,
      produtosCriados: criados,
      produtosAtualizados: atualizados,
      entradasLancadas,
      erros: erros.length,
      detalhesErros: erros.slice(0, 20),
    });
  } catch (error: any) {
    console.error('[Importação Estoque]', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/gerar-codigo/:tipo', verifyToken, async (req, res) => {
  try {
    const { tipo } = req.params;
    let codigo: string;

    switch (tipo) {
      case 'MOTO':
      case 'PECA':
        codigo = await gerarCodigoProduto(tipo);
        break;
      case 'OS':
        codigo = await gerarCodigoOS();
        break;
      case 'UNIDADE':
        codigo = await gerarNumeroSerieUnidade();
        break;
      default:
        return res.status(400).json({ error: 'Tipo invalido' });
    }

    res.json({ codigo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

export { gerarCodigoProduto, gerarCodigoOS, gerarNumeroSerieUnidade };
