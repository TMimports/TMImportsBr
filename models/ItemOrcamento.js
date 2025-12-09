const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemOrcamento = sequelize.define('ItemOrcamento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orcamento_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  produto_id: {
    type: DataTypes.INTEGER
  },
  tipo_item: {
    type: DataTypes.ENUM('PRODUTO', 'SERVICO', 'MAO_DE_OBRA'),
    defaultValue: 'PRODUTO'
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantidade: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  preco_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  desconto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'itens_orcamento',
  timestamps: true
});

module.exports = ItemOrcamento;
