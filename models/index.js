const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Produto = require('./Produto');
const Estoque = require('./Estoque');
const Subestoque = require('./Subestoque');
const ItemEstoque = require('./ItemEstoque');
const Chassi = require('./Chassi');
const Venda = require('./Venda');
const ItemVenda = require('./ItemVenda');
const AnexoVenda = require('./AnexoVenda');
const ContaReceber = require('./ContaReceber');
const ContaPagar = require('./ContaPagar');
const LancamentoBancario = require('./LancamentoBancario');
const Anexo = require('./Anexo');
const OrdemServico = require('./OrdemServico');
const ItemOrdemServico = require('./ItemOrdemServico');
const Orcamento = require('./Orcamento');
const ItemOrcamento = require('./ItemOrcamento');

Subestoque.belongsTo(Estoque, { foreignKey: 'estoque_id' });
Estoque.hasMany(Subestoque, { foreignKey: 'estoque_id' });

ItemEstoque.belongsTo(Produto, { foreignKey: 'produto_id' });
ItemEstoque.belongsTo(Estoque, { foreignKey: 'estoque_id' });
ItemEstoque.belongsTo(Subestoque, { foreignKey: 'subestoque_id' });
Produto.hasMany(ItemEstoque, { foreignKey: 'produto_id' });

Chassi.belongsTo(Estoque, { foreignKey: 'estoque_id' });
Chassi.belongsTo(Subestoque, { foreignKey: 'subestoque_id' });

Venda.belongsTo(Usuario, { foreignKey: 'vendedor_id', as: 'vendedor' });
Venda.belongsTo(Estoque, { foreignKey: 'estoque_id_consumido' });
Venda.belongsTo(Subestoque, { foreignKey: 'subestoque_id_consumido' });
Usuario.hasMany(Venda, { foreignKey: 'vendedor_id' });

ItemVenda.belongsTo(Venda, { foreignKey: 'venda_id' });
ItemVenda.belongsTo(Produto, { foreignKey: 'produto_id' });
Venda.hasMany(ItemVenda, { foreignKey: 'venda_id' });
Produto.hasMany(ItemVenda, { foreignKey: 'produto_id' });

AnexoVenda.belongsTo(Venda, { foreignKey: 'venda_id' });
Venda.hasMany(AnexoVenda, { foreignKey: 'venda_id' });

ContaReceber.belongsTo(Venda, { foreignKey: 'venda_id' });
Venda.hasOne(ContaReceber, { foreignKey: 'venda_id' });

LancamentoBancario.belongsTo(ContaReceber, { foreignKey: 'conta_receber_id' });
LancamentoBancario.belongsTo(ContaPagar, { foreignKey: 'conta_pagar_id' });

OrdemServico.belongsTo(Usuario, { foreignKey: 'vendedor_id', as: 'vendedor' });
OrdemServico.belongsTo(Usuario, { foreignKey: 'responsavel_tecnico_id', as: 'responsavelTecnico' });
OrdemServico.hasMany(ItemOrdemServico, { foreignKey: 'ordem_servico_id', as: 'itens' });
ItemOrdemServico.belongsTo(OrdemServico, { foreignKey: 'ordem_servico_id' });
ItemOrdemServico.belongsTo(Produto, { foreignKey: 'produto_id' });

Orcamento.belongsTo(Usuario, { foreignKey: 'vendedor_id', as: 'vendedor' });
Orcamento.hasMany(ItemOrcamento, { foreignKey: 'orcamento_id', as: 'itens' });
ItemOrcamento.belongsTo(Orcamento, { foreignKey: 'orcamento_id' });
ItemOrcamento.belongsTo(Produto, { foreignKey: 'produto_id' });

module.exports = {
  sequelize,
  Usuario,
  Produto,
  Estoque,
  Subestoque,
  ItemEstoque,
  Chassi,
  Venda,
  ItemVenda,
  AnexoVenda,
  ContaReceber,
  ContaPagar,
  LancamentoBancario,
  Anexo,
  OrdemServico,
  ItemOrdemServico,
  Orcamento,
  ItemOrcamento,
};
