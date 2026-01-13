const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { Product, Category, InventoryMain, InventoryStore, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin } = require('../middleware/auth');
const { requireAnyPermission, requirePermission } = require('../middleware/permissions');
const { Op } = require('sequelize');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

async function gerarProximoCodigo(tipo) {
  const prefixos = {
    'MOTO': 'MOTO',
    'PECA': 'PECA',
    'SERVICO': 'SERV'
  };
  
  const prefixo = prefixos[tipo] || 'PROD';
  
  const ultimoProduto = await Product.findOne({
    where: {
      codigo: {
        [Op.like]: `${prefixo}-%`
      }
    },
    order: [['codigo', 'DESC']]
  });
  
  let proximoNumero = 1;
  
  if (ultimoProduto && ultimoProduto.codigo) {
    const match = ultimoProduto.codigo.match(new RegExp(`^${prefixo}-(\\d+)$`));
    if (match) {
      proximoNumero = parseInt(match[1], 10) + 1;
    } else {
      const count = await Product.count({
        where: {
          codigo: {
            [Op.like]: `${prefixo}-%`
          }
        }
      });
      proximoNumero = count + 1;
    }
  }
  
  return `${prefixo}-${String(proximoNumero).padStart(4, '0')}`;
}

router.get('/proximo-codigo/:tipo', async (req, res) => {
  try {
    const tipo = req.params.tipo.toUpperCase();
    const codigo = await gerarProximoCodigo(tipo);
    res.json({ codigo });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({ error: 'Erro ao gerar código' });
  }
});

router.get('/exportar', async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['tipo', 'ASC'], ['nome', 'ASC']]
    });
    
    const data = products.map(p => ({
      'Código': p.codigo || '',
      'Produto': p.nome || '',
      'Tipo': p.tipo || '',
      'Categoria': p.tipo === 'MOTO' ? 'Moto' : p.tipo === 'SERVICO' ? 'Serviço' : 'Peça',
      'Preço de Custo': p.preco_custo || 0,
      'Percentual de Lucro': p.percentual_lucro || 30,
      'Preço de Venda': p.preco_venda || 0,
      'Cor': p.cor || '',
      'Peso': p.peso || '',
      'Garantia': p.garantia || '',
      'Chassi': p.chassi || '',
      'Código Motor': p.codigo_motor || '',
      'Bateria': p.capacidade_bateria || '',
      'Localização': p.localizacao || '',
      'Estoque Mínimo': p.estoque_minimo || 0,
      'Estoque Máximo': p.estoque_maximo || 100,
      'Observações': p.descricao || ''
    }));
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 12 },
      { wch: 15 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 8 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];
    
    xlsx.utils.book_append_sheet(wb, ws, 'Produtos');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao exportar produtos:', error);
    res.status(500).json({ error: 'Erro ao exportar produtos' });
  }
});

router.get('/', requireAnyPermission('catalog.view', 'catalog.manage', 'services.view', 'services.manage'), async (req, res) => {
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

router.get('/:id', requireAnyPermission('catalog.view', 'catalog.manage', 'services.view', 'services.manage'), async (req, res) => {
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

router.post('/', requireAnyPermission('catalog.manage', 'services.manage'), async (req, res) => {
  try {
    const dados = req.body;
    
    if (!dados.codigo || dados.codigo.trim() === '') {
      dados.codigo = await gerarProximoCodigo(dados.tipo || 'PECA');
    }
    
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

router.put('/:id', requireAnyPermission('catalog.manage', 'services.manage'), async (req, res) => {
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

router.delete('/limpar-tudo', requirePermission('admin.seed_reset'), async (req, res) => {
  try {

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

router.delete('/:id', requireAnyPermission('catalog.manage', 'services.manage'), async (req, res) => {
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
    
    function limparTexto(str) {
      if (!str) return '';
      return str.toString().replace(/[\t\r\n]/g, '').trim();
    }
    
    function parseMonetario(valor) {
      if (valor === null || valor === undefined || valor === '') return 0;
      if (typeof valor === 'number') return valor;
      
      let str = valor.toString().trim();
      str = str.replace(/[R$\s]/g, '');
      if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      }
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    
    function getValorColuna(row, ...nomesColunas) {
      for (const nome of nomesColunas) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase().includes(nome.toLowerCase())) {
            const val = row[key];
            if (val !== undefined && val !== null && val !== '') {
              return val;
            }
          }
        }
      }
      return '';
    }
    
    let allData = [];
    const abasProcessadas = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      console.log(`Aba "${sheetName}": ${sheetData.length} linhas`);
      
      if (sheetData.length > 0) {
        const colunas = Object.keys(sheetData[0]);
        console.log(`Colunas: ${colunas.join(', ')}`);
        
        const temColunaProduto = colunas.some(c => 
          c.toLowerCase().includes('produto') || 
          c.toLowerCase().includes('descri') || 
          c.toLowerCase().includes('nome')
        );
        
        if (!temColunaProduto) {
          console.log(`Aba "${sheetName}" ignorada - não tem coluna de produto válida`);
          abasProcessadas.push({ nome: sheetName, linhas: 0, ignorada: true });
          continue;
        }
        
        const dadosValidos = sheetData.filter(row => {
          const produto = getValorColuna(row, 'produto', 'descrição', 'descricao', 'nome');
          return produto && limparTexto(produto).length > 0;
        });
        
        console.log(`Aba "${sheetName}": ${dadosValidos.length} linhas válidas`);
        abasProcessadas.push({ nome: sheetName, linhas: dadosValidos.length });
        allData = allData.concat(dadosValidos);
      } else {
        abasProcessadas.push({ nome: sheetName, linhas: 0 });
      }
    }
    
    console.log(`Total de linhas válidas: ${allData.length}`);

    const resultados = { 
      criados: 0, 
      atualizados: 0, 
      erros: [],
      linhasLidas: allData.length,
      abasProcessadas,
      porTipo: { MOTO: 0, SERVICO: 0, PECA: 0 },
      colunasEncontradas: allData.length > 0 ? Object.keys(allData[0]) : [],
      detalhes: []
    };

    for (const row of allData) {
      try {
        let codigoRaw = getValorColuna(row, 'código', 'codigo', 'cod', 'sku', 'ref');
        const codigo = limparTexto(codigoRaw);
        
        let nomeRaw = getValorColuna(row, 'produto', 'descrição', 'descricao', 'nome');
        const nome = limparTexto(nomeRaw);
        
        if (!nome) {
          continue;
        }
        
        const precoCustoRaw = getValorColuna(row, 'custo', 'preço de custo', 'preco de custo', 'preço custo', 'valor custo');
        const precoCusto = parseMonetario(precoCustoRaw);
        
        const percentualLucroRaw = getValorColuna(row, 'lucro', 'percentual', 'margem', '% lucro', 'markup');
        let percentualLucro = parseMonetario(percentualLucroRaw);
        if (percentualLucro === 0) percentualLucro = 30;
        
        const precoVendaRaw = getValorColuna(row, 'preço', 'preco', 'valor', 'venda', 'price', 'preço venda');
        let precoVenda = parseMonetario(precoVendaRaw);
        
        if (precoCusto > 0 && precoVenda === 0) {
          if (percentualLucro < 100) {
            const divisor = (100 - percentualLucro) / 100;
            precoVenda = precoCusto / divisor;
          } else {
            precoVenda = precoCusto * (1 + percentualLucro / 100);
          }
        }
        
        const descricaoRaw = getValorColuna(row, 'obs', 'observação', 'observacao', 'detalhes', 'info');
        const descricao = limparTexto(descricaoRaw);
        
        const garantiaRaw = getValorColuna(row, 'garantia', 'warranty');
        const garantia = limparTexto(garantiaRaw);
        
        const pesoRaw = getValorColuna(row, 'peso', 'weight', 'kg');
        const peso = parseMonetario(pesoRaw);
        
        const corRaw = getValorColuna(row, 'cor', 'color', 'cores');
        const cor = limparTexto(corRaw);
        
        const chassiRaw = getValorColuna(row, 'chassi', 'chassis', 'vin');
        const chassi = limparTexto(chassiRaw);
        
        const codigoMotorRaw = getValorColuna(row, 'motor', 'código motor', 'codigo motor');
        const codigoMotor = limparTexto(codigoMotorRaw);
        
        const capacidadeBateriaRaw = getValorColuna(row, 'bateria', 'capacidade', 'battery', 'ah', 'kwh');
        const capacidadeBateria = limparTexto(capacidadeBateriaRaw);
        
        const localizacaoRaw = getValorColuna(row, 'localização', 'localizacao', 'local', 'prateleira');
        const localizacao = limparTexto(localizacaoRaw);
        
        const estoqueMinimoRaw = getValorColuna(row, 'estoque mínimo', 'estoque minimo', 'min');
        const estoqueMinimo = parseInt(estoqueMinimoRaw) || 0;
        
        const estoqueMaximoRaw = getValorColuna(row, 'estoque máximo', 'estoque maximo', 'max');
        const estoqueMaximo = parseInt(estoqueMaximoRaw) || 100;
        
        let categoriaRaw = getValorColuna(row, 'categoria do produto', 'categoria', 'tipo', 'classificação', 'grupo');
        const categoriaStr = limparTexto(categoriaRaw).toUpperCase();
        
        let tipo = 'PECA';
        
        if (categoriaStr === 'MOTO' || categoriaStr.includes('MOTO') || categoriaStr.includes('SCOOTER') || categoriaStr.includes('VEICULO') || categoriaStr.includes('VEÍCULO') || categoriaStr.includes('ELÉTRIC')) {
          tipo = 'MOTO';
        } else if (categoriaStr === 'SERVIÇO' || categoriaStr === 'SERVICO' || categoriaStr.includes('SERV')) {
          tipo = 'SERVICO';
        } else if (categoriaStr === 'PEÇA' || categoriaStr === 'PECA' || categoriaStr.includes('PEÇA') || categoriaStr.includes('PECA') || categoriaStr.includes('ACESSÓRIO') || categoriaStr.includes('ACESSORIO')) {
          tipo = 'PECA';
        }

        const codigoLimpo = codigo || await gerarProximoCodigo(tipo);
        
        const existente = codigo ? await Product.findOne({ where: { codigo: codigoLimpo } }) : null;

        const dadosProduto = {
          nome,
          preco_custo: precoCusto,
          percentual_lucro: percentualLucro,
          preco_venda: precoVenda,
          tipo,
          descricao: descricao || null,
          garantia: garantia || null,
          peso: peso || null,
          cor: cor || null,
          chassi: chassi || null,
          codigo_motor: codigoMotor || null,
          capacidade_bateria: capacidadeBateria || null,
          localizacao: localizacao || null,
          estoque_minimo: estoqueMinimo,
          estoque_maximo: estoqueMaximo
        };

        if (existente) {
          await existente.update(dadosProduto);
          resultados.atualizados++;
          resultados.porTipo[tipo]++;
        } else {
          const product = await Product.create({
            codigo: codigoLimpo,
            ...dadosProduto
          });
          
          await InventoryMain.create({
            produto_id: product.id,
            quantidade: 0
          });
          
          resultados.criados++;
          resultados.porTipo[tipo]++;
        }
        
        resultados.detalhes.push({ codigo: codigoLimpo, nome, tipo, preco: precoVenda, precoCusto, percentualLucro });
        
      } catch (err) {
        console.error('Erro ao processar linha:', err.message);
        resultados.erros.push({ linha: JSON.stringify(row).substring(0, 100), erro: err.message });
      }
    }

    console.log('Resultado da importação:', JSON.stringify(resultados.porTipo));
    res.json(resultados);
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ error: 'Erro ao importar planilha: ' + error.message });
  }
});

module.exports = router;
