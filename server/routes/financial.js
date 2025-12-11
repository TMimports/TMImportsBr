const express = require('express');
const router = express.Router();
const { PaymentReceivable, PaymentPayable, Customer, Store, Sale, ServiceOrder, AuditLog, sequelize } = require('../models');
const { verifyToken, isGestorOuAdmin, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

router.get('/receber', async (req, res) => {
  try {
    const { status, data_inicio, data_fim } = req.query;
    const where = { ...req.storeFilter };

    if (status) where.status = status;
    if (data_inicio && data_fim) {
      where.data_vencimento = { [Op.between]: [data_inicio, data_fim] };
    }

    const contas = await PaymentReceivable.findAll({
      where,
      include: [{ model: Customer, as: 'cliente' }],
      order: [['data_vencimento', 'ASC']]
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas a receber:', error);
    res.status(500).json({ error: 'Erro ao listar contas a receber' });
  }
});

router.post('/receber', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await PaymentReceivable.create({
      ...req.body,
      loja_id: req.body.loja_id || req.user.loja_id
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'payments_receivable',
      registro_id: conta.id,
      dados_depois: { descricao: conta.descricao, valor: conta.valor }
    });

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error);
    res.status(500).json({ error: 'Erro ao criar conta a receber' });
  }
});

router.put('/receber/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await PaymentReceivable.findByPk(req.params.id);
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    await conta.update(req.body);
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta a receber' });
  }
});

router.post('/receber/:id/baixar', isGestorOuAdmin, async (req, res) => {
  try {
    const { valor_pago, data_pagamento } = req.body;
    const conta = await PaymentReceivable.findByPk(req.params.id);
    
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const novoValorPago = parseFloat(conta.valor_pago || 0) + parseFloat(valor_pago);
    let novoStatus = 'PARCIAL';
    
    if (novoValorPago >= parseFloat(conta.valor)) {
      novoStatus = 'PAGO';
    }

    await conta.update({
      valor_pago: novoValorPago,
      data_pagamento: data_pagamento || new Date(),
      status: novoStatus
    });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'BAIXA',
      tabela: 'payments_receivable',
      registro_id: conta.id,
      dados_depois: { valor_pago: novoValorPago, status: novoStatus }
    });

    res.json(conta);
  } catch (error) {
    console.error('Erro ao baixar conta:', error);
    res.status(500).json({ error: 'Erro ao baixar conta' });
  }
});

router.get('/pagar', async (req, res) => {
  try {
    const { status, data_inicio, data_fim, categoria } = req.query;
    const where = { ...req.storeFilter };

    if (status) where.status = status;
    if (categoria) where.categoria = categoria;
    if (data_inicio && data_fim) {
      where.data_vencimento = { [Op.between]: [data_inicio, data_fim] };
    }

    const contas = await PaymentPayable.findAll({
      where,
      order: [['data_vencimento', 'ASC']]
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas a pagar:', error);
    res.status(500).json({ error: 'Erro ao listar contas a pagar' });
  }
});

router.post('/pagar', isGestorOuAdmin, async (req, res) => {
  try {
    const { recorrente, ...dados } = req.body;
    const contas = [];

    if (recorrente) {
      const dataBase = new Date(dados.data_vencimento);
      const mesAtual = dataBase.getMonth();
      const anoAtual = dataBase.getFullYear();
      
      for (let mes = mesAtual; mes <= 11; mes++) {
        const dataVencimento = new Date(anoAtual, mes, dataBase.getDate());
        const conta = await PaymentPayable.create({
          ...dados,
          loja_id: dados.loja_id || req.user.loja_id,
          data_vencimento: dataVencimento,
          parcela: mes - mesAtual + 1,
          total_parcelas: 12 - mesAtual,
          recorrente: true
        });
        contas.push(conta);
      }
    } else {
      const conta = await PaymentPayable.create({
        ...dados,
        loja_id: dados.loja_id || req.user.loja_id
      });
      contas.push(conta);
    }

    res.status(201).json(contas);
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error);
    res.status(500).json({ error: 'Erro ao criar conta a pagar' });
  }
});

router.put('/pagar/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await PaymentPayable.findByPk(req.params.id);
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    await conta.update(req.body);
    res.json(conta);
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta a pagar' });
  }
});

router.post('/pagar/:id/baixar', isGestorOuAdmin, async (req, res) => {
  try {
    const { valor_pago, data_pagamento } = req.body;
    const conta = await PaymentPayable.findByPk(req.params.id);
    
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const novoValorPago = parseFloat(conta.valor_pago || 0) + parseFloat(valor_pago);
    let novoStatus = 'PARCIAL';
    
    if (novoValorPago >= parseFloat(conta.valor)) {
      novoStatus = 'PAGO';
    }

    await conta.update({
      valor_pago: novoValorPago,
      data_pagamento: data_pagamento || new Date(),
      status: novoStatus
    });

    res.json(conta);
  } catch (error) {
    console.error('Erro ao baixar conta:', error);
    res.status(500).json({ error: 'Erro ao baixar conta' });
  }
});

router.delete('/pagar/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await PaymentPayable.findByPk(req.params.id);
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    await conta.destroy();
    res.json({ message: 'Conta excluída' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

router.get('/fluxo-caixa', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const where = req.storeFilter;
    
    const whereData = {};
    if (data_inicio && data_fim) {
      whereData.data_vencimento = { [Op.between]: [data_inicio, data_fim] };
    }

    const receber = await PaymentReceivable.findAll({
      where: { ...where, ...whereData },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor')), 'total_previsto'],
        [sequelize.fn('SUM', sequelize.col('valor_pago')), 'total_recebido']
      ],
      raw: true
    });

    const pagar = await PaymentPayable.findAll({
      where: { ...where, ...whereData },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor')), 'total_previsto'],
        [sequelize.fn('SUM', sequelize.col('valor_pago')), 'total_pago']
      ],
      raw: true
    });

    res.json({
      receber: receber[0],
      pagar: pagar[0],
      saldo_previsto: (parseFloat(receber[0]?.total_previsto || 0) - parseFloat(pagar[0]?.total_previsto || 0)),
      saldo_realizado: (parseFloat(receber[0]?.total_recebido || 0) - parseFloat(pagar[0]?.total_pago || 0))
    });
  } catch (error) {
    console.error('Erro ao calcular fluxo de caixa:', error);
    res.status(500).json({ error: 'Erro ao calcular fluxo de caixa' });
  }
});

module.exports = router;
