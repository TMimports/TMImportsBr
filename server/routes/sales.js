const express = require('express');
const router = express.Router();
const { Sale, SaleItem, Customer, Vendor, Product, Store, InventoryStore, InventoryMain, PaymentReceivable, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

router.get('/', async (req, res) => {
  try {
    const { status, data_inicio, data_fim, cliente_id } = req.query;
    const where = { ...req.storeFilter };

    if (status) where.status = status;
    if (cliente_id) where.cliente_id = cliente_id;
    if (data_inicio && data_fim) {
      where.data_venda = { [Op.between]: [data_inicio, data_fim] };
    }

    const sales = await Sale.findAll({
      where,
      include: [
        { model: Customer, as: 'cliente' },
        { model: Vendor, as: 'vendedor' },
        { model: Store, as: 'loja' },
        { model: SaleItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(sales);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro ao listar vendas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'cliente' },
        { model: Vendor, as: 'vendedor' },
        { model: Store, as: 'loja' },
        { model: SaleItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { cliente_id, vendedor_id, itens, forma_pagamento, parcelas, observacoes, desconto, status } = req.body;
    
    const loja_id = req.user.loja_id;
    const numero = `VND-${Date.now()}`;

    let subtotal = 0;
    for (const item of itens) {
      subtotal += (item.preco_unitario * item.quantidade) - (item.desconto || 0);
    }

    const total = subtotal - (desconto || 0);
    const validade_orcamento = status === 'ORCAMENTO' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

    const sale = await Sale.create({
      numero,
      loja_id,
      cliente_id,
      vendedor_id: vendedor_id || req.user.Vendor?.id,
      status: status || 'PENDENTE',
      subtotal,
      desconto: desconto || 0,
      total,
      forma_pagamento,
      parcelas: parcelas || 1,
      observacoes,
      validade_orcamento
    });

    for (const item of itens) {
      await SaleItem.create({
        venda_id: sale.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto: item.desconto || 0,
        total: (item.preco_unitario * item.quantidade) - (item.desconto || 0)
      });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'sales',
      registro_id: sale.id,
      dados_depois: { numero, total, status: sale.status }
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const dadosAntes = { status: sale.status, total: sale.total };

    await sale.update(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'sales',
      registro_id: sale.id,
      dados_antes: dadosAntes,
      dados_depois: { status: sale.status, total: sale.total }
    });

    res.json(sale);
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

router.post('/:id/aprovar', isGestorOuAdmin, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: 'itens' }]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    await sale.update({ status: 'APROVADA' });

    res.json({ message: 'Venda aprovada' });
  } catch (error) {
    console.error('Erro ao aprovar venda:', error);
    res.status(500).json({ error: 'Erro ao aprovar venda' });
  }
});

router.post('/:id/concluir', isGestorOuAdmin, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, as: 'itens' }]
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    for (const item of sale.itens) {
      const estoque = await InventoryStore.findOne({
        where: { produto_id: item.produto_id, loja_id: sale.loja_id }
      });
      
      if (estoque) {
        await estoque.update({
          quantidade: Math.max(0, estoque.quantidade - item.quantidade)
        });
      }
    }

    const valorParcela = sale.total / (sale.parcelas || 1);
    for (let i = 0; i < (sale.parcelas || 1); i++) {
      const vencimento = new Date();
      vencimento.setMonth(vencimento.getMonth() + i);

      await PaymentReceivable.create({
        loja_id: sale.loja_id,
        venda_id: sale.id,
        cliente_id: sale.cliente_id,
        descricao: `Venda ${sale.numero} - Parcela ${i + 1}/${sale.parcelas || 1}`,
        valor: valorParcela,
        data_vencimento: vencimento,
        parcela: i + 1,
        total_parcelas: sale.parcelas || 1,
        forma_pagamento: sale.forma_pagamento
      });
    }

    await sale.update({ status: 'CONCLUIDA' });

    res.json({ message: 'Venda concluída' });
  } catch (error) {
    console.error('Erro ao concluir venda:', error);
    res.status(500).json({ error: 'Erro ao concluir venda' });
  }
});

router.post('/:id/cancelar', isGestorOuAdmin, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    await sale.update({ status: 'CANCELADA' });
    res.json({ message: 'Venda cancelada' });
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ error: 'Erro ao cancelar venda' });
  }
});

router.delete('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (sale.status === 'CONCLUIDA') {
      return res.status(400).json({ error: 'Não é possível excluir venda concluída' });
    }

    await SaleItem.destroy({ where: { venda_id: sale.id } });
    await sale.destroy();

    res.json({ message: 'Venda excluída' });
  } catch (error) {
    console.error('Erro ao excluir venda:', error);
    res.status(500).json({ error: 'Erro ao excluir venda' });
  }
});

module.exports = router;
