const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Anexo = sequelize.define('Anexo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tipo_entidade: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entidade_id: {
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
  tableName: 'anexos',
  timestamps: true,
});

module.exports = Anexo;
