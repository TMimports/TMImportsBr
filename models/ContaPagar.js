const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContaPagar = sequelize.define('ContaPagar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  data_vencimento: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  data_pagamento: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fornecedor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tipo_conta: {
    type: DataTypes.ENUM('FIXA', 'VARIAVEL', 'UNICA'),
    defaultValue: 'UNICA',
  },
  recorrencia_ativa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  recorrencia_parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDENTE', 'PAGO', 'CANCELADO'),
    defaultValue: 'PENDENTE',
  },
  arquivado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'contas_pagar',
  timestamps: true,
});

module.exports = ContaPagar;
