const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  item: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nome_modelo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nome_produto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  preco_venda: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  chassi: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  codigo_motor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  capacidade_bateria: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'produtos',
  timestamps: true,
});

module.exports = Produto;
