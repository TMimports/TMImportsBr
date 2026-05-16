import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminGeral, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' }
    });
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const produto = await prisma.produto.findUnique({
      where: { id: Number(req.params.id) },
      include: { estoques: { include: { loja: true } } }
    });
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { nome, tipo, descricao } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const tiposValidos = ['MOTO', 'PECA', 'SERVICO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use MOTO, PECA ou SERVICO' });
    }

    const produtoCriado = await prisma.produto.create({
      data: {
        nome,
        tipo,
        descricao: descricao || null,
        custo: 0,
        percentualLucro: 0,
        preco: 0,
        createdBy: req.user!.id
      }
    });

    const prefixoTipo: Record<string, string> = { MOTO: 'MOT', PECA: 'PEC', SERVICO: 'SRV' };
    const codigoProduto = `TM${prefixoTipo[tipo] || 'PRD'}${produtoCriado.id.toString().padStart(5, '0')}`;
    const produto = await prisma.produto.update({
      where: { id: produtoCriado.id },
      data: { codigo: codigoProduto }
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const {
      nome, tipo, descricao, ativo,
      custo, percentualLucro, preco,
      precoTabela, precoCartao, parcela10x, precoDinheiro,
    } = req.body;

    const data: any = {};
    if (nome !== undefined)           data.nome = nome;
    if (tipo !== undefined)           data.tipo = tipo;
    if (descricao !== undefined)      data.descricao = descricao;
    if (ativo !== undefined)          data.ativo = ativo;
    if (custo !== undefined)          data.custo = Number(custo);
    if (percentualLucro !== undefined) data.percentualLucro = Number(percentualLucro);
    if (preco !== undefined)          data.preco = Number(preco);
    if (precoTabela !== undefined)    data.precoTabela    = precoTabela !== '' && precoTabela !== null ? Number(precoTabela) : null;
    if (precoCartao !== undefined)    data.precoCartao    = precoCartao !== '' && precoCartao !== null ? Number(precoCartao) : null;
    if (parcela10x !== undefined)     data.parcela10x     = parcela10x  !== '' && parcela10x  !== null ? Number(parcela10x)  : null;
    if (precoDinheiro !== undefined)  data.precoDinheiro  = precoDinheiro !== '' && precoDinheiro !== null ? Number(precoDinheiro) : null;

    const produto = await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data
    });

    // Limpar overrides zero nos estoques
    if (custo !== undefined) {
      await prisma.estoque.updateMany({
        where: { produtoId: Number(req.params.id), custoMedio: 0 },
        data: { custoMedio: null },
      });
    }
    if (preco !== undefined) {
      await prisma.estoque.updateMany({
        where: { produtoId: Number(req.params.id), precoVenda: 0 },
        data: { precoVenda: null },
      });
    }

    res.json(produto);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── IMPORTAR TABELA DE PREÇOS ────────────────────────────────────────────────
// Normaliza nomes de modelo para evitar duplicidade:
// "TM 11" = "TM-11" = "TM11", "MÔNACO" = "MONACO", "E-TREK" = "ETREK" = "E TREK"
function normalizarModelo(nome: string): string {
  const nfd = nome.trim().toUpperCase().normalize('NFD');
  return [...nfd].filter(c => {
    const cp = c.codePointAt(0) ?? 0;
    return !((cp >= 0x0300 && cp <= 0x036F) || cp === 0x0327 || cp === 0x0328);
  }).join('').replace(/[\s\-_.]+/g, '');
}

function ehNumeroPuro(v: string): boolean {
  const s = v.trim().replace(',', '.').replace(/\s/g, '');
  return s !== '' && !isNaN(Number(s)) && isFinite(Number(s));
}

interface LinhaTabela {
  modelo: string;
  de: number | null;
  porCartao10x: number | null;
  parcela10x: number | null;
  dinheiroOuPix: number | null;
}

router.post('/importar-tabela-precos', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { linhas }: { linhas: LinhaTabela[] } = req.body;

    if (!Array.isArray(linhas) || linhas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha recebida' });
    }

    let criados = 0, atualizados = 0, ignorados = 0;
    const erros: string[] = [];

    // Carregar todos os produtos MOTO para matching por nome normalizado
    const todosProdutos = await prisma.produto.findMany();
    const mapaExistentes = new Map(todosProdutos.map(p => [normalizarModelo(p.nome), p]));

    const prefixoTipo: Record<string, string> = { MOTO: 'MOT', PECA: 'PEC', SERVICO: 'SRV' };

    for (const linha of linhas) {
      const modelo = (linha.modelo || '').toString().trim();

      // Ignorar linhas vazias ou cabeçalhos repetidos
      const nomNorm = normalizarModelo(modelo);
      if (!modelo || nomNorm === 'MODELO' || nomNorm === 'PRODUTO' || nomNorm === '') {
        ignorados++;
        continue;
      }

      // Rejeitar se modelo for número puro (erro de coluna na leitura)
      if (ehNumeroPuro(modelo)) {
        erros.push(`Ignorado: Modelo="${modelo}" é um número puro — verifique as colunas da planilha`);
        ignorados++;
        continue;
      }

      const chave = normalizarModelo(modelo);
      const produtoExistente = mapaExistentes.get(chave);

      const dadosPreco: any = {};
      if (linha.de !== null && linha.de !== undefined && !isNaN(Number(linha.de)))
        dadosPreco.precoTabela = Number(linha.de);
      if (linha.porCartao10x !== null && linha.porCartao10x !== undefined && !isNaN(Number(linha.porCartao10x))) {
        dadosPreco.precoCartao = Number(linha.porCartao10x);
        dadosPreco.preco = Number(linha.porCartao10x); // preco principal = cartão
      }
      if (linha.parcela10x !== null && linha.parcela10x !== undefined && !isNaN(Number(linha.parcela10x)))
        dadosPreco.parcela10x = Number(linha.parcela10x);
      if (linha.dinheiroOuPix !== null && linha.dinheiroOuPix !== undefined && !isNaN(Number(linha.dinheiroOuPix)))
        dadosPreco.precoDinheiro = Number(linha.dinheiroOuPix);

      try {
        if (produtoExistente) {
          await prisma.produto.update({
            where: { id: produtoExistente.id },
            data: dadosPreco,
          });

          // Limpar overrides zero nos estoques quando preço é atualizado
          if (dadosPreco.preco !== undefined) {
            await prisma.estoque.updateMany({
              where: { produtoId: produtoExistente.id, precoVenda: 0 },
              data: { precoVenda: null },
            });
          }

          atualizados++;
        } else {
          // Criar novo produto como MOTO
          const novoProd = await prisma.produto.create({
            data: {
              nome: modelo,
              tipo: 'MOTO',
              custo: 0,
              percentualLucro: 0,
              preco: dadosPreco.preco || 0,
              ...dadosPreco,
              createdBy: req.user!.id,
            },
          });
          const codigo = `TM${prefixoTipo['MOTO']}${novoProd.id.toString().padStart(5, '0')}`;
          const prodAtualizado = await prisma.produto.update({ where: { id: novoProd.id }, data: { codigo } });
          mapaExistentes.set(chave, prodAtualizado);
          criados++;
        }
      } catch (err: any) {
        erros.push(`"${modelo}": ${err.message}`);
      }
    }

    res.json({ ok: true, criados, atualizados, ignorados, erros });
  } catch (error) {
    console.error('Erro ao importar tabela de preços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/normalizar-codigos', requireAdminGeral, async (req: AuthRequest, res) => {
  try {
    const prefixoTipo: Record<string, string> = { MOTO: 'MOT', PECA: 'PEC', SERVICO: 'SRV' };
    const todos = await prisma.produto.findMany({ orderBy: { id: 'asc' } });
    const semFormato = todos.filter(p => !p.codigo.startsWith('TM'));
    let atualizados = 0;
    for (const p of semFormato) {
      const novoCodigo = `TM${prefixoTipo[p.tipo] || 'PRD'}${p.id.toString().padStart(5, '0')}`;
      await prisma.produto.update({ where: { id: p.id }, data: { codigo: novoCodigo } });
      atualizados++;
    }
    res.json({ message: `${atualizados} produtos atualizados`, total: todos.length, atualizados });
  } catch (error) {
    console.error('Erro ao normalizar códigos de produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireAdminGeral, async (req, res) => {
  try {
    await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data: { ativo: false }
    });
    res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
