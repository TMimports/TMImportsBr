const express = require('express');
const router = express.Router();
const { Invoice, InvoiceItem, InvoiceEvent, FiscalData, Sale, SaleItem, ServiceOrder, Customer, Product, Store, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, isAdminGlobal, filterByStore, hasFiscalAccess } = require('../middleware/auth');

router.use(verifyToken);
router.use(hasFiscalAccess);

router.get('/fiscal-data', async (req, res) => {
  try {
    const where = req.user.perfil === 'ADMIN_GLOBAL' ? {} : { loja_id: req.user.loja_id };
    const fiscalData = await FiscalData.findOne({ where });
    res.json(fiscalData || {});
  } catch (error) {
    console.error('Erro ao buscar dados fiscais:', error);
    res.status(500).json({ error: 'Erro ao buscar dados fiscais' });
  }
});

router.post('/fiscal-data', isGestorOuAdmin, async (req, res) => {
  try {
    const data = req.body;
    const where = req.user.perfil === 'ADMIN_GLOBAL' 
      ? { empresa_id: data.empresa_id || 1 } 
      : { loja_id: req.user.loja_id };
    
    let fiscalData = await FiscalData.findOne({ where });
    
    if (fiscalData) {
      await fiscalData.update(data);
    } else {
      data.loja_id = req.user.loja_id;
      data.empresa_id = req.user.empresa_id || 1;
      fiscalData = await FiscalData.create(data);
    }
    
    await AuditLog.create({
      user_id: req.user.id,
      acao: fiscalData ? 'UPDATE' : 'CREATE',
      tabela: 'fiscal_data',
      registro_id: fiscalData.id,
      dados_depois: data
    });
    
    res.json(fiscalData);
  } catch (error) {
    console.error('Erro ao salvar dados fiscais:', error);
    res.status(500).json({ error: 'Erro ao salvar dados fiscais' });
  }
});

router.get('/', filterByStore, async (req, res) => {
  try {
    const { status, tipo, data_inicio, data_fim } = req.query;
    const where = req.user.perfil === 'ADMIN_GLOBAL' ? {} : req.storeFilter;
    
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    
    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Store, as: 'loja' },
        { model: Customer, as: 'cliente' },
        { model: Sale, as: 'venda' },
        { model: InvoiceItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    
    res.json(invoices);
  } catch (error) {
    console.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({ error: 'Erro ao listar notas fiscais' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Store, as: 'loja' },
        { model: Customer, as: 'cliente' },
        { model: Sale, as: 'venda' },
        { model: InvoiceItem, as: 'itens', include: [{ model: Product, as: 'produto' }] },
        { model: InvoiceEvent, as: 'eventos' }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    if (req.user.perfil !== 'ADMIN_GLOBAL' && invoice.loja_id !== req.user.loja_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Erro ao buscar nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao buscar nota fiscal' });
  }
});

router.post('/', isGestorOuAdmin, async (req, res) => {
  try {
    const { venda_id, os_id, tipo, itens, ...data } = req.body;
    
    const fiscalData = await FiscalData.findOne({
      where: { loja_id: req.user.loja_id }
    });
    
    if (!fiscalData) {
      return res.status(400).json({ error: 'Dados fiscais não configurados. Configure primeiro em Configurações Fiscais.' });
    }
    
    let numero = tipo === 'NFCE' ? fiscalData.numero_nfce_atual + 1 : fiscalData.numero_nfe_atual + 1;
    let serie = tipo === 'NFCE' ? fiscalData.serie_nfce : fiscalData.serie_nfe;
    
    if (tipo === 'NFCE') {
      await fiscalData.update({ numero_nfce_atual: numero });
    } else {
      await fiscalData.update({ numero_nfe_atual: numero });
    }
    
    const invoice = await Invoice.create({
      ...data,
      venda_id,
      os_id,
      tipo,
      numero,
      serie,
      loja_id: req.user.loja_id,
      user_id: req.user.id,
      status: 'RASCUNHO'
    });
    
    if (itens && itens.length > 0) {
      for (let i = 0; i < itens.length; i++) {
        await InvoiceItem.create({
          ...itens[i],
          invoice_id: invoice.id,
          numero_item: i + 1
        });
      }
    }
    
    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'invoices',
      registro_id: invoice.id,
      dados_depois: { numero, tipo }
    });
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao criar nota fiscal' });
  }
});

router.post('/from-sale/:vendaId', isGestorOuAdmin, async (req, res) => {
  try {
    const { vendaId } = req.params;
    const { tipo = 'NFE' } = req.body;
    
    const sale = await Sale.findByPk(vendaId, {
      include: [
        { model: Customer, as: 'cliente' },
        { model: SaleItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    if (sale.status !== 'CONCLUIDA') {
      return res.status(400).json({ error: 'Apenas vendas concluídas podem gerar nota fiscal' });
    }
    
    const existingInvoice = await Invoice.findOne({
      where: { venda_id: vendaId, status: ['AUTORIZADA', 'PROCESSANDO'] }
    });
    
    if (existingInvoice) {
      return res.status(400).json({ error: 'Esta venda já possui uma nota fiscal emitida' });
    }
    
    const fiscalData = await FiscalData.findOne({
      where: { loja_id: sale.loja_id }
    });
    
    if (!fiscalData) {
      return res.status(400).json({ error: 'Dados fiscais não configurados' });
    }
    
    let numero = tipo === 'NFCE' ? fiscalData.numero_nfce_atual + 1 : fiscalData.numero_nfe_atual + 1;
    let serie = tipo === 'NFCE' ? fiscalData.serie_nfce : fiscalData.serie_nfe;
    
    if (tipo === 'NFCE') {
      await fiscalData.update({ numero_nfce_atual: numero });
    } else {
      await fiscalData.update({ numero_nfe_atual: numero });
    }
    
    const invoice = await Invoice.create({
      loja_id: sale.loja_id,
      venda_id: sale.id,
      cliente_id: sale.cliente_id,
      tipo,
      numero,
      serie,
      natureza_operacao: 'Venda de Mercadoria',
      destinatario_nome: sale.cliente?.nome,
      destinatario_cpf_cnpj: sale.cliente?.cpf_cnpj,
      destinatario_email: sale.cliente?.email,
      destinatario_endereco: sale.cliente?.endereco,
      destinatario_cidade: sale.cliente?.cidade,
      destinatario_uf: sale.cliente?.estado,
      destinatario_cep: sale.cliente?.cep,
      destinatario_telefone: sale.cliente?.telefone,
      valor_produtos: sale.subtotal,
      valor_desconto: sale.desconto,
      valor_total: sale.total,
      forma_pagamento: sale.forma_pagamento,
      user_id: req.user.id,
      status: 'RASCUNHO'
    });
    
    for (let i = 0; i < sale.itens.length; i++) {
      const item = sale.itens[i];
      await InvoiceItem.create({
        invoice_id: invoice.id,
        produto_id: item.produto_id,
        numero_item: i + 1,
        codigo: item.produto?.codigo,
        descricao: item.produto?.nome,
        ncm: '00000000',
        cfop: '5102',
        unidade: 'UN',
        quantidade: item.quantidade,
        valor_unitario: item.preco_unitario,
        valor_total: item.total,
        valor_desconto: item.desconto || 0,
        cst_icms: '102',
        cst_pis: '49',
        cst_cofins: '49',
        origem: '0'
      });
    }
    
    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'invoices',
      registro_id: invoice.id,
      dados_depois: { venda_id: vendaId, numero, tipo }
    });
    
    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'cliente' },
        { model: InvoiceItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ]
    });
    
    res.status(201).json(fullInvoice);
  } catch (error) {
    console.error('Erro ao criar nota fiscal da venda:', error);
    res.status(500).json({ error: 'Erro ao criar nota fiscal' });
  }
});

router.post('/:id/emitir', isGestorOuAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: InvoiceItem, as: 'itens' }]
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    const fiscalData = await FiscalData.findOne({
      where: { loja_id: invoice.loja_id }
    });
    
    if (!fiscalData || fiscalData.api_provider === 'MANUAL') {
      await invoice.update({
        status: 'AUTORIZADA',
        data_emissao: new Date(),
        protocolo: 'MANUAL-' + Date.now(),
        chave_acesso: 'MANUAL' + Date.now().toString().padStart(44, '0')
      });
      
      if (invoice.tipo === 'NFCE') {
        await fiscalData.update({ numero_nfce_atual: invoice.numero });
      } else {
        await fiscalData.update({ numero_nfe_atual: invoice.numero });
      }
      
      await InvoiceEvent.create({
        invoice_id: invoice.id,
        tipo: 'EMISSAO',
        status: 'AUTORIZADA',
        descricao: 'Nota emitida manualmente (sem integração com API)',
        data_evento: new Date(),
        user_id: req.user.id
      });
      
      return res.json({ 
        message: 'Nota marcada como emitida (modo manual)',
        invoice 
      });
    }
    
    await invoice.update({ status: 'PROCESSANDO' });
    
    res.json({ 
      message: 'Para emissão real, configure a integração com uma API de NF-e (Focus NFe, PlugNotas, etc)',
      invoice 
    });
    
  } catch (error) {
    console.error('Erro ao emitir nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao emitir nota fiscal' });
  }
});

router.post('/:id/cancelar', isGestorOuAdmin, async (req, res) => {
  try {
    const { motivo } = req.body;
    
    if (!motivo || motivo.length < 15) {
      return res.status(400).json({ error: 'Motivo do cancelamento deve ter no mínimo 15 caracteres' });
    }
    
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    if (invoice.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'Apenas notas autorizadas podem ser canceladas' });
    }
    
    await invoice.update({
      status: 'CANCELADA',
      data_cancelamento: new Date(),
      motivo_cancelamento: motivo
    });
    
    await InvoiceEvent.create({
      invoice_id: invoice.id,
      tipo: 'CANCELAMENTO',
      status: 'CANCELADA',
      descricao: motivo,
      data_evento: new Date(),
      user_id: req.user.id
    });
    
    res.json({ message: 'Nota fiscal cancelada', invoice });
  } catch (error) {
    console.error('Erro ao cancelar nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao cancelar nota fiscal' });
  }
});

router.post('/:id/carta-correcao', isGestorOuAdmin, async (req, res) => {
  try {
    const { correcao } = req.body;
    
    if (!correcao || correcao.length < 15) {
      return res.status(400).json({ error: 'Correção deve ter no mínimo 15 caracteres' });
    }
    
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    if (invoice.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'Apenas notas autorizadas podem receber carta de correção' });
    }
    
    const lastEvent = await InvoiceEvent.findOne({
      where: { invoice_id: invoice.id, tipo: 'CARTA_CORRECAO' },
      order: [['sequencia', 'DESC']]
    });
    
    const sequencia = lastEvent ? lastEvent.sequencia + 1 : 1;
    
    await InvoiceEvent.create({
      invoice_id: invoice.id,
      tipo: 'CARTA_CORRECAO',
      sequencia,
      status: 'REGISTRADA',
      descricao: correcao,
      data_evento: new Date(),
      user_id: req.user.id
    });
    
    res.json({ message: 'Carta de correção registrada', sequencia });
  } catch (error) {
    console.error('Erro ao registrar carta de correção:', error);
    res.status(500).json({ error: 'Erro ao registrar carta de correção' });
  }
});

router.delete('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    if (invoice.status !== 'RASCUNHO') {
      return res.status(400).json({ error: 'Apenas rascunhos podem ser excluídos' });
    }
    
    await InvoiceItem.destroy({ where: { invoice_id: invoice.id } });
    await InvoiceEvent.destroy({ where: { invoice_id: invoice.id } });
    await invoice.destroy();
    
    res.json({ message: 'Nota fiscal excluída' });
  } catch (error) {
    console.error('Erro ao excluir nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao excluir nota fiscal' });
  }
});

router.get('/dashboard/stats', filterByStore, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const where = req.user.perfil === 'ADMIN_GLOBAL' ? {} : req.storeFilter;
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const [totalEmitidas, totalCanceladas, totalMes, valorMes] = await Promise.all([
      Invoice.count({ where: { ...where, status: 'AUTORIZADA' } }),
      Invoice.count({ where: { ...where, status: 'CANCELADA' } }),
      Invoice.count({ 
        where: { 
          ...where, 
          status: 'AUTORIZADA',
          data_emissao: { [Op.gte]: inicioMes }
        } 
      }),
      Invoice.sum('valor_total', { 
        where: { 
          ...where, 
          status: 'AUTORIZADA',
          data_emissao: { [Op.gte]: inicioMes }
        } 
      })
    ]);
    
    res.json({
      totalEmitidas,
      totalCanceladas,
      totalMes,
      valorMes: valorMes || 0
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
