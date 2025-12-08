const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venda = sequelize.define('Venda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vendedor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cliente_nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cliente_telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cliente_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  data_venda: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  desconto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  valor_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  forma_pagamento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  estoque_id_consumido: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subestoque_id_consumido: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDENTE', 'APROVADA', 'CONCLUIDA', 'CANCELADA'),
    defaultValue: 'PENDENTE',
  },
  chassi_selecionado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'vendas',
  timestamps: true,
});

module.exports = Venda;
