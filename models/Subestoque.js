const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subestoque = sequelize.define('Subestoque', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome_subestoque: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  estoque_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'subestoques',
  timestamps: true,
});

module.exports = Subestoque;
