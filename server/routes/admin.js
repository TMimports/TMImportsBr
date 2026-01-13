const express = require('express');
const router = express.Router();
const { verifyToken, isAdminGlobal, logAccessDenied } = require('../middleware/auth');
const { resetAndSeed, runSeed } = require('../seed');
const { criarSeedRealista, resetarESeed } = require('../seed/seedRealista');
const models = require('../models');

router.use(verifyToken);
router.use(isAdminGlobal);

router.post('/seed/reset', async (req, res) => {

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

router.get('/debug/rbac-test', async (req, res) => {
  try {
    const { User, Role, UserRole, Store } = models;
    const { resolveAuthContext, dashboardAccessRules } = require('../utils/rbacHelper');
    
    const roles = await Role.findAll({ where: { ativo: true }, order: [['ordem', 'ASC']] });
    const users = await User.findAll({
      include: [
        { model: Store, as: 'loja' },
        { model: Role, as: 'roles', through: { attributes: ['principal'] } }
      ],
      limit: 50
    });
    
    const rbacReport = [];
    
    for (const user of users) {
      const authContext = await resolveAuthContext(user.id);
      
      if (authContext) {
        rbacReport.push({
          email: user.email,
          nome: user.nome,
          perfil: user.perfil,
          loja: user.loja?.nome || 'TM Imports (Matriz)',
          roles: authContext.roles,
          dashboardHome: authContext.dashboardHome,
          scope: authContext.scope,
          podeAcessar: {
            global: authContext.canAccessDashboard.global,
            financeiro: authContext.canAccessDashboard.financeiro,
            operacional: authContext.canAccessDashboard.operacional,
            pessoal: authContext.canAccessDashboard.pessoal
          },
          permissionsCount: authContext.permissions.length,
          permissions: authContext.permissions.slice(0, 10)
        });
      }
    }
    
    console.log('=== RBAC DEBUG REPORT ===');
    rbacReport.forEach(r => {
      console.log(`\n[${r.email}]`);
      console.log(`  Roles: ${r.roles.join(', ') || 'nenhuma'}`);
      console.log(`  DashboardHome: ${r.dashboardHome}`);
      console.log(`  Pode acessar: Global=${r.podeAcessar.global}, Financeiro=${r.podeAcessar.financeiro}, Operacional=${r.podeAcessar.operacional}, Pessoal=${r.podeAcessar.pessoal}`);
    });
    console.log('========================');
    
    res.json({
      success: true,
      totalUsers: users.length,
      totalRoles: roles.length,
      rolesDisponiveis: roles.map(r => ({ codigo: r.codigo, nome: r.nome, escopo: r.escopo })),
      dashboardAccessRules: dashboardAccessRules,
      rbacReport: rbacReport
    });
  } catch (error) {
    console.error('Erro no debug RBAC:', error);
    res.status(500).json({ error: 'Erro ao executar teste RBAC: ' + error.message });
  }
});

router.post('/debug/criar-usuarios-teste', async (req, res) => {
  try {
    const { User, Role, UserRole, Store } = models;
    const bcrypt = require('bcryptjs');
    
    const roles = await Role.findAll({ where: { ativo: true } });
    const roleMap = {};
    roles.forEach(r => { roleMap[r.codigo] = r.id; });
    
    const store = await Store.findOne({ where: { codigo: { [require('sequelize').Op.ne]: 'TMI-001' } } });
    
    const senhaHash = await bcrypt.hash('teste123', 10);
    const usuariosTeste = [];
    
    const testUsers = [
      { email: 'teste.admin@tmimports.com', nome: 'Admin Teste', role: 'ADMIN_GLOBAL', loja_id: null },
      { email: 'teste.gestor@tmimports.com', nome: 'Gestor Dashboard Teste', role: 'GESTOR_DASHBOARD', loja_id: null },
      { email: 'teste.financeiro@tmimports.com', nome: 'Financeiro Teste', role: 'FINANCEIRO', loja_id: null },
      { email: 'teste.gerenteop@tmimports.com', nome: 'Gerente OP Teste', role: 'GERENTE_OP', loja_id: null },
      { email: 'teste.vendedor.tmi@tmimports.com', nome: 'Vendedor TMI Teste', role: 'VENDEDOR_TMI', loja_id: null },
      { email: 'teste.franqueado@tecle.com', nome: 'Franqueado Teste', role: 'FRANQUEADO_GESTOR', loja_id: store?.id },
      { email: 'teste.gerente.loja@tecle.com', nome: 'Gerente Loja Teste', role: 'GERENTE_LOJA', loja_id: store?.id },
      { email: 'teste.vendedor.loja@tecle.com', nome: 'Vendedor Loja Teste', role: 'VENDEDOR_LOJA', loja_id: store?.id }
    ];
    
    for (const tu of testUsers) {
      let user = await User.findOne({ where: { email: tu.email } });
      
      if (!user) {
        user = await User.create({
          nome: tu.nome,
          email: tu.email,
          senha: senhaHash,
          perfil: tu.role === 'ADMIN_GLOBAL' ? 'ADMIN_GLOBAL' : 'OPERACIONAL',
          loja_id: tu.loja_id,
          empresa_id: 1,
          ativo: true,
          primeiro_acesso: false
        });
      }
      
      await UserRole.destroy({ where: { user_id: user.id } });
      
      if (roleMap[tu.role]) {
        await UserRole.create({ user_id: user.id, role_id: roleMap[tu.role], principal: true });
      }
      
      usuariosTeste.push({
        email: tu.email,
        senha: 'teste123',
        role: tu.role,
        loja_id: tu.loja_id
      });
    }
    
    res.json({
      success: true,
      message: 'Usuários de teste criados com sucesso',
      usuarios: usuariosTeste
    });
  } catch (error) {
    console.error('Erro ao criar usuários de teste:', error);
    res.status(500).json({ error: 'Erro ao criar usuários: ' + error.message });
  }
});

module.exports = router;
