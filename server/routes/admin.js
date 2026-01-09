const express = require('express');
const router = express.Router();
const { verifyToken, isAdminGlobal } = require('../middleware/auth');
const { resetAndSeed, runSeed } = require('../seed');
const models = require('../models');

router.use(verifyToken);
router.use(isAdminGlobal);

router.post('/seed/reset', async (req, res) => {
  try {
    console.log('Admin requested database reset and reseed...');
    
    await resetAndSeed(models);
    
    res.json({ 
      success: true, 
      message: 'Banco de dados resetado e seed executado. Reinicie o servidor para aplicar as alterações.' 
    });
  } catch (error) {
    console.error('Erro ao resetar seed:', error);
    res.status(500).json({ error: 'Erro ao resetar banco de dados' });
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
