const express = require('express');
const router = express.Router();
const { PurchaseRequest, PurchaseRequestItem, Product, Store, User, InventoryMain, InventoryStore, AuditLog } = require('../models');
const { verifyToken, isGestorOuAdmin, isAdminGlobal, filterByStore } = require('../middleware/auth');

router.use(verifyToken);
router.use(filterByStore);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = req.user.perfil === 'ADMIN_GLOBAL' ? {} : req.storeFilter;
    if (status) where.status = status;

    const requests = await PurchaseRequest.findAll({
      where,
      include: [
        { model: Store, as: 'loja' },
        { model: User, as: 'solicitante' },
        { model: PurchaseRequestItem, as: 'itens', include: [{ model: Product, as: 'produto' }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro ao listar solicitações de compra' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { itens, observacoes } = req.body;
    
    let total = 0;
    for (const item of itens) {
      total += (item.preco_unitario || 0) * item.quantidade;
    }

    const request = await PurchaseRequest.create({
      loja_id: req.user.loja_id,
      user_id: req.user.id,
      observacoes,
      total
    });

    for (const item of itens) {
      await PurchaseRequestItem.create({
        solicitacao_id: request.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario || 0
      });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'purchase_requests',
      registro_id: request.id,
      dados_depois: { total, itens: itens.length }
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro ao criar solicitação de compra' });
  }
});

router.post('/:id/aprovar', isAdminGlobal, async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    await request.update({ status: 'APROVADA' });
    res.json({ message: 'Solicitação aprovada' });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({ error: 'Erro ao aprovar solicitação' });
  }
});

router.post('/:id/enviar', isAdminGlobal, async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id, {
      include: [{ model: PurchaseRequestItem, as: 'itens' }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    for (const item of request.itens) {
      const estoqueCentral = await InventoryMain.findOne({
        where: { produto_id: item.produto_id }
      });

      if (!estoqueCentral || estoqueCentral.quantidade < item.quantidade) {
        return res.status(400).json({ 
          error: `Estoque central insuficiente para o produto ${item.produto_id}` 
        });
      }

      await estoqueCentral.update({
        quantidade: estoqueCentral.quantidade - item.quantidade
      });

      let estoqueLolja = await InventoryStore.findOne({
        where: { produto_id: item.produto_id, loja_id: request.loja_id }
      });

      if (estoqueLolja) {
        await estoqueLolja.update({
          quantidade: estoqueLolja.quantidade + item.quantidade
        });
      } else {
        await InventoryStore.create({
          produto_id: item.produto_id,
          loja_id: request.loja_id,
          quantidade: item.quantidade
        });
      }
    }

    await request.update({ status: 'ENVIADA' });
    res.json({ message: 'Produtos enviados para a loja' });
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error);
    res.status(500).json({ error: 'Erro ao enviar solicitação' });
  }
});

router.post('/:id/receber', async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (request.loja_id !== req.user.loja_id && req.user.perfil !== 'ADMIN_GLOBAL') {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    await request.update({ status: 'RECEBIDA' });
    res.json({ message: 'Recebimento confirmado' });
  } catch (error) {
    console.error('Erro ao confirmar recebimento:', error);
    res.status(500).json({ error: 'Erro ao confirmar recebimento' });
  }
});

router.post('/:id/rejeitar', isAdminGlobal, async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    await request.update({ status: 'REJEITADA' });
    res.json({ message: 'Solicitação rejeitada' });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    res.status(500).json({ error: 'Erro ao rejeitar solicitação' });
  }
});

module.exports = router;
