const express = require('express');
const router = express.Router();
const { ServiceOrder, ServiceOrderItem, Customer, Vendor, Product, Store, InventoryStore, PaymentReceivable, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, filterByStore } = require('../middleware/auth');
const { requireAnyPermission, requirePermission } = require('../middleware/permissions');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

router.get('/', requireAnyPermission('os.view', 'os.manage', 'os.approve'), async (req, res) => {
  try {
    const { status, data_inicio, data_fim } = req.query;
    const where = { ...req.storeFilter };

    if (status) where.status = status;
    if (data_inicio && data_fim) {
      where.data_abertura = { [Op.between]: [data_inicio, data_fim] };
    }

    const orders = await ServiceOrder.findAll({
      where,
      include: [
        { model: Customer, as: 'cliente' },
        { model: Vendor, as: 'vendedor' },
        { model: Store, as: 'loja' },
        { model: ServiceOrderItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error('Erro ao listar OS:', error);
    res.status(500).json({ error: 'Erro ao listar ordens de serviço' });
  }
});

router.get('/:id', requireAnyPermission('os.view', 'os.manage', 'os.approve'), async (req, res) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'cliente' },
        { model: Vendor, as: 'vendedor' },
        { model: Store, as: 'loja' },
        { model: ServiceOrderItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro ao buscar ordem de serviço' });
  }
});

router.post('/', requirePermission('os.manage'), async (req, res) => {
  try {
    const { 
      cliente_id, vendedor_id, veiculo_marca, veiculo_modelo, 
      veiculo_placa, veiculo_chassi, problema_relatado, 
      itens, observacoes, data_previsao 
    } = req.body;
    
    const loja_id = req.user.loja_id;
    const numero = `OS-${Date.now()}`;

    let subtotal = 0;
    if (itens) {
      for (const item of itens) {
        subtotal += (item.preco_unitario * item.quantidade) - (item.desconto || 0);
      }
    }

    const order = await ServiceOrder.create({
      numero,
      loja_id,
      cliente_id,
      vendedor_id,
      veiculo_marca,
      veiculo_modelo,
      veiculo_placa,
      veiculo_chassi,
      problema_relatado,
      data_previsao,
      subtotal,
      total: subtotal,
      observacoes
    });

    if (itens) {
      for (const item of itens) {
        await ServiceOrderItem.create({
          os_id: order.id,
          produto_id: item.produto_id,
          descricao: item.descricao,
          tipo: item.tipo || 'SERVICO',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto: item.desconto || 0,
          total: (item.preco_unitario * item.quantidade) - (item.desconto || 0)
        });
      }
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'service_orders',
      registro_id: order.id,
      dados_depois: { numero, total: subtotal }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
  }
});

router.put('/:id', requirePermission('os.manage'), async (req, res) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    const dadosAntes = { status: order.status, total: order.total };

    await order.update(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'service_orders',
      registro_id: order.id,
      dados_antes: dadosAntes,
      dados_depois: { status: order.status, total: order.total }
    });

    res.json(order);
  } catch (error) {
    console.error('Erro ao atualizar OS:', error);
    res.status(500).json({ error: 'Erro ao atualizar ordem de serviço' });
  }
});

router.post('/:id/concluir', requirePermission('os.close'), async (req, res) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id, {
      include: [{ model: ServiceOrderItem, as: 'itens' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    for (const item of order.itens) {
      if (item.produto_id && item.tipo === 'PECA') {
        const estoque = await InventoryStore.findOne({
          where: { produto_id: item.produto_id, loja_id: order.loja_id }
        });
        
        if (estoque) {
          await estoque.update({
            quantidade: Math.max(0, estoque.quantidade - item.quantidade)
          });
        }
      }
    }

    await PaymentReceivable.create({
      loja_id: order.loja_id,
      os_id: order.id,
      cliente_id: order.cliente_id,
      descricao: `OS ${order.numero}`,
      valor: order.total,
      data_vencimento: new Date()
    });

    await order.update({ status: 'CONCLUIDA', data_conclusao: new Date() });

    res.json({ message: 'OS concluída' });
  } catch (error) {
    console.error('Erro ao concluir OS:', error);
    res.status(500).json({ error: 'Erro ao concluir ordem de serviço' });
  }
});

router.delete('/:id', requirePermission('os.manage'), async (req, res) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    await ServiceOrderItem.destroy({ where: { os_id: order.id } });
    await order.destroy();

    res.json({ message: 'OS excluída' });
  } catch (error) {
    console.error('Erro ao excluir OS:', error);
    res.status(500).json({ error: 'Erro ao excluir ordem de serviço' });
  }
});

module.exports = router;
