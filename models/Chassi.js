const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chassi = sequelize.define('Chassi', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  numero_chassi: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  estoque_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subestoque_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('CADASTRADO', 'LIBERADO', 'VENDIDO', 'INATIVO'),
    defaultValue: 'CADASTRADO',
  },
}, {
  tableName: 'chassis',
  timestamps: true,
});

module.exports = Chassi;
