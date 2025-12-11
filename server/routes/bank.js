const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { BankAccount, BankTransaction, ReconciliationRule, PaymentReceivable, PaymentPayable, Company, Store, AuditLog, sequelize } = require('../models');
const { verifyToken, isGestorOuAdmin, isAdminGlobal } = require('../middleware/auth');
const { Op } = require('sequelize');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken);

router.get('/contas', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where[Op.or] = [
        { loja_id: req.user.loja_id },
        { empresa_id: req.user.empresa_id }
      ];
    }

    const contas = await BankAccount.findAll({
      where,
      include: [
        { model: Company },
        { model: Store }
      ],
      order: [['nome', 'ASC']]
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ error: 'Erro ao listar contas bancárias' });
  }
});

router.post('/contas', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await BankAccount.create({
      ...req.body,
      empresa_id: req.body.empresa_id || req.user.empresa_id,
      loja_id: req.body.loja_id || req.user.loja_id
    });

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({ error: 'Erro ao criar conta bancária' });
  }
});

router.delete('/contas/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const conta = await BankAccount.findByPk(req.params.id);
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Exclui todas as transações associadas
    await BankTransaction.destroy({ where: { conta_id: conta.id } });
    
    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'bank_accounts',
      registro_id: conta.id,
      dados_antes: { nome: conta.nome, banco: conta.banco }
    });

    await conta.destroy();

    res.json({ message: 'Conta bancária excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({ error: 'Erro ao excluir conta bancária' });
  }
});

router.get('/transacoes', async (req, res) => {
  try {
    const { conta_id, conciliado, data_inicio, data_fim } = req.query;
    const where = {};

    if (conta_id) where.conta_id = conta_id;
    if (conciliado !== undefined) where.conciliado = conciliado === 'true';
    if (data_inicio && data_fim) {
      where.data = { [Op.between]: [data_inicio, data_fim] };
    }

    const transacoes = await BankTransaction.findAll({
      where,
      include: [{ model: BankAccount, as: 'conta' }],
      order: [['data', 'DESC']]
    });

    res.json(transacoes);
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

router.post('/upload', isGestorOuAdmin, upload.single('arquivo'), async (req, res) => {
  try {
    const { conta_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const conta = await BankAccount.findByPk(conta_id);
    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    let transacoes = [];
    const fileContent = req.file.buffer.toString('utf-8');
    
    if (req.file.originalname.endsWith('.ofx')) {
      const lines = fileContent.split('\n');
      let currentTrans = {};
      
      for (const line of lines) {
        if (line.includes('<STMTTRN>')) {
          currentTrans = {};
        } else if (line.includes('</STMTTRN>')) {
          if (currentTrans.valor) {
            transacoes.push(currentTrans);
          }
        } else if (line.includes('<DTPOSTED>')) {
          const dateStr = line.replace('<DTPOSTED>', '').replace('</DTPOSTED>', '').trim().substring(0, 8);
          currentTrans.data = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        } else if (line.includes('<TRNAMT>')) {
          const valor = parseFloat(line.replace('<TRNAMT>', '').replace('</TRNAMT>', '').trim());
          currentTrans.valor = Math.abs(valor);
          currentTrans.tipo = valor >= 0 ? 'CREDITO' : 'DEBITO';
        } else if (line.includes('<MEMO>')) {
          currentTrans.historico = line.replace('<MEMO>', '').replace('</MEMO>', '').trim();
        } else if (line.includes('<FITID>')) {
          currentTrans.codigo_unico = line.replace('<FITID>', '').replace('</FITID>', '').trim();
        }
      }
    } else if (req.file.originalname.endsWith('.csv') || req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      for (const row of data) {
        const valor = parseFloat(row['Valor'] || row['valor'] || row['Importancia'] || 0);
        transacoes.push({
          data: row['Data'] || row['data'] || new Date().toISOString().split('T')[0],
          valor: Math.abs(valor),
          tipo: valor >= 0 ? 'CREDITO' : 'DEBITO',
          historico: row['Histórico'] || row['historico'] || row['Descrição'] || row['descricao'] || '',
          codigo_unico: row['ID'] || row['Documento'] || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        });
      }
    }

    const resultados = { importadas: 0, duplicadas: 0 };

    for (const trans of transacoes) {
      const existente = await BankTransaction.findOne({
        where: { conta_id, codigo_unico: trans.codigo_unico }
      });

      if (!existente) {
        await BankTransaction.create({
          conta_id,
          ...trans,
          importado_de: req.file.originalname
        });
        resultados.importadas++;
      } else {
        resultados.duplicadas++;
      }
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'IMPORT',
      tabela: 'bank_transactions',
      dados_depois: { arquivo: req.file.originalname, ...resultados }
    });

    res.json(resultados);
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ error: 'Erro ao importar extrato' });
  }
});

router.post('/reconcile', isGestorOuAdmin, async (req, res) => {
  try {
    const { transacao_id, tipo, referencia_id } = req.body;
    
    const transacao = await BankTransaction.findByPk(transacao_id);
    if (!transacao) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    if (tipo === 'receber') {
      const conta = await PaymentReceivable.findByPk(referencia_id);
      if (conta) {
        await conta.update({
          valor_pago: transacao.valor,
          data_pagamento: transacao.data,
          status: transacao.valor >= conta.valor ? 'PAGO' : 'PARCIAL'
        });
        await transacao.update({ conciliado: true, recebimento_id: referencia_id });
      }
    } else if (tipo === 'pagar') {
      const conta = await PaymentPayable.findByPk(referencia_id);
      if (conta) {
        await conta.update({
          valor_pago: transacao.valor,
          data_pagamento: transacao.data,
          status: transacao.valor >= conta.valor ? 'PAGO' : 'PARCIAL'
        });
        await transacao.update({ conciliado: true, pagamento_id: referencia_id });
      }
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'RECONCILE',
      tabela: 'bank_transactions',
      registro_id: transacao_id,
      dados_depois: { tipo, referencia_id }
    });

    res.json({ message: 'Conciliação realizada com sucesso' });
  } catch (error) {
    console.error('Erro na conciliação:', error);
    res.status(500).json({ error: 'Erro na conciliação' });
  }
});

router.post('/auto-reconcile', isGestorOuAdmin, async (req, res) => {
  try {
    const { conta_id } = req.body;
    
    const transacoes = await BankTransaction.findAll({
      where: { conta_id, conciliado: false }
    });

    const resultados = { conciliadas: 0, pendentes: 0 };

    for (const trans of transacoes) {
      let encontrado = false;

      if (trans.tipo === 'CREDITO') {
        const conta = await PaymentReceivable.findOne({
          where: {
            valor: trans.valor,
            status: { [Op.ne]: 'PAGO' }
          }
        });

        if (conta) {
          await conta.update({
            valor_pago: trans.valor,
            data_pagamento: trans.data,
            status: 'PAGO'
          });
          await trans.update({ conciliado: true, recebimento_id: conta.id });
          encontrado = true;
        }
      } else {
        const conta = await PaymentPayable.findOne({
          where: {
            valor: trans.valor,
            status: { [Op.ne]: 'PAGO' }
          }
        });

        if (conta) {
          await conta.update({
            valor_pago: trans.valor,
            data_pagamento: trans.data,
            status: 'PAGO'
          });
          await trans.update({ conciliado: true, pagamento_id: conta.id });
          encontrado = true;
        }
      }

      if (encontrado) {
        resultados.conciliadas++;
      } else {
        resultados.pendentes++;
      }
    }

    res.json(resultados);
  } catch (error) {
    console.error('Erro na conciliação automática:', error);
    res.status(500).json({ error: 'Erro na conciliação automática' });
  }
});

router.get('/regras', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.empresa_id = req.user.empresa_id;
    }

    const regras = await ReconciliationRule.findAll({ where });
    res.json(regras);
  } catch (error) {
    console.error('Erro ao listar regras:', error);
    res.status(500).json({ error: 'Erro ao listar regras' });
  }
});

router.post('/regras', isGestorOuAdmin, async (req, res) => {
  try {
    const regra = await ReconciliationRule.create({
      ...req.body,
      empresa_id: req.user.empresa_id
    });
    res.status(201).json(regra);
  } catch (error) {
    console.error('Erro ao criar regra:', error);
    res.status(500).json({ error: 'Erro ao criar regra' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.loja_id = req.user.loja_id;
    }

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const [totalReceber, totalPagar, recebido, pago] = await Promise.all([
      PaymentReceivable.sum('valor', { where: { ...where, status: { [Op.ne]: 'PAGO' } } }),
      PaymentPayable.sum('valor', { where: { ...where, status: { [Op.ne]: 'PAGO' } } }),
      PaymentReceivable.sum('valor_pago', {
        where: { ...where, data_pagamento: { [Op.between]: [inicioMes, fimMes] } }
      }),
      PaymentPayable.sum('valor_pago', {
        where: { ...where, data_pagamento: { [Op.between]: [inicioMes, fimMes] } }
      })
    ]);

    const contas = await BankAccount.findAll({ where });
    const saldoTotal = contas.reduce((sum, c) => sum + parseFloat(c.saldo_atual || 0), 0);

    const transacoesPendentes = await BankTransaction.count({
      where: { conciliado: false }
    });

    res.json({
      totalReceber: totalReceber || 0,
      totalPagar: totalPagar || 0,
      recebidoMes: recebido || 0,
      pagoMes: pago || 0,
      saldoBancario: saldoTotal,
      transacoesPendentes
    });
  } catch (error) {
    console.error('Erro ao gerar dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard financeiro' });
  }
});

module.exports = router;
