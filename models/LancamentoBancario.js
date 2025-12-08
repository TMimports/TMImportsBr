const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LancamentoBancario = sequelize.define('LancamentoBancario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  data: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('CREDITO', 'DEBITO'),
    allowNull: false,
  },
  conta_texto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status_conciliacao: {
    type: DataTypes.ENUM('PENDENTE', 'CONCILIADO'),
    defaultValue: 'PENDENTE',
  },
  conta_receber_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  conta_pagar_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  arquivado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  anexo_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  anexo_nome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'lancamentos_bancarios',
  timestamps: true,
});

module.exports = LancamentoBancario;
