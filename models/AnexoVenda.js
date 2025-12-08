const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnexoVenda = sequelize.define('AnexoVenda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  venda_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  caminho_arquivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nome_arquivo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'anexos_venda',
  timestamps: true,
});

module.exports = AnexoVenda;
