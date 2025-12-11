const express = require('express');
const router = express.Router();
const { Company, Store, User, AuditLog } = require('../models');
const { verifyToken, isAdminGlobal } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.id = req.user.empresa_id;
    }

    const companies = await Company.findAll({
      where,
      include: [{ model: Store, as: 'lojas' }],
      order: [['nome', 'ASC']]
    });

    res.json(companies);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [{ model: Store, as: 'lojas' }]
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(company);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

router.post('/', isAdminGlobal, async (req, res) => {
  try {
    const { nome, cnpj, tipo, endereco, telefone, email, config } = req.body;

    const company = await Company.create({
      nome,
      cnpj,
      tipo: tipo || 'FRANQUIA',
      endereco,
      telefone,
      email,
      config: config || {}
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'companies',
      registro_id: company.id,
      dados_depois: { nome, cnpj, tipo: company.tipo }
    });

    res.status(201).json(company);
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

router.put('/:id', isAdminGlobal, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const dadosAntes = { nome: company.nome, ativo: company.ativo };

    await company.update(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'companies',
      registro_id: company.id,
      dados_antes: dadosAntes,
      dados_depois: { nome: company.nome, ativo: company.ativo }
    });

    res.json(company);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

router.delete('/:id', isAdminGlobal, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'companies',
      registro_id: company.id,
      dados_antes: { nome: company.nome }
    });

    await company.destroy();
    res.json({ message: 'Empresa excluída' });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

module.exports = router;
