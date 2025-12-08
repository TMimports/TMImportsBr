const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContaReceber = sequelize.define('ContaReceber', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  venda_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
  },
  cliente_nome: {
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
  forma_pagamento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  origem: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('EM_ABERTO', 'RECEBIDO', 'ATRASADO', 'CANCELADO'),
    defaultValue: 'EM_ABERTO',
  },
  arquivado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'contas_receber',
  timestamps: true,
});

module.exports = ContaReceber;
