const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemEstoque = sequelize.define('ItemEstoque', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  produto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estoque_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subestoque_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  quantidade_minima: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'itens_estoque',
  timestamps: true,
});

module.exports = ItemEstoque;
