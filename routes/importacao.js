const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { isAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { Produto, ItemEstoque, Estoque } = require('../models');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use Excel (.xlsx, .xls) ou CSV.'));
    }
  }
});

function identificarTipo(row) {
  const nome = (row.nome || row.Nome || row.NOME || row.descricao || row.Descricao || '').toLowerCase();
  const tipo = (row.tipo || row.Tipo || row.TIPO || '').toUpperCase();
  const categoria = (row.categoria || row.Categoria || row.CATEGORIA || '').toLowerCase();
  
  if (tipo === 'MOTO' || tipo === 'SCOOTER') return 'MOTO';
  if (tipo === 'PECA' || tipo === 'PRODUTO') return 'PRODUTO';
  if (tipo === 'SERVICO') return 'SERVICO';
  
  if (nome.includes('moto') || nome.includes('scooter') || nome.includes('bike') || 
      nome.includes('eletrica') || nome.includes('elétrica') || categoria.includes('moto') ||
      row.chassi || row.Chassi || row.codigo_motor) {
    return 'MOTO';
  }
  
  if (nome.includes('serviço') || nome.includes('servico') || nome.includes('manutenção') ||
      nome.includes('manutencao') || nome.includes('instalação') || nome.includes('reparo') ||
      nome.includes('revisão') || nome.includes('troca') || categoria.includes('servico') ||
      categoria.includes('serviço')) {
    return 'SERVICO';
  }
  
  return 'PRODUTO';
}

function extrairDados(row) {
  const keys = Object.keys(row);
  const primeiraColuna = keys.length > 0 ? row[keys[0]] : '';
  
  const getNome = () => {
    const campos = ['nome', 'Nome', 'NOME', 'descricao', 'Descricao', 'DESCRICAO', 
                    'produto', 'Produto', 'PRODUTO', 'item', 'Item', 'ITEM',
                    'description', 'Description', 'name', 'Name', 'NAME'];
    for (const campo of campos) {
      if (row[campo] && String(row[campo]).trim()) return String(row[campo]).trim();
    }
    if (primeiraColuna && String(primeiraColuna).trim()) return String(primeiraColuna).trim();
    return '';
  };
  
  const getNumero = (campos, valorDefault = 0) => {
    for (const campo of campos) {
      if (row[campo] !== undefined && row[campo] !== null && row[campo] !== '') {
        const val = String(row[campo]).replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
    }
    return valorDefault;
  };
  
  const getString = (campos, valorDefault = '') => {
    for (const campo of campos) {
      if (row[campo] && String(row[campo]).trim()) return String(row[campo]).trim();
    }
    return valorDefault;
  };
  
  return {
    nome: getNome(),
    codigo_interno: getString(['codigo', 'Codigo', 'CODIGO', 'codigo_interno', 'sku', 'SKU', 'cod', 'Cod', 'COD', 'ref', 'Ref', 'REF', 'referencia', 'Referencia']) || null,
    preco: getNumero(['preco', 'Preco', 'PRECO', 'valor', 'Valor', 'VALOR', 'price', 'Price', 'venda', 'Venda', 'preco_venda', 'valor_venda']),
    custo: getNumero(['custo', 'Custo', 'CUSTO', 'cost', 'Cost', 'preco_custo', 'valor_custo']),
    categoria: getString(['categoria', 'Categoria', 'CATEGORIA', 'category', 'Category', 'tipo', 'Tipo'], 'Geral'),
    descricao: getString(['descricao_completa', 'obs', 'observacao', 'Observacao', 'observacoes', 'Observacoes', 'detalhes', 'Detalhes']),
    marca: getString(['marca', 'Marca', 'MARCA', 'brand', 'Brand', 'fabricante', 'Fabricante']),
    modelo: getString(['modelo', 'Modelo', 'MODELO', 'model', 'Model']),
    cor: getString(['cor', 'Cor', 'COR', 'color', 'Color', 'cores', 'Cores']),
    chassi: getString(['chassi', 'Chassi', 'CHASSI', 'chassis', 'Chassis']) || null,
    codigo_motor: getString(['codigo_motor', 'motor', 'Motor', 'MOTOR', 'num_motor']) || null,
    capacidade_bateria: getString(['bateria', 'Bateria', 'BATERIA', 'capacidade_bateria', 'battery']) || null,
    quantidade: Math.max(1, Math.floor(getNumero(['quantidade', 'Quantidade', 'QUANTIDADE', 'qtd', 'Qtd', 'QTD', 'estoque', 'Estoque', 'qty', 'Qty'], 1)))
  };
}

router.get('/', isAdmin, async (req, res) => {
  try {
    res.render('importacao/index', {
      user: req.session.user,
      csrfToken: req.session.csrfToken,
      success: req.query.success,
      error: req.query.error,
      importados: req.query.importados || 0,
      atualizados: req.query.atualizados || 0,
      erros: req.query.erros || 0
    });
  } catch (error) {
    console.error('Erro ao carregar página de importação:', error);
    res.render('error', { message: 'Erro ao carregar página.', user: req.session.user });
  }
});

router.post('/processar', isAdmin, upload.single('planilha'), validateCsrf, async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/importacao?error=Nenhum arquivo enviado');
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(sheet);

    if (!dados || dados.length === 0) {
      return res.redirect('/importacao?error=Planilha vazia ou formato inválido');
    }

    let importados = 0;
    let atualizados = 0;
    let erros = 0;

    const estoquePrincipal = await Estoque.findOne({ where: { ativo: true }, order: [['id', 'ASC']] });

    for (const row of dados) {
      try {
        const tipo = identificarTipo(row);
        const dadosItem = extrairDados(row);

        if (!dadosItem.nome || dadosItem.nome.trim() === '') {
          erros++;
          continue;
        }

        let produtoExistente = null;
        if (dadosItem.codigo_interno) {
          produtoExistente = await Produto.findOne({ 
            where: { codigo_interno: dadosItem.codigo_interno } 
          });
        }
        if (!produtoExistente) {
          produtoExistente = await Produto.findOne({ 
            where: { nome: dadosItem.nome.trim() } 
          });
        }

        if (produtoExistente) {
          await produtoExistente.update({
            preco: dadosItem.preco || produtoExistente.preco,
            custo: dadosItem.custo || produtoExistente.custo,
            categoria: dadosItem.categoria || produtoExistente.categoria,
            descricao: dadosItem.descricao || produtoExistente.descricao,
            marca: dadosItem.marca || produtoExistente.marca,
            modelo: dadosItem.modelo || produtoExistente.modelo,
            cor: dadosItem.cor || produtoExistente.cor,
            chassi: dadosItem.chassi || produtoExistente.chassi,
            codigo_motor: dadosItem.codigo_motor || produtoExistente.codigo_motor,
            capacidade_bateria: dadosItem.capacidade_bateria || produtoExistente.capacidade_bateria
          });
          atualizados++;
        } else {
          const novoProduto = await Produto.create({
            nome: dadosItem.nome.trim(),
            codigo_interno: dadosItem.codigo_interno,
            tipo: tipo,
            preco: dadosItem.preco,
            custo: dadosItem.custo,
            categoria: dadosItem.categoria,
            descricao: dadosItem.descricao,
            marca: dadosItem.marca,
            modelo: dadosItem.modelo,
            cor: dadosItem.cor,
            chassi: dadosItem.chassi,
            codigo_motor: dadosItem.codigo_motor,
            capacidade_bateria: dadosItem.capacidade_bateria,
            ativo: true
          });

          if (estoquePrincipal && dadosItem.quantidade > 0) {
            await ItemEstoque.create({
              produto_id: novoProduto.id,
              estoque_id: estoquePrincipal.id,
              quantidade: dadosItem.quantidade,
              quantidade_minima: 1,
              ativo: true
            });
          }

          importados++;
        }
      } catch (itemError) {
        console.error('Erro ao processar item:', itemError);
        erros++;
      }
    }

    res.redirect(`/importacao?success=true&importados=${importados}&atualizados=${atualizados}&erros=${erros}`);
  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    res.redirect('/importacao?error=' + encodeURIComponent(error.message));
  }
});

router.get('/modelo', isAdmin, (req, res) => {
  const wb = XLSX.utils.book_new();
  
  const dadosExemplo = [
    {
      nome: 'Scooter Elétrica X1',
      tipo: 'MOTO',
      codigo: 'SCOOT-001',
      preco: 8999.90,
      custo: 6500.00,
      categoria: 'Scooters',
      marca: 'Tecle',
      modelo: 'X1 2024',
      cor: 'Preto',
      chassi: 'ABC123456789',
      codigo_motor: 'MOT-001',
      bateria: '72V 20Ah',
      quantidade: 5
    },
    {
      nome: 'Bateria 60V 20Ah',
      tipo: 'PRODUTO',
      codigo: 'BAT-001',
      preco: 1299.90,
      custo: 900.00,
      categoria: 'Baterias',
      marca: 'Tecle',
      modelo: 'Standard',
      cor: '',
      chassi: '',
      codigo_motor: '',
      bateria: '',
      quantidade: 20
    },
    {
      nome: 'Revisão Completa',
      tipo: 'SERVICO',
      codigo: 'SERV-001',
      preco: 350.00,
      custo: 0,
      categoria: 'Manutenção',
      marca: '',
      modelo: '',
      cor: '',
      chassi: '',
      codigo_motor: '',
      bateria: '',
      quantidade: 0
    }
  ];

  const ws = XLSX.utils.json_to_sheet(dadosExemplo);
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_teclemotos.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
