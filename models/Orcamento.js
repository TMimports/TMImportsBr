const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Orcamento = sequelize.define('Orcamento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING,
    unique: true
  },
  origem_tipo: {
    type: DataTypes.ENUM('VENDA', 'ORDEM_SERVICO', 'INDEPENDENTE'),
    allowNull: false,
    defaultValue: 'INDEPENDENTE'
  },
  origem_id: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  data_emissao: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  data_validade: {
    type: DataTypes.DATE,
    allowNull: false
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
  status: {
    type: DataTypes.ENUM('RASCUNHO', 'ENVIADO', 'APROVADO', 'EXPIRADO', 'CANCELADO'),
    defaultValue: 'RASCUNHO'
  },
  vendedor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  aprovado_em: {
    type: DataTypes.DATE
  },
  aprovado_por: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'orcamentos',
  timestamps: true
});

Orcamento.beforeCreate(async (orc) => {
  const count = await Orcamento.count();
  orc.codigo = 'ORC-' + String(count + 1).padStart(6, '0');
  
  if (!orc.data_validade) {
    const validade = new Date();
    validade.setDate(validade.getDate() + 7);
    orc.data_validade = validade;
  }
});

module.exports = Orcamento;
