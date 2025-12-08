const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { canAccessFinanceiro, isSuperAdmin } = require('../middleware/auth');
const { ContaReceber, ContaPagar, LancamentoBancario, Venda, Anexo } = require('../models');
const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, Date.now() + '-' + sanitizedName);
  }
});
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/contas-receber', canAccessFinanceiro, async (req, res) => {
  try {
    const { search, status, data_inicio, data_fim } = req.query;
    let where = { arquivado: false };
    
    if (status) where.status = status;
    if (search) {
      where.cliente_nome = { [Op.like]: `%${search}%` };
    }
    
    let periodo = '';
    if (data_inicio && data_fim) {
      where.data_vencimento = { [Op.between]: [new Date(data_inicio), new Date(data_fim + 'T23:59:59')] };
      periodo = `${data_inicio},${data_fim}`;
    } else if (data_inicio) {
      where.data_vencimento = { [Op.gte]: new Date(data_inicio) };
      periodo = `${data_inicio},`;
    } else if (data_fim) {
      where.data_vencimento = { [Op.lte]: new Date(data_fim + 'T23:59:59') };
      periodo = `,${data_fim}`;
    }

    const contas = await ContaReceber.findAll({
      where,
      include: [{ model: Venda }],
      order: [['data_vencimento', 'ASC']]
    });

    const hoje = new Date();
    for (const conta of contas) {
      if (conta.status === 'EM_ABERTO' && new Date(conta.data_vencimento) < hoje) {
        await ContaReceber.update({ status: 'ATRASADO' }, { where: { id: conta.id } });
        conta.status = 'ATRASADO';
      }
    }

    res.render('financial/contas-receber', {
      user: req.session.user,
      contas,
      filters: { search, status, periodo }
    });
  } catch (error) {
    console.error('Accounts receivable error:', error);
    res.render('error', { message: 'Erro ao carregar contas a receber.', user: req.session.user });
  }
});

router.post('/contas-receber/:id/update', isSuperAdmin, async (req, res) => {
  try {
    const { data_vencimento, forma_pagamento } = req.body;
    await ContaReceber.update({
      data_vencimento: new Date(data_vencimento),
      forma_pagamento
    }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-receber');
  } catch (error) {
    res.redirect('/financeiro/contas-receber?error=1');
  }
});

router.post('/contas-receber/:id/baixa', isSuperAdmin, async (req, res) => {
  try {
    await ContaReceber.update({
      status: 'RECEBIDO',
      data_pagamento: new Date()
    }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-receber');
  } catch (error) {
    res.redirect('/financeiro/contas-receber?error=1');
  }
});

router.post('/contas-receber/:id/arquivar', isSuperAdmin, async (req, res) => {
  try {
    await ContaReceber.update({ arquivado: true }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-receber');
  } catch (error) {
    res.redirect('/financeiro/contas-receber?error=1');
  }
});

router.post('/contas-receber/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    await ContaReceber.destroy({ where: { id: req.params.id } });
    res.redirect('/financeiro/contas-receber');
  } catch (error) {
    res.redirect('/financeiro/contas-receber?error=1');
  }
});

router.get('/contas-pagar', canAccessFinanceiro, async (req, res) => {
  try {
    const { search, status, tipo_conta, data_inicio, data_fim } = req.query;
    let where = { arquivado: false };
    
    if (status) where.status = status;
    if (tipo_conta) where.tipo_conta = tipo_conta;
    if (search) {
      where[Op.or] = [
        { descricao: { [Op.like]: `%${search}%` } },
        { fornecedor: { [Op.like]: `%${search}%` } }
      ];
    }
    
    let periodo = '';
    if (data_inicio && data_fim) {
      where.data_vencimento = { [Op.between]: [new Date(data_inicio), new Date(data_fim + 'T23:59:59')] };
      periodo = `${data_inicio},${data_fim}`;
    } else if (data_inicio) {
      where.data_vencimento = { [Op.gte]: new Date(data_inicio) };
      periodo = `${data_inicio},`;
    } else if (data_fim) {
      where.data_vencimento = { [Op.lte]: new Date(data_fim + 'T23:59:59') };
      periodo = `,${data_fim}`;
    }

    const contas = await ContaPagar.findAll({
      where,
      order: [['data_vencimento', 'ASC']]
    });

    res.render('financial/contas-pagar', {
      user: req.session.user,
      contas,
      filters: { search, status, tipo_conta, periodo }
    });
  } catch (error) {
    console.error('Accounts payable error:', error);
    res.render('error', { message: 'Erro ao carregar contas a pagar.', user: req.session.user });
  }
});

router.post('/contas-pagar', isSuperAdmin, async (req, res) => {
  try {
    const { descricao, valor, data_vencimento, fornecedor, categoria, tipo_conta, recorrencia_ativa, parcelas } = req.body;
    
    const isRecorrente = tipo_conta === 'FIXA' && recorrencia_ativa === 'on';
    
    if (isRecorrente && parcelas && Object.keys(parcelas).length > 0) {
      const parcelasArray = Object.values(parcelas);
      
      const primeiraConta = await ContaPagar.create({
        descricao,
        valor: parseFloat(parcelasArray[0].valor || valor),
        data_vencimento: new Date(parcelasArray[0].data || data_vencimento),
        fornecedor,
        categoria,
        tipo_conta,
        recorrencia_ativa: true,
        status: 'PENDENTE'
      });
      
      for (let i = 1; i < parcelasArray.length; i++) {
        const parcela = parcelasArray[i];
        await ContaPagar.create({
          descricao,
          valor: parseFloat(parcela.valor || valor),
          data_vencimento: new Date(parcela.data),
          fornecedor,
          categoria,
          tipo_conta,
          recorrencia_ativa: false,
          recorrencia_parent_id: primeiraConta.id,
          status: 'PENDENTE'
        });
      }
    } else {
      await ContaPagar.create({
        descricao,
        valor: parseFloat(valor),
        data_vencimento: new Date(data_vencimento),
        fornecedor,
        categoria,
        tipo_conta,
        recorrencia_ativa: false,
        status: 'PENDENTE'
      });
    }

    res.redirect('/financeiro/contas-pagar');
  } catch (error) {
    console.error('Create account payable error:', error);
    res.redirect('/financeiro/contas-pagar?error=1');
  }
});

router.post('/contas-pagar/:id/update', isSuperAdmin, async (req, res) => {
  try {
    const { descricao, valor, data_vencimento, fornecedor, categoria } = req.body;
    await ContaPagar.update({
      descricao,
      valor: parseFloat(valor),
      data_vencimento: new Date(data_vencimento),
      fornecedor,
      categoria
    }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-pagar');
  } catch (error) {
    res.redirect('/financeiro/contas-pagar?error=1');
  }
});

router.post('/contas-pagar/:id/baixa', isSuperAdmin, async (req, res) => {
  try {
    await ContaPagar.update({
      status: 'PAGO',
      data_pagamento: new Date()
    }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-pagar');
  } catch (error) {
    res.redirect('/financeiro/contas-pagar?error=1');
  }
});

router.post('/contas-pagar/:id/arquivar', isSuperAdmin, async (req, res) => {
  try {
    await ContaPagar.update({ arquivado: true }, { where: { id: req.params.id } });
    res.redirect('/financeiro/contas-pagar');
  } catch (error) {
    res.redirect('/financeiro/contas-pagar?error=1');
  }
});

router.post('/contas-pagar/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    await ContaPagar.destroy({ where: { id: req.params.id } });
    res.redirect('/financeiro/contas-pagar');
  } catch (error) {
    res.redirect('/financeiro/contas-pagar?error=1');
  }
});

router.get('/conciliacao', canAccessFinanceiro, async (req, res) => {
  try {
    const { search, status } = req.query;
    let where = { arquivado: false };
    
    if (status) where.status_conciliacao = status;
    if (search) {
      where.descricao = { [Op.like]: `%${search}%` };
    }

    const lancamentos = await LancamentoBancario.findAll({
      where,
      include: [
        { model: ContaReceber },
        { model: ContaPagar }
      ],
      order: [['data', 'DESC']]
    });

    const contasReceber = await ContaReceber.findAll({
      where: { status: { [Op.in]: ['EM_ABERTO', 'RECEBIDO'] } }
    });

    const contasPagar = await ContaPagar.findAll({
      where: { status: { [Op.in]: ['PENDENTE', 'PAGO'] } }
    });

    res.render('financial/conciliacao', {
      user: req.session.user,
      lancamentos,
      contasReceber,
      contasPagar,
      filters: { search, status }
    });
  } catch (error) {
    console.error('Bank reconciliation error:', error);
    res.render('error', { message: 'Erro ao carregar conciliação.', user: req.session.user });
  }
});

router.post('/conciliacao', isSuperAdmin, async (req, res) => {
  try {
    const { data, descricao, valor, tipo, conta_texto } = req.body;
    
    await LancamentoBancario.create({
      data: new Date(data),
      descricao,
      valor: parseFloat(valor),
      tipo,
      conta_texto,
      status_conciliacao: 'PENDENTE'
    });

    res.redirect('/financeiro/conciliacao');
  } catch (error) {
    console.error('Create bank entry error:', error);
    res.redirect('/financeiro/conciliacao?error=1');
  }
});

router.post('/conciliacao/:id/conciliar', isSuperAdmin, async (req, res) => {
  try {
    const { conta_receber_id, conta_pagar_id } = req.body;
    
    await LancamentoBancario.update({
      status_conciliacao: 'CONCILIADO',
      conta_receber_id: conta_receber_id ? parseInt(conta_receber_id) : null,
      conta_pagar_id: conta_pagar_id ? parseInt(conta_pagar_id) : null
    }, { where: { id: req.params.id } });

    res.redirect('/financeiro/conciliacao');
  } catch (error) {
    res.redirect('/financeiro/conciliacao?error=1');
  }
});

router.post('/conciliacao/:id/update', isSuperAdmin, async (req, res) => {
  try {
    const { data, descricao, valor, tipo, conta_texto } = req.body;
    await LancamentoBancario.update({
      data: new Date(data),
      descricao,
      valor: parseFloat(valor),
      tipo,
      conta_texto
    }, { where: { id: req.params.id } });
    res.redirect('/financeiro/conciliacao');
  } catch (error) {
    res.redirect('/financeiro/conciliacao?error=1');
  }
});

router.post('/conciliacao/:id/arquivar', isSuperAdmin, async (req, res) => {
  try {
    await LancamentoBancario.update({ arquivado: true }, { where: { id: req.params.id } });
    res.redirect('/financeiro/conciliacao');
  } catch (error) {
    res.redirect('/financeiro/conciliacao?error=1');
  }
});

router.post('/conciliacao/:id/delete', isSuperAdmin, async (req, res) => {
  try {
    await LancamentoBancario.destroy({ where: { id: req.params.id } });
    res.redirect('/financeiro/conciliacao');
  } catch (error) {
    res.redirect('/financeiro/conciliacao?error=1');
  }
});

module.exports = router;
