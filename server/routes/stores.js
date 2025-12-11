const express = require('express');
const router = express.Router();
const { Store, Company, User, AuditLog, InventoryStore } = require('../models');
const { verifyToken, isAdminGlobal, isGestorOuAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.id = req.user.loja_id;
    }

    const stores = await Store.findAll({
      where,
      include: [{ model: Company, as: 'empresa' }],
      order: [['nome', 'ASC']]
    });

    res.json(stores);
  } catch (error) {
    console.error('Erro ao listar lojas:', error);
    res.status(500).json({ error: 'Erro ao listar lojas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id, {
      include: [{ model: Company, as: 'empresa' }]
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    res.json(store);
  } catch (error) {
    console.error('Erro ao buscar loja:', error);
    res.status(500).json({ error: 'Erro ao buscar loja' });
  }
});

router.post('/', isAdminGlobal, async (req, res) => {
  try {
    const { nome, codigo, empresa_id, endereco, cidade, estado, telefone, email, margem_padrao } = req.body;

    const store = await Store.create({
      nome,
      codigo,
      empresa_id,
      endereco,
      cidade,
      estado,
      telefone,
      email,
      margem_padrao: margem_padrao || 30
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'stores',
      registro_id: store.id,
      dados_depois: { nome, codigo, empresa_id }
    });

    res.status(201).json(store);
  } catch (error) {
    console.error('Erro ao criar loja:', error);
    res.status(500).json({ error: 'Erro ao criar loja' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    if (req.user.perfil !== 'ADMIN_GLOBAL' && store.id !== req.user.loja_id) {
      return res.status(403).json({ error: 'Sem permissão para editar esta loja' });
    }

    const dadosAntes = { nome: store.nome, ativo: store.ativo };

    await store.update(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'stores',
      registro_id: store.id,
      dados_antes: dadosAntes,
      dados_depois: { nome: store.nome, ativo: store.ativo }
    });

    res.json(store);
  } catch (error) {
    console.error('Erro ao atualizar loja:', error);
    res.status(500).json({ error: 'Erro ao atualizar loja' });
  }
});

router.delete('/:id', isAdminGlobal, async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'stores',
      registro_id: store.id,
      dados_antes: { nome: store.nome }
    });

    await store.destroy();
    res.json({ message: 'Loja excluída' });
  } catch (error) {
    console.error('Erro ao excluir loja:', error);
    res.status(500).json({ error: 'Erro ao excluir loja' });
  }
});

module.exports = router;
