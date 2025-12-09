const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrdemServico = sequelize.define('OrdemServico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING,
    unique: true
  },
  cliente_nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cliente_telefone: {
    type: DataTypes.STRING
  },
  cliente_email: {
    type: DataTypes.STRING
  },
  cliente_cpf_cnpj: {
    type: DataTypes.STRING
  },
  cliente_endereco: {
    type: DataTypes.TEXT
  },
  veiculo_modelo: {
    type: DataTypes.STRING
  },
  veiculo_placa: {
    type: DataTypes.STRING
  },
  veiculo_chassi: {
    type: DataTypes.STRING
  },
  veiculo_cor: {
    type: DataTypes.STRING
  },
  veiculo_km: {
    type: DataTypes.INTEGER
  },
  descricao_problema: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  diagnostico: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('ABERTA', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'CONCLUIDA', 'CANCELADA'),
    defaultValue: 'ABERTA'
  },
  data_entrada: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  data_prevista_entrega: {
    type: DataTypes.DATE
  },
  data_conclusao: {
    type: DataTypes.DATE
  },
  vendedor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  responsavel_tecnico_id: {
    type: DataTypes.INTEGER
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  desconto_total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  forma_pagamento: {
    type: DataTypes.STRING
  },
  observacoes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'ordens_servico',
  timestamps: true
});

OrdemServico.beforeCreate(async (os) => {
  const count = await OrdemServico.count();
  os.codigo = 'OS-' + String(count + 1).padStart(6, '0');
});

module.exports = OrdemServico;
