const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemOrdemServico = sequelize.define('ItemOrdemServico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ordem_servico_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  produto_id: {
    type: DataTypes.INTEGER
  },
  tipo_item: {
    type: DataTypes.ENUM('PRODUTO', 'SERVICO', 'MAO_DE_OBRA'),
    defaultValue: 'SERVICO'
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
  tableName: 'itens_ordem_servico',
  timestamps: true
});

module.exports = ItemOrdemServico;
