const express = require('express');
const router = express.Router();
const { Product, InventoryMain, InventoryStore, Store, InventoryMovement, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, isAdminGlobal, filterByStore } = require('../middleware/auth');

router.use(verifyToken);

router.get('/central', async (req, res) => {
  try {
    const inventory = await InventoryMain.findAll({
      include: [{ model: Product, as: 'produto' }]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Erro ao listar estoque central:', error);
    res.status(500).json({ error: 'Erro ao listar estoque central' });
  }
});

router.get('/central-disponivel', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const inventory = await InventoryMain.findAll({
      where: {
        quantidade: { [Op.gt]: 0 }
      },
      include: [{ model: Product, as: 'produto' }],
      order: [[{ model: Product, as: 'produto' }, 'nome', 'ASC']]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Erro ao listar estoque central disponível:', error);
    res.status(500).json({ error: 'Erro ao listar estoque central disponível' });
  }
});

router.get('/loja', filterByStore, async (req, res) => {
  try {
    const where = req.storeFilter;
    const inventory = await InventoryStore.findAll({
      where,
      include: [
        { model: Product, as: 'produto' },
        { model: Store, as: 'loja' }
      ]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Erro ao listar estoque da loja:', error);
    res.status(500).json({ error: 'Erro ao listar estoque da loja' });
  }
});

router.post('/entrada', isGestorOuAdmin, async (req, res) => {
  try {
    const { produto_id, quantidade, loja_id, observacoes } = req.body;
    
    if (loja_id) {
      let estoqueLoja = await InventoryStore.findOne({
        where: { produto_id, loja_id }
      });

      if (estoqueLoja) {
        await estoqueLoja.update({
          quantidade: estoqueLoja.quantidade + parseInt(quantidade)
        });
      } else {
        estoqueLoja = await InventoryStore.create({
          produto_id,
          loja_id,
          quantidade: parseInt(quantidade)
        });
      }

      await InventoryMovement.create({
        produto_id,
        loja_destino_id: loja_id,
        tipo: 'ENTRADA',
        quantidade: parseInt(quantidade),
        user_id: req.user.id,
        observacoes
      });

      res.json(estoqueLoja);
    } else {
      let estoqueCentral = await InventoryMain.findOne({
        where: { produto_id }
      });

      if (estoqueCentral) {
        await estoqueCentral.update({
          quantidade: estoqueCentral.quantidade + parseInt(quantidade)
        });
      } else {
        estoqueCentral = await InventoryMain.create({
          produto_id,
          quantidade: parseInt(quantidade)
        });
      }

      await InventoryMovement.create({
        produto_id,
        tipo: 'ENTRADA',
        quantidade: parseInt(quantidade),
        user_id: req.user.id,
        observacoes
      });

      res.json(estoqueCentral);
    }
  } catch (error) {
    console.error('Erro ao dar entrada no estoque:', error);
    res.status(500).json({ error: 'Erro ao dar entrada no estoque' });
  }
});

router.post('/saida', isGestorOuAdmin, async (req, res) => {
  try {
    const { produto_id, quantidade, loja_id, observacoes } = req.body;
    
    if (loja_id) {
      const estoqueLoja = await InventoryStore.findOne({
        where: { produto_id, loja_id }
      });

      if (!estoqueLoja || estoqueLoja.quantidade < quantidade) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }

      await estoqueLoja.update({
        quantidade: estoqueLoja.quantidade - parseInt(quantidade)
      });

      await InventoryMovement.create({
        produto_id,
        loja_origem_id: loja_id,
        tipo: 'SAIDA',
        quantidade: parseInt(quantidade),
        user_id: req.user.id,
        observacoes
      });

      res.json(estoqueLoja);
    } else {
      const estoqueCentral = await InventoryMain.findOne({
        where: { produto_id }
      });

      if (!estoqueCentral || estoqueCentral.quantidade < quantidade) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }

      await estoqueCentral.update({
        quantidade: estoqueCentral.quantidade - parseInt(quantidade)
      });

      await InventoryMovement.create({
        produto_id,
        tipo: 'SAIDA',
        quantidade: parseInt(quantidade),
        user_id: req.user.id,
        observacoes
      });

      res.json(estoqueCentral);
    }
  } catch (error) {
    console.error('Erro ao dar saída no estoque:', error);
    res.status(500).json({ error: 'Erro ao dar saída no estoque' });
  }
});

router.post('/transferencia', isAdminGlobal, async (req, res) => {
  try {
    const { produto_id, quantidade, loja_destino_id, observacoes } = req.body;
    
    const estoqueCentral = await InventoryMain.findOne({
      where: { produto_id }
    });

    if (!estoqueCentral || estoqueCentral.quantidade < quantidade) {
      return res.status(400).json({ error: 'Estoque central insuficiente' });
    }

    await estoqueCentral.update({
      quantidade: estoqueCentral.quantidade - parseInt(quantidade)
    });

    let estoqueLoja = await InventoryStore.findOne({
      where: { produto_id, loja_id: loja_destino_id }
    });

    if (estoqueLoja) {
      await estoqueLoja.update({
        quantidade: estoqueLoja.quantidade + parseInt(quantidade)
      });
    } else {
      estoqueLoja = await InventoryStore.create({
        produto_id,
        loja_id: loja_destino_id,
        quantidade: parseInt(quantidade)
      });
    }

    await InventoryMovement.create({
      produto_id,
      loja_destino_id,
      tipo: 'TRANSFERENCIA',
      quantidade: parseInt(quantidade),
      user_id: req.user.id,
      observacoes
    });

    res.json({ message: 'Transferência realizada com sucesso' });
  } catch (error) {
    console.error('Erro na transferência:', error);
    res.status(500).json({ error: 'Erro na transferência' });
  }
});

router.get('/movimentacoes', async (req, res) => {
  try {
    const { produto_id, loja_id, tipo, data_inicio, data_fim } = req.query;
    const where = {};

    if (produto_id) where.produto_id = produto_id;
    if (loja_id) {
      where[Op.or] = [
        { loja_origem_id: loja_id },
        { loja_destino_id: loja_id }
      ];
    }
    if (tipo) where.tipo = tipo;

    const movimentacoes = await InventoryMovement.findAll({
      where,
      include: [{ model: Product, as: 'produto' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ error: 'Erro ao listar movimentações' });
  }
});

module.exports = router;
