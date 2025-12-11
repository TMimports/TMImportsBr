const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { Product, Category, InventoryMain, InventoryStore, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { tipo, categoria_id, busca, ativo } = req.query;
    const where = {};
    
    if (tipo) where.tipo = tipo;
    if (categoria_id) where.categoria_id = categoria_id;
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { codigo: { [Op.iLike]: `%${busca}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: 'categoria' }],
      order: [['nome', 'ASC']]
    });

    res.json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: InventoryMain, as: 'estoque_central' }
      ]
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

router.post('/', isGestorOuAdmin, async (req, res) => {
  try {
    const dados = req.body;
    
    if (dados.preco_custo && dados.percentual_lucro && !dados.preco_venda) {
      const custo = parseFloat(dados.preco_custo) || 0;
      const lucro = parseFloat(dados.percentual_lucro) || 0;
      dados.preco_venda = custo + (custo * lucro / 100);
    }

    if (dados.desconto && dados.preco_venda) {
      const preco = parseFloat(dados.preco_venda) || 0;
      const desconto = parseFloat(dados.desconto) || 0;
      dados.preco_venda = preco - (preco * desconto / 100);
    }

    const product = await Product.create(dados);

    await InventoryMain.create({
      produto_id: product.id,
      quantidade: 0
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'products',
      registro_id: product.id,
      dados_depois: { nome: product.nome, codigo: product.codigo }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const dados = req.body;
    
    if (dados.preco_custo !== undefined && dados.percentual_lucro !== undefined) {
      const custo = parseFloat(dados.preco_custo) || 0;
      const lucro = parseFloat(dados.percentual_lucro) || 0;
      dados.preco_venda = custo + (custo * lucro / 100);
    }

    const dadosAntes = { nome: product.nome, preco_venda: product.preco_venda };

    await product.update(dados);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'products',
      registro_id: product.id,
      dados_antes: dadosAntes,
      dados_depois: { nome: product.nome, preco_venda: product.preco_venda }
    });

    res.json(product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

router.delete('/limpar-tudo', isGestorOuAdmin, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      return res.status(403).json({ error: 'Apenas Admin Global pode limpar todos os produtos' });
    }

    await InventoryMain.destroy({ where: {} });
    await InventoryStore.destroy({ where: {} });
    await Product.destroy({ where: {} });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE_ALL',
      tabela: 'products',
      dados_antes: { acao: 'Limpeza total de produtos' }
    });

    res.json({ message: 'Todos os produtos foram excluídos' });
  } catch (error) {
    console.error('Erro ao limpar produtos:', error);
    res.status(500).json({ error: 'Erro ao limpar produtos' });
  }
});

router.delete('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'products',
      registro_id: product.id,
      dados_antes: { nome: product.nome, codigo: product.codigo }
    });

    await InventoryMain.destroy({ where: { produto_id: product.id } });
    await InventoryStore.destroy({ where: { produto_id: product.id } });
    await product.destroy();

    res.json({ message: 'Produto excluído' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

router.post('/importar', isGestorOuAdmin, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Função para normalizar texto (remover acentos, espaços extras, lowercase)
    function normalizeKey(str) {
      if (!str) return '';
      return str.toString()
        .toLowerCase()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]/g, ''); // remove caracteres especiais
    }
    
    // Função para parsear valores monetários brasileiros (R$ 1.234,56)
    function parseMonetario(valor) {
      if (valor === null || valor === undefined || valor === '') return 0;
      if (typeof valor === 'number') return valor;
      
      let str = valor.toString().trim();
      // Remove símbolos de moeda e espaços
      str = str.replace(/[R$\s]/g, '');
      // Se tem formato brasileiro (1.234,56), converte
      if (str.includes(',')) {
        // Remove pontos de milhar e troca vírgula por ponto
        str = str.replace(/\./g, '').replace(',', '.');
      }
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    
    // Função para buscar valor em uma linha usando múltiplas variações de nome de coluna
    function getRowValue(row, rowNormalized, possibleNames) {
      // Primeiro tenta match exato
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== '') return row[name];
      }
      // Depois tenta match normalizado
      const normalizedNames = possibleNames.map(n => normalizeKey(n));
      for (const key in rowNormalized) {
        if (normalizedNames.includes(key) && rowNormalized[key] !== undefined && rowNormalized[key] !== '') {
          return rowNormalized[key];
        }
      }
      return '';
    }
    
    // Lê TODAS as abas da planilha
    let allData = [];
    const abasProcessadas = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      console.log(`Aba "${sheetName}": ${sheetData.length} linhas encontradas`);
      if (sheetData.length > 0) {
        console.log(`Colunas encontradas: ${Object.keys(sheetData[0]).join(', ')}`);
      }
      abasProcessadas.push({ nome: sheetName, linhas: sheetData.length });
      allData = allData.concat(sheetData);
    }
    
    console.log(`Total de linhas a processar: ${allData.length}`);

    const resultados = { 
      criados: 0, 
      atualizados: 0, 
      erros: [],
      linhasLidas: allData.length,
      abasProcessadas,
      porTipo: { MOTO: 0, SERVICO: 0, PECA: 0 },
      colunasEncontradas: allData.length > 0 ? Object.keys(allData[0]) : []
    };

    for (const row of allData) {
      try {
        // Cria versão normalizada das chaves da linha
        const rowNormalized = {};
        for (const key in row) {
          rowNormalized[normalizeKey(key)] = row[key];
        }
        
        // Busca código com múltiplas variações
        const codigo = getRowValue(row, rowNormalized, [
          'Código', 'codigo', 'CODIGO', 'Codigo', 'SKU', 'sku', 'Cód', 'COD', 'cod',
          'Código Produto', 'Codigo Produto', 'CódigoProduto', 'CodigoProduto',
          'Ref', 'REF', 'Referência', 'Referencia', 'ID', 'id', 'Item', 'item'
        ]);
        
        // Busca nome/descrição com múltiplas variações
        const nome = getRowValue(row, rowNormalized, [
          'Descrição', 'Nome', 'nome', 'descricao', 'Descricao', 'NOME', 'DESCRIÇÃO', 'DESCRICAO',
          'Produto', 'produto', 'PRODUTO', 'Descrição do Produto', 'Nome do Produto',
          'Desc', 'DESC', 'Description', 'Name', 'Título', 'Titulo', 'titulo'
        ]);
        
        // Pula linhas sem nome
        if (!nome || nome.toString().trim() === '') {
          continue;
        }
        
        // Busca preço de venda com múltiplas variações
        const precoRaw = getRowValue(row, rowNormalized, [
          'Preço', 'preco', 'Preço Venda', 'Preco', 'PREÇO', 'valor', 'Valor', 'VALOR',
          'Preço de Venda', 'preco_venda', 'PrecoVenda', 'Venda', 'venda', 'VENDA',
          'Price', 'price', 'Preço Final', 'preco_final', 'Preço Unitário', 'Unit'
        ]);
        const preco = parseMonetario(precoRaw);
        
        // Busca preço de custo com múltiplas variações
        const precoCustoRaw = getRowValue(row, rowNormalized, [
          'Preço Custo', 'preco_custo', 'Custo', 'custo', 'CUSTO', 'Preço de Custo',
          'PrecoCusto', 'Cost', 'cost', 'Custo Unitário', 'Valor Custo', 'Compra'
        ]);
        const precoCusto = parseMonetario(precoCustoRaw);
        
        // Primeiro tenta ler a coluna Tipo da planilha
        let tipoRaw = getRowValue(row, rowNormalized, [
          'Tipo', 'tipo', 'TIPO', 'Categoria', 'categoria', 'CATEGORIA',
          'Classificação', 'classificacao', 'CLASSIFICACAO', 'Classe', 'classe',
          'Grupo', 'grupo', 'GRUPO', 'Type', 'type', 'Category', 'category'
        ]);
        let tipo = 'PECA';
        
        const tipoUpper = tipoRaw.toString().toUpperCase().trim();
        const nomeUpper = (nome || '').toUpperCase();
        
        // Verifica se o tipo foi especificado na planilha
        if (tipoUpper.includes('MOTO') || tipoUpper.includes('SCOOTER') || tipoUpper.includes('BICICLETA') || tipoUpper.includes('VEICULO') || tipoUpper.includes('VEÍCULO') || tipoUpper.includes('ELETRIC')) {
          tipo = 'MOTO';
        } else if (tipoUpper.includes('SERV') || tipoUpper.includes('MÃO') || tipoUpper.includes('MAO') || tipoUpper.includes('OBRA') || tipoUpper.includes('SERVICE')) {
          tipo = 'SERVICO';
        } else if (tipoUpper.includes('PECA') || tipoUpper.includes('PEÇA') || tipoUpper.includes('ACESSORIO') || tipoUpper.includes('ACESSÓRIO')) {
          tipo = 'PECA';
        }
        // Se não encontrou tipo na coluna, tenta detectar pelo nome
        else if (nomeUpper.includes('MOTO') || nomeUpper.includes('SCOOTER') || nomeUpper.includes('BICICLETA') || nomeUpper.includes('PATINETE') || nomeUpper.includes('TRICICLO') || nomeUpper.includes('ELETRIC')) {
          tipo = 'MOTO';
        } else if (nomeUpper.includes('SERVIÇO') || nomeUpper.includes('SERVICO') || nomeUpper.includes('MÃO DE OBRA') || nomeUpper.includes('INSTALAÇÃO') || nomeUpper.includes('REPARO') || nomeUpper.includes('REVISÃO') || nomeUpper.includes('MANUTENÇÃ') || nomeUpper.includes('TROCA DE')) {
          tipo = 'SERVICO';
        }

        const existente = codigo ? await Product.findOne({ where: { codigo: codigo.toString().trim() } }) : null;

        if (existente) {
          await existente.update({
            nome: nome || existente.nome,
            preco_venda: preco || existente.preco_venda,
            preco_custo: precoCusto || existente.preco_custo,
            tipo: tipo
          });
          resultados.atualizados++;
          resultados.porTipo[tipo]++;
        } else {
          const product = await Product.create({
            codigo: codigo ? codigo.toString().trim() : `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            nome: nome.toString().trim(),
            preco_venda: preco,
            preco_custo: precoCusto,
            tipo
          });
          
          await InventoryMain.create({
            produto_id: product.id,
            quantidade: 0
          });
          
          resultados.criados++;
          resultados.porTipo[tipo]++;
        }
      } catch (err) {
        console.error('Erro ao processar linha:', row, err.message);
        resultados.erros.push({ linha: JSON.stringify(row).substring(0, 100), erro: err.message });
      }
    }

    console.log('Resultado da importação:', resultados);
    res.json(resultados);
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ error: 'Erro ao importar planilha: ' + error.message });
  }
});

module.exports = router;
