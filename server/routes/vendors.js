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

const { Setting } = require('../models');

router.get('/me/comissoes', async (req, res) => {
  try {
    const vendedor = await Vendor.findOne({
      where: { user_id: req.user.id },
      include: [{ model: Store, as: 'loja' }]
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado para este usuário' });
    }

    const tipoLoja = vendedor.loja?.tipo || 'FRANQUIA';
    
    const settings = await Setting.findAll({ where: { empresa_id: null } });
    const config = {};
    settings.forEach(s => {
      if (s.tipo === 'number') config[s.chave] = parseFloat(s.valor);
      else config[s.chave] = s.valor;
    });

    const taxaComissao = tipoLoja === 'MATRIZ' 
      ? (config.comissao_atacado || 2) 
      : (config.comissao_franquia || 1);

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    const vendasMes = await Sale.findAll({
      where: {
        vendedor_id: vendedor.id,
        status: 'CONCLUIDA',
        data_venda: { [Op.between]: [inicioMes, fimMes] }
      }
    });

    const totalVendasMes = vendasMes.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const comissaoMes = (totalVendasMes * taxaComissao) / 100;

    const inicioAno = new Date(agora.getFullYear(), 0, 1);
    const vendasAno = await Sale.findAll({
      where: {
        vendedor_id: vendedor.id,
        status: 'CONCLUIDA',
        data_venda: { [Op.between]: [inicioAno, fimMes] }
      }
    });

    const totalVendasAno = vendasAno.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const comissaoAno = (totalVendasAno * taxaComissao) / 100;

    res.json({
      vendedor_id: vendedor.id,
      vendedor_nome: vendedor.nome,
      tipo_loja: tipoLoja,
      taxa_comissao: taxaComissao,
      mes_atual: {
        total_vendas: totalVendasMes,
        qtd_vendas: vendasMes.length,
        comissao: comissaoMes
      },
      ano_atual: {
        total_vendas: totalVendasAno,
        qtd_vendas: vendasAno.length,
        comissao: comissaoAno
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    res.status(500).json({ error: 'Erro ao buscar comissões' });
  }
});

module.exports = router;
