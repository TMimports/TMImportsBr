const express = require('express');
const router = express.Router();
const { verifyToken, isAdminGlobal, logAccessDenied } = require('../middleware/auth');
const { resetAndSeed, runSeed } = require('../seed');
const { criarSeedRealista, resetarESeed } = require('../seed/seedRealista');
const models = require('../models');

router.use(verifyToken);

router.post('/seed/reset', async (req, res) => {
  if (!isAdminGlobal(req.user)) {
    logAccessDenied(req, 'seed_reset');
    return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN_GLOBAL pode resetar o seed.' });
  }

  try {
    console.log('Admin solicitou reset e recriação do seed realista...');
    
    const { sequelize } = models;
    const resultado = await resetarESeed(models, sequelize);
    
    await models.AuditLog.create({
      user_id: req.user.id,
      acao: 'SEED_RESET',
      entidade: 'SISTEMA',
      entidade_id: null,
      detalhes: JSON.stringify(resultado),
      ip: req.ip
    });
    
    res.json({ 
      success: true, 
      message: 'Seed realista resetado e recriado com sucesso!',
      dados: resultado
    });
  } catch (error) {
    console.error('Erro ao resetar seed:', error);
    res.status(500).json({ error: 'Erro ao resetar banco de dados: ' + error.message });
  }
});

router.post('/seed/criar-realista', async (req, res) => {
  if (!isAdminGlobal(req.user)) {
    logAccessDenied(req, 'seed_criar_realista');
    return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN_GLOBAL pode criar seed.' });
  }

  try {
    console.log('Admin solicitou criação do seed realista...');
    
    const { sequelize } = models;
    const resultado = await criarSeedRealista(models, sequelize);
    
    await models.AuditLog.create({
      user_id: req.user.id,
      acao: 'SEED_CRIAR_REALISTA',
      entidade: 'SISTEMA',
      entidade_id: null,
      detalhes: JSON.stringify(resultado),
      ip: req.ip
    });
    
    res.json({ 
      success: true, 
      message: 'Seed realista criado com sucesso!',
      dados: resultado
    });
  } catch (error) {
    console.error('Erro ao criar seed:', error);
    res.status(500).json({ error: 'Erro ao criar seed: ' + error.message });
  }
});

router.post('/seed/ranking-demo', async (req, res) => {
  try {
    const { Store, Customer, Product, Sale, SaleItem, ServiceOrder, InventoryStore } = models;
    const { Op } = require('sequelize');
    
    const stores = await Store.findAll({ where: { codigo: { [Op.ne]: 'TMI-001' } } });
    const products = await Product.findAll({ limit: 20 });
    
    if (stores.length === 0 || products.length === 0) {
      return res.status(400).json({ error: 'Primeiro execute o seed completo' });
    }
    
    const vendasCriadas = [];
    const osCriadas = [];
    
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      
      let customer = await Customer.findOne({ where: { loja_id: store.id } });
      if (!customer) {
        customer = await Customer.create({
          nome: `Cliente Demo ${store.nome}`,
          email: `demo${store.id}@teste.com`,
          telefone: '11999999999',
          cpf_cnpj: `${String(10000000000 + store.id * 1000).padStart(11, '0')}`,
          loja_id: store.id
        });
      }
      
      const numVendas = Math.floor(Math.random() * 8) + 2;
      for (let v = 0; v < numVendas; v++) {
        const dataVenda = new Date();
        dataVenda.setDate(dataVenda.getDate() - Math.floor(Math.random() * 25));
        
        const produto = products[Math.floor(Math.random() * products.length)];
        const qtd = Math.floor(Math.random() * 3) + 1;
        const valorTotal = (produto.preco_venda || 1000) * qtd;
        
        const venda = await Sale.create({
          loja_id: store.id,
          cliente_id: customer.id,
          data_venda: dataVenda,
          valor_total: valorTotal,
          status: 'CONCLUIDA',
          forma_pagamento: ['PIX', 'CARTAO', 'BOLETO'][Math.floor(Math.random() * 3)]
        });
        
        await SaleItem.create({
          venda_id: venda.id,
          produto_id: produto.id,
          quantidade: qtd,
          preco_unitario: produto.preco_venda || 1000,
          subtotal: valorTotal
        });
        
        vendasCriadas.push(venda.id);
      }
      
      const numOS = Math.floor(Math.random() * 5) + 1;
      for (let o = 0; o < numOS; o++) {
        const dataOS = new Date();
        dataOS.setDate(dataOS.getDate() - Math.floor(Math.random() * 20));
        const valorOS = Math.floor(Math.random() * 500) + 100;
        
        const os = await ServiceOrder.create({
          loja_id: store.id,
          cliente_id: customer.id,
          descricao: `Manutenção preventiva #${o + 1}`,
          valor_total: valorOS,
          status: Math.random() > 0.3 ? 'CONCLUIDA' : 'ABERTA',
          createdAt: dataOS
        });
        
        osCriadas.push(os.id);
      }
      
      const estoques = await InventoryStore.findAll({ where: { loja_id: store.id } });
      if (estoques.length > 0) {
        const qtdBaixo = Math.floor(Math.random() * 3);
        const qtdSem = Math.floor(Math.random() * 2);
        
        for (let e = 0; e < Math.min(qtdBaixo, estoques.length); e++) {
          await estoques[e].update({ quantidade: Math.floor(Math.random() * 2) + 1 });
        }
        for (let e = qtdBaixo; e < Math.min(qtdBaixo + qtdSem, estoques.length); e++) {
          await estoques[e].update({ quantidade: 0 });
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Dados de ranking criados com sucesso',
      vendas_criadas: vendasCriadas.length,
      os_criadas: osCriadas.length,
      lojas_afetadas: stores.length
    });
  } catch (error) {
    console.error('Erro ao criar dados de ranking:', error);
    res.status(500).json({ error: 'Erro ao criar dados: ' + error.message });
  }
});

router.post('/limpar-dados', async (req, res) => {
  try {
    console.log('Admin solicitou limpeza de dados do sistema...');
    
    const { 
      Sale, SaleItem, ServiceOrder, ServiceOrderItem, 
      Customer, PaymentReceivable, PaymentPayable, 
      PurchaseRequest, PurchaseRequestItem, AuditLog,
      InventoryMovement, BankTransaction, Invoice, InvoiceItem, InvoiceEvent,
      InventoryMain, InventoryStore, Notification
    } = models;
    
    await InvoiceEvent.destroy({ where: {}, truncate: true, cascade: true });
    await InvoiceItem.destroy({ where: {}, truncate: true, cascade: true });
    await Invoice.destroy({ where: {}, truncate: true, cascade: true });
    
    await BankTransaction.destroy({ where: {}, truncate: true, cascade: true });
    
    await SaleItem.destroy({ where: {}, truncate: true, cascade: true });
    await Sale.destroy({ where: {}, truncate: true, cascade: true });
    
    if (ServiceOrderItem) {
      await ServiceOrderItem.destroy({ where: {}, truncate: true, cascade: true });
    }
    await ServiceOrder.destroy({ where: {}, truncate: true, cascade: true });
    
    await PaymentReceivable.destroy({ where: {}, truncate: true, cascade: true });
    await PaymentPayable.destroy({ where: {}, truncate: true, cascade: true });
    
    await PurchaseRequestItem.destroy({ where: {}, truncate: true, cascade: true });
    await PurchaseRequest.destroy({ where: {}, truncate: true, cascade: true });
    
    await Customer.destroy({ where: {}, truncate: true, cascade: true });
    
    await InventoryMovement.destroy({ where: {}, truncate: true, cascade: true });
    
    if (Notification) {
      await Notification.destroy({ where: {}, truncate: true, cascade: true });
    }
    
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true });
    
    console.log('Dados transacionais limpos com sucesso');
    
    res.json({
      success: true,
      message: 'Todos os dados transacionais foram limpos. O sistema está pronto para uso.',
      dados_removidos: [
        'Vendas e itens de venda',
        'Ordens de serviço',
        'Clientes',
        'Contas a receber e pagar',
        'Solicitações de compra',
        'Movimentações de estoque',
        'Transações bancárias',
        'Notas fiscais',
        'Notificações',
        'Logs de auditoria'
      ],
      dados_mantidos: [
        'Usuários e perfis',
        'Empresas e lojas',
        'Produtos e categorias',
        'Vendedores',
        'Estoque (quantidades mantidas)',
        'Configurações do sistema',
        'Contas bancárias'
      ]
    });
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    res.status(500).json({ error: 'Erro ao limpar dados: ' + error.message });
  }
});

router.get('/seed/status', async (req, res) => {
  try {
    const { Store, Customer, Sale, ServiceOrder, PaymentReceivable, PaymentPayable, PurchaseRequest } = models;
    
    const [stores, customers, sales, os, receber, pagar, pedidos] = await Promise.all([
      Store.count(),
      Customer.count(),
      Sale.count(),
      ServiceOrder.count(),
      PaymentReceivable.count(),
      PaymentPayable.count(),
      PurchaseRequest.count()
    ]);
    
    res.json({
      lojas: stores,
      clientes: customers,
      vendas: sales,
      ordens_servico: os,
      contas_receber: receber,
      contas_pagar: pagar,
      pedidos: pedidos,
      seed_aplicado: stores >= 10
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

module.exports = router;
