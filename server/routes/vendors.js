const express = require('express');
const router = express.Router();
const { Vendor, User, Store, Sale, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.findAll({
      where: req.storeFilter,
      include: [
        { model: Store, as: 'loja' },
        { model: User, as: 'usuario' }
      ],
      order: [['nome', 'ASC']]
    });

    res.json(vendors);
  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id, {
      include: [{ model: Store, as: 'loja' }]
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    res.status(500).json({ error: 'Erro ao buscar vendedor' });
  }
});

router.post('/', isGestorOuAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.create({
      ...req.body,
      loja_id: req.body.loja_id || req.user.loja_id
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'vendors',
      registro_id: vendor.id,
      dados_depois: { nome: vendor.nome }
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Erro ao criar vendedor:', error);
    res.status(500).json({ error: 'Erro ao criar vendedor' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    await vendor.update(req.body);
    res.json(vendor);
  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    res.status(500).json({ error: 'Erro ao atualizar vendedor' });
  }
});

router.delete('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    await vendor.destroy();
    res.json({ message: 'Vendedor excluído' });
  } catch (error) {
    console.error('Erro ao excluir vendedor:', error);
    res.status(500).json({ error: 'Erro ao excluir vendedor' });
  }
});

router.get('/:id/vendas', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const where = { vendedor_id: req.params.id };

    if (data_inicio && data_fim) {
      where.data_venda = { [Op.between]: [data_inicio, data_fim] };
    }

    const vendas = await Sale.findAll({
      where,
      order: [['data_venda', 'DESC']]
    });

    const totalVendas = vendas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);

    res.json({ vendas, totalVendas });
  } catch (error) {
    console.error('Erro ao buscar vendas do vendedor:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

module.exports = router;
