const express = require('express');
const router = express.Router();
const { Customer, Store, AuditLog } = require('../models');
const { verifyToken, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

router.get('/', async (req, res) => {
  try {
    const { busca } = req.query;
    const where = { ...req.storeFilter };

    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { cpf_cnpj: { [Op.iLike]: `%${busca}%` } },
        { email: { [Op.iLike]: `%${busca}%` } }
      ];
    }

    const customers = await Customer.findAll({
      where,
      include: [{ model: Store, as: 'loja' }],
      order: [['nome', 'ASC']]
    });

    res.json(customers);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      loja_id: req.user.loja_id
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'customers',
      registro_id: customer.id,
      dados_depois: { nome: customer.nome }
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await customer.update(req.body);
    res.json(customer);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await customer.destroy();
    res.json({ message: 'Cliente excluído' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

module.exports = router;
