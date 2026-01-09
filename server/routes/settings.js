const express = require('express');
const router = express.Router();
const { Setting, Role } = require('../models');
const { verifyToken, isAdminGlobal } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { empresa_id: null }
    });
    
    const config = {};
    settings.forEach(s => {
      if (s.tipo === 'json') {
        try {
          config[s.chave] = JSON.parse(s.valor);
        } catch {
          config[s.chave] = s.valor;
        }
      } else if (s.tipo === 'number') {
        config[s.chave] = parseFloat(s.valor);
      } else if (s.tipo === 'boolean') {
        config[s.chave] = s.valor === 'true';
      } else {
        config[s.chave] = s.valor;
      }
    });
    
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC']]
    });
    res.json(roles);
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
    res.status(500).json({ error: 'Erro ao buscar roles' });
  }
});

router.put('/', isAdminGlobal, async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [chave, valor] of Object.entries(updates)) {
      const setting = await Setting.findOne({ where: { chave, empresa_id: null } });
      
      if (setting) {
        let valorStr = valor;
        if (typeof valor === 'object') {
          valorStr = JSON.stringify(valor);
        } else {
          valorStr = String(valor);
        }
        await setting.update({ valor: valorStr });
      } else {
        let tipo = 'string';
        if (typeof valor === 'number') tipo = 'number';
        else if (typeof valor === 'boolean') tipo = 'boolean';
        else if (typeof valor === 'object') tipo = 'json';
        
        await Setting.create({
          chave,
          valor: typeof valor === 'object' ? JSON.stringify(valor) : String(valor),
          tipo
        });
      }
    }
    
    res.json({ message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

router.get('/taxas-cartao', async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { chave: 'taxas_cartao', empresa_id: null } });
    if (setting) {
      res.json(JSON.parse(setting.valor));
    } else {
      res.json({1:0,2:3.5,3:4.5,4:5.5,5:6.5,6:7.5,7:8.5,8:9.5,9:10.5,10:11.5,11:12.5,12:13.5,13:14.5,14:15.5,15:16.5,16:17.5,17:18.5,18:19.5,19:20.5,20:21.5,21:22.5});
    }
  } catch (error) {
    console.error('Erro ao buscar taxas de cartão:', error);
    res.status(500).json({ error: 'Erro ao buscar taxas de cartão' });
  }
});

router.get('/servicos-catalogo', async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { chave: 'servicos_catalogo', empresa_id: null } });
    if (setting) {
      res.json(JSON.parse(setting.valor));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Erro ao buscar catálogo de serviços:', error);
    res.status(500).json({ error: 'Erro ao buscar catálogo de serviços' });
  }
});

router.post('/validar-venda', async (req, res) => {
  try {
    const { itens, forma_pagamento, parcelas, desconto_total } = req.body;
    const settings = await Setting.findAll({ where: { empresa_id: null } });
    
    const config = {};
    settings.forEach(s => {
      if (s.tipo === 'json') {
        try { config[s.chave] = JSON.parse(s.valor); } catch { config[s.chave] = s.valor; }
      } else if (s.tipo === 'number') {
        config[s.chave] = parseFloat(s.valor);
      } else {
        config[s.chave] = s.valor;
      }
    });
    
    const erros = [];
    let subtotal_produtos = 0;
    let subtotal_servicos = 0;
    let desconto_produtos = 0;
    let desconto_servicos = 0;
    let taxa_cartao = 0;
    
    for (const item of itens) {
      const valor_item = item.preco_unitario * item.quantidade;
      const desconto_item = item.desconto || 0;
      const pct_desconto = (desconto_item / valor_item) * 100;
      
      if (item.tipo === 'MOTO') {
        subtotal_produtos += valor_item;
        desconto_produtos += desconto_item;
        if (pct_desconto > (config.desconto_max_moto || 3.5)) {
          erros.push(`Desconto máximo para motos é ${config.desconto_max_moto || 3.5}%`);
        }
        if (parcelas > (config.parcelas_max_moto || 21)) {
          erros.push(`Máximo de ${config.parcelas_max_moto || 21} parcelas para motos`);
        }
      } else if (item.tipo === 'PECA') {
        subtotal_produtos += valor_item;
        desconto_produtos += desconto_item;
        if (pct_desconto > (config.desconto_max_peca || 10)) {
          erros.push(`Desconto máximo para peças é ${config.desconto_max_peca || 10}%`);
        }
        if (parcelas > (config.parcelas_max_peca || 10)) {
          erros.push(`Máximo de ${config.parcelas_max_peca || 10} parcelas para peças`);
        }
      } else if (item.tipo === 'SERVICO') {
        subtotal_servicos += valor_item;
        desconto_servicos += desconto_item;
        if (pct_desconto > (config.desconto_max_servico || 10)) {
          erros.push(`Desconto máximo para serviços é ${config.desconto_max_servico || 10}%`);
        }
      }
    }
    
    if (forma_pagamento === 'CARTAO_CREDITO' && parcelas > 1 && config.taxas_cartao) {
      taxa_cartao = config.taxas_cartao[parcelas] || 0;
    } else if (forma_pagamento === 'CARTAO_DEBITO') {
      taxa_cartao = config.taxa_debito || 1;
    }
    
    if ((desconto_produtos > 0 || desconto_servicos > 0) && 
        !['DINHEIRO', 'PIX'].includes(forma_pagamento)) {
      erros.push('Descontos só são permitidos para pagamentos à vista (Dinheiro ou PIX)');
    }
    
    const valor_produtos_com_taxa = (subtotal_produtos - desconto_produtos) * (1 + taxa_cartao / 100);
    const valor_servicos = subtotal_servicos - desconto_servicos;
    const total_final = valor_produtos_com_taxa + valor_servicos;
    
    res.json({
      valido: erros.length === 0,
      erros,
      calculo: {
        subtotal_produtos,
        subtotal_servicos,
        desconto_produtos,
        desconto_servicos,
        taxa_cartao_pct: taxa_cartao,
        taxa_cartao_valor: (subtotal_produtos - desconto_produtos) * (taxa_cartao / 100),
        total_final: Math.round(total_final * 100) / 100
      }
    });
  } catch (error) {
    console.error('Erro ao validar venda:', error);
    res.status(500).json({ error: 'Erro ao validar venda' });
  }
});

module.exports = router;
