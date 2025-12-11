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
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const resultados = { criados: 0, atualizados: 0, erros: [] };

    for (const row of data) {
      try {
        const codigo = row['Código'] || row['codigo'] || row['SKU'] || row['sku'] || row['Codigo'];
        const nome = row['Descrição'] || row['Nome'] || row['nome'] || row['descricao'] || row['Descricao'] || row['NOME'] || row['DESCRIÇÃO'];
        const preco = parseFloat(row['Preço'] || row['preco'] || row['Preço Venda'] || row['Preco'] || row['PREÇO'] || row['valor'] || row['Valor'] || 0);
        const precoCusto = parseFloat(row['Preço Custo'] || row['preco_custo'] || row['Custo'] || row['custo'] || row['CUSTO'] || 0);
        
        // Primeiro tenta ler a coluna Tipo da planilha
        let tipoRaw = row['Tipo'] || row['tipo'] || row['TIPO'] || row['Categoria'] || row['categoria'] || row['CATEGORIA'] || '';
        let tipo = 'PECA';
        
        const tipoUpper = tipoRaw.toString().toUpperCase().trim();
        const nomeUpper = (nome || '').toUpperCase();
        
        // Verifica se o tipo foi especificado na planilha
        if (tipoUpper.includes('MOTO') || tipoUpper.includes('SCOOTER') || tipoUpper.includes('BICICLETA') || tipoUpper.includes('VEICULO') || tipoUpper.includes('VEÍCULO')) {
          tipo = 'MOTO';
        } else if (tipoUpper.includes('SERV') || tipoUpper.includes('MÃO') || tipoUpper.includes('MAO') || tipoUpper.includes('OBRA') || tipoUpper.includes('SERVICE')) {
          tipo = 'SERVICO';
        } else if (tipoUpper.includes('PECA') || tipoUpper.includes('PEÇA') || tipoUpper.includes('ACESSORIO') || tipoUpper.includes('ACESSÓRIO')) {
          tipo = 'PECA';
        }
        // Se não encontrou tipo na coluna, tenta detectar pelo nome
        else if (nomeUpper.includes('MOTO') || nomeUpper.includes('SCOOTER') || nomeUpper.includes('BICICLETA') || nomeUpper.includes('PATINETE')) {
          tipo = 'MOTO';
        } else if (nomeUpper.includes('SERVIÇO') || nomeUpper.includes('SERVICO') || nomeUpper.includes('MÃO DE OBRA') || nomeUpper.includes('INSTALAÇÃO') || nomeUpper.includes('REPARO') || nomeUpper.includes('REVISÃO')) {
          tipo = 'SERVICO';
        }

        const existente = codigo ? await Product.findOne({ where: { codigo } }) : null;

        if (existente) {
          await existente.update({
            nome: nome || existente.nome,
            preco_venda: preco || existente.preco_venda,
            preco_custo: precoCusto || existente.preco_custo
          });
          resultados.atualizados++;
        } else {
          const product = await Product.create({
            codigo: codigo || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            nome: nome || 'Produto sem nome',
            preco_venda: preco,
            preco_custo: precoCusto,
            tipo
          });
          
          await InventoryMain.create({
            produto_id: product.id,
            quantidade: 0
          });
          
          resultados.criados++;
        }
      } catch (err) {
        resultados.erros.push({ linha: row, erro: err.message });
      }
    }

    res.json(resultados);
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ error: 'Erro ao importar planilha' });
  }
});

module.exports = router;
