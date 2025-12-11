const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models');
const { verifyToken, isAdminGlobal } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(isAdminGlobal);

router.get('/', async (req, res) => {
  try {
    const { tabela, acao, user_id, data_inicio, data_fim, limit = 100 } = req.query;
    const where = {};

    if (tabela) where.tabela = tabela;
    if (acao) where.acao = acao;
    if (user_id) where.user_id = user_id;
    if (data_inicio && data_fim) {
      where.createdAt = { [Op.between]: [data_inicio, data_fim] };
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'usuario', attributes: ['id', 'nome', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(logs);
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro ao listar logs de auditoria' });
  }
});

router.get('/tabelas', async (req, res) => {
  try {
    const tabelas = await AuditLog.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('tabela')), 'tabela']],
      raw: true
    });

    res.json(tabelas.map(t => t.tabela));
  } catch (error) {
    console.error('Erro ao listar tabelas:', error);
    res.status(500).json({ error: 'Erro ao listar tabelas' });
  }
});

router.get('/acoes', async (req, res) => {
  res.json(['CREATE', 'UPDATE', 'DELETE', 'DELETE_ALL', 'BAIXA', 'IMPORT', 'RECONCILE']);
});

module.exports = router;
