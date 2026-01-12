const express = require('express');
const router = express.Router();
const { Vendor, User, Store, Sale, AuditLog, Setting, InventoryMain, InventoryStore, Product, Customer } = require('../models');
const { verifyToken, isGestorOuAdmin, filterByStore } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(verifyToken);
router.use(filterByStore);

// IMPORTANTE: Rotas /me/* devem vir ANTES de /:id para evitar conflito
router.get('/me/dashboard', async (req, res) => {
  try {
    const vendedor = await Vendor.findOne({
      where: { user_id: req.user.id },
      include: [{ model: Store, as: 'loja' }]
    });

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor não encontrado para este usuário' });
    }

    const tipoLoja = vendedor.loja?.tipo || 'FRANQUIA';
    const lojaId = vendedor.loja_id;
    const isAtacado = tipoLoja === 'MATRIZ';
    
    const settings = await Setting.findAll({ where: { empresa_id: null } });
    const config = {};
    settings.forEach(s => {
      if (s.tipo === 'number') config[s.chave] = parseFloat(s.valor);
      else config[s.chave] = s.valor;
    });

    const taxaComissao = isAtacado 
      ? (config.comissao_atacado || 2) 
      : (config.comissao_franquia || 1);

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    const inicioAno = new Date(agora.getFullYear(), 0, 1);

    const [vendasPendentes, vendasAprovadas, vendasConcluidas, vendasCanceladas, vendasMes, vendasAno] = await Promise.all([
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'PENDENTE' } }),
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'APROVADA' } }),
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'CONCLUIDA' } }),
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'CANCELADA' } }),
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'CONCLUIDA', data_venda: { [Op.between]: [inicioMes, fimMes] } } }),
      Sale.findAll({ where: { vendedor_id: vendedor.id, status: 'CONCLUIDA', data_venda: { [Op.between]: [inicioAno, fimMes] } } })
    ]);

    const totalVendasMes = vendasMes.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const comissaoMes = (totalVendasMes * taxaComissao) / 100;
    const totalVendasAno = vendasAno.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const comissaoAno = (totalVendasAno * taxaComissao) / 100;

    const totalPendentes = vendasPendentes.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalAprovadas = vendasAprovadas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalConcluidas = vendasConcluidas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);

    let estoque = { total: 0, baixo: 0, zerado: 0, valorTotal: 0 };
    
    if (isAtacado) {
      const [totalEstoque, baixoEstoque, zeradoEstoque, inventario] = await Promise.all([
        InventoryMain.count({ where: { quantidade: { [Op.gt]: 0 } } }),
        InventoryMain.count({ where: { quantidade: { [Op.between]: [1, 5] } } }),
        InventoryMain.count({ where: { quantidade: 0 } }),
        InventoryMain.findAll({ 
          include: [{ model: Product, as: 'produto', attributes: ['preco_custo'] }],
          where: { quantidade: { [Op.gt]: 0 } }
        })
      ]);
      estoque.total = totalEstoque;
      estoque.baixo = baixoEstoque;
      estoque.zerado = zeradoEstoque;
      estoque.valorTotal = inventario.reduce((sum, i) => sum + (parseFloat(i.produto?.preco_custo || 0) * i.quantidade), 0);
    } else {
      const [totalEstoque, baixoEstoque, zeradoEstoque, inventario] = await Promise.all([
        InventoryStore.count({ where: { loja_id: lojaId, quantidade: { [Op.gt]: 0 } } }),
        InventoryStore.count({ where: { loja_id: lojaId, quantidade: { [Op.between]: [1, 5] } } }),
        InventoryStore.count({ where: { loja_id: lojaId, quantidade: 0 } }),
        InventoryStore.findAll({
          include: [{ model: Product, as: 'produto', attributes: ['preco_custo'] }],
          where: { loja_id: lojaId, quantidade: { [Op.gt]: 0 } }
        })
      ]);
      estoque.total = totalEstoque;
      estoque.baixo = baixoEstoque;
      estoque.zerado = zeradoEstoque;
      estoque.valorTotal = inventario.reduce((sum, i) => sum + (parseFloat(i.produto?.preco_custo || 0) * i.quantidade), 0);
    }

    const clientesAtendidos = await Customer.count({
      include: [{ 
        model: Sale, 
        as: 'vendas',
        where: { vendedor_id: vendedor.id },
        required: true 
      }]
    });

    const vendasRecentes = await Sale.findAll({
      where: { vendedor_id: vendedor.id },
      order: [['data_venda', 'DESC']],
      limit: 5,
      include: [{ model: Customer, as: 'cliente', attributes: ['nome'] }]
    });

    res.json({
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email,
        telefone: vendedor.telefone
      },
      loja: {
        id: vendedor.loja?.id,
        nome: vendedor.loja?.nome,
        tipo: tipoLoja,
        cidade: vendedor.loja?.cidade
      },
      comissao: {
        taxa: taxaComissao,
        mes: {
          vendas: vendasMes.length,
          totalVendas: totalVendasMes,
          comissao: comissaoMes
        },
        ano: {
          vendas: vendasAno.length,
          totalVendas: totalVendasAno,
          comissao: comissaoAno
        }
      },
      vendas: {
        pendentes: { qtd: vendasPendentes.length, valor: totalPendentes },
        aprovadas: { qtd: vendasAprovadas.length, valor: totalAprovadas },
        concluidas: { qtd: vendasConcluidas.length, valor: totalConcluidas },
        canceladas: { qtd: vendasCanceladas.length }
      },
      estoque,
      clientesAtendidos,
      vendasRecentes: vendasRecentes.map(v => ({
        id: v.id,
        data: v.data_venda,
        cliente: v.cliente?.nome || 'Cliente não informado',
        total: parseFloat(v.total || 0),
        status: v.status
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard do vendedor:', error);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

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

module.exports = router;
