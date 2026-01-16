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

async function gerarCodigoUnidade(): Promise<string> {
  const prefixo = 'TMUNI';
  
  const ultimo = await prisma.unidadeFisica.findFirst({
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

    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      if (!row || !row[1]) continue;

      const nome = String(row[1] || '').trim();
      const custo = parseFloat(row[2]) || 0;
      const categoria = String(row[11] || 'Peça').trim().toLowerCase();
      const tipo = categoria.includes('moto') ? 'MOTO' : 'PECA';

      if (!nome) {
        erros.push(`Linha ${i + 1}: Nome do produto vazio`);
        continue;
      }

      const percentualCusto = tipo === 'MOTO' ? 0.7368 : 0.40;
      const percentualLucro = tipo === 'MOTO' ? 26.32 : 60;
      const preco = custo > 0 ? custo / percentualCusto : 0;

      const existente = await prisma.produto.findFirst({ where: { nome } });
      if (existente) {
        const produtoAtualizado = await prisma.produto.update({
          where: { id: existente.id },
          data: {
            tipo,
            custo,
            percentualLucro,
            preco
          }
        });
        produtosAtualizados.push(produtoAtualizado);
        continue;
      }

      const codigo = await gerarCodigoProduto(tipo);

      const produto = await prisma.produto.create({
        data: {
          codigo,
          nome,
          tipo,
          custo,
          percentualLucro,
          preco,
          ativo: true
        }
      });

      produtosCriados.push(produto);
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

      const codigo = await gerarCodigoUnidade();

      const unidade = await prisma.unidadeFisica.create({
        data: {
          codigo,
          produtoId: produto.id,
          lojaId: parseInt(lojaId),
          cor: cor || null,
          chassi: chassi || null,
          codigoMotor: motor || null,
          ano,
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
        codigo = await gerarCodigoUnidade();
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

export { gerarCodigoProduto, gerarCodigoOS, gerarCodigoUnidade };
