const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  senha_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  perfil: {
    type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'VENDEDOR', 'CONTADOR'),
    allowNull: false,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  primeiro_acesso: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
});

Usuario.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.senha_hash);
};

Usuario.hashPassword = async function(password) {
  return await bcrypt.hash(password, 10);
};

module.exports = Usuario;
