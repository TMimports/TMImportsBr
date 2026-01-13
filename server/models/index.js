const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  escopo: { type: DataTypes.ENUM('TMIMPORTS', 'TECLE_MOTOS', 'AMBOS'), defaultValue: 'AMBOS' },
  permissoes: { type: DataTypes.JSON, defaultValue: {} },
  ordem: { type: DataTypes.INTEGER, defaultValue: 0 },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'roles', timestamps: true });

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  senha: { type: DataTypes.STRING(255), allowNull: false },
  perfil: { type: DataTypes.ENUM(
    'ADMIN_GLOBAL', 
    'GESTOR_FRANQUIA', 
    'OPERACIONAL',
    'GESTOR_DASHBOARD',
    'GERENTE_OP',
    'FINANCEIRO',
    'ADM1_LOGISTICA',
    'ADM2_CADASTRO',
    'ADM3_OS_GARANTIA',
    'VENDEDOR_TMI',
    'FRANQUEADO_GESTOR',
    'GERENTE_LOJA',
    'VENDEDOR_LOJA'
  ), defaultValue: 'OPERACIONAL' },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  primeiro_acesso: { type: DataTypes.BOOLEAN, defaultValue: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  loja_id: { type: DataTypes.INTEGER, allowNull: true },
  permissoes: { type: DataTypes.JSON, defaultValue: {} },
  ultimo_acesso: { type: DataTypes.DATE },
  token_version: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'users', timestamps: true });

const UserRole = sequelize.define('UserRole', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  principal: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'user_roles', timestamps: true });

const Company = sequelize.define('Company', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  cnpj: { type: DataTypes.STRING(20), unique: true },
  tipo: { type: DataTypes.ENUM('MATRIZ', 'FRANQUIA'), defaultValue: 'FRANQUIA' },
  endereco: { type: DataTypes.TEXT },
  telefone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  logo: { type: DataTypes.STRING(255) },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  config: { type: DataTypes.JSON, defaultValue: {} }
}, { tableName: 'companies', timestamps: true });

const Store = sequelize.define('Store', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  codigo: { type: DataTypes.STRING(20), unique: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  endereco: { type: DataTypes.TEXT },
  cidade: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.STRING(2) },
  telefone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  margem_padrao: { type: DataTypes.DECIMAL(5, 2), defaultValue: 30 }
}, { tableName: 'stores', timestamps: true });

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  tipo: { type: DataTypes.ENUM('MOTO', 'PECA', 'SERVICO'), defaultValue: 'PECA' },
  descricao: { type: DataTypes.TEXT },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'categories', timestamps: true });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(50), unique: true },
  nome: { type: DataTypes.STRING(200), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  categoria_id: { type: DataTypes.INTEGER },
  tipo: { type: DataTypes.ENUM('MOTO', 'PECA', 'SERVICO'), defaultValue: 'PECA' },
  preco_custo: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  percentual_lucro: { type: DataTypes.DECIMAL(5, 2), defaultValue: 30 },
  preco_venda: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  estoque_minimo: { type: DataTypes.INTEGER, defaultValue: 0 },
  estoque_maximo: { type: DataTypes.INTEGER, defaultValue: 100 },
  peso: { type: DataTypes.DECIMAL(10, 3) },
  garantia: { type: DataTypes.STRING(100) },
  localizacao: { type: DataTypes.STRING(100) },
  informacoes_adicionais: { type: DataTypes.TEXT },
  observacoes: { type: DataTypes.TEXT },
  chassi: { type: DataTypes.STRING(50) },
  codigo_motor: { type: DataTypes.STRING(50) },
  capacidade_bateria: { type: DataTypes.STRING(50) },
  cor: { type: DataTypes.STRING(50) },
  imagem: { type: DataTypes.STRING(255) },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'products', timestamps: true });

const InventoryMain = sequelize.define('InventoryMain', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 0 },
  reservado: { type: DataTypes.INTEGER, defaultValue: 0 },
  localizacao: { type: DataTypes.STRING(100) }
}, { tableName: 'inventory_main', timestamps: true });

const InventoryStore = sequelize.define('InventoryStore', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loja_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 0 },
  reservado: { type: DataTypes.INTEGER, defaultValue: 0 },
  preco_venda_local: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'inventory_store', timestamps: true });

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  cpf_cnpj: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  telefone: { type: DataTypes.STRING(20) },
  endereco: { type: DataTypes.TEXT },
  cidade: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.STRING(2) },
  cep: { type: DataTypes.STRING(10) },
  observacoes: { type: DataTypes.TEXT },
  loja_id: { type: DataTypes.INTEGER },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'customers', timestamps: true });

const Vendor = sequelize.define('Vendor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150) },
  telefone: { type: DataTypes.STRING(20) },
  comissao: { type: DataTypes.DECIMAL(5, 2), defaultValue: 5 },
  desconto_maximo: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10 },
  loja_id: { type: DataTypes.INTEGER },
  user_id: { type: DataTypes.INTEGER },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'vendors', timestamps: true });

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: { type: DataTypes.STRING(20), unique: true },
  loja_id: { type: DataTypes.INTEGER, allowNull: false },
  cliente_id: { type: DataTypes.INTEGER },
  vendedor_id: { type: DataTypes.INTEGER },
  data_venda: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('ORCAMENTO', 'PENDENTE', 'APROVADA', 'CONCLUIDA', 'CANCELADA'), defaultValue: 'ORCAMENTO' },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  forma_pagamento: { type: DataTypes.STRING(50) },
  parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
  observacoes: { type: DataTypes.TEXT },
  validade_orcamento: { type: DataTypes.DATE }
}, { tableName: 'sales', timestamps: true });

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  venda_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 1 },
  preco_unitario: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'sales_items', timestamps: true });

const ServiceOrder = sequelize.define('ServiceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: { type: DataTypes.STRING(20), unique: true },
  loja_id: { type: DataTypes.INTEGER, allowNull: false },
  cliente_id: { type: DataTypes.INTEGER },
  vendedor_id: { type: DataTypes.INTEGER },
  veiculo_marca: { type: DataTypes.STRING(100) },
  veiculo_modelo: { type: DataTypes.STRING(100) },
  veiculo_placa: { type: DataTypes.STRING(10) },
  veiculo_chassi: { type: DataTypes.STRING(50) },
  problema_relatado: { type: DataTypes.TEXT },
  diagnostico: { type: DataTypes.TEXT },
  solucao: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('ABERTA', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'CONCLUIDA', 'CANCELADA'), defaultValue: 'ABERTA' },
  data_abertura: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  data_previsao: { type: DataTypes.DATE },
  data_conclusao: { type: DataTypes.DATE },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'service_orders', timestamps: true });

const ServiceOrderItem = sequelize.define('ServiceOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  os_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER },
  descricao: { type: DataTypes.STRING(200) },
  tipo: { type: DataTypes.ENUM('PECA', 'SERVICO', 'MAO_DE_OBRA'), defaultValue: 'SERVICO' },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 1 },
  preco_unitario: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'os_items', timestamps: true });

const PaymentReceivable = sequelize.define('PaymentReceivable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loja_id: { type: DataTypes.INTEGER },
  venda_id: { type: DataTypes.INTEGER },
  os_id: { type: DataTypes.INTEGER },
  cliente_id: { type: DataTypes.INTEGER },
  descricao: { type: DataTypes.STRING(200) },
  valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  valor_pago: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  data_vencimento: { type: DataTypes.DATEONLY },
  data_pagamento: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('PENDENTE', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO'), defaultValue: 'PENDENTE' },
  forma_pagamento: { type: DataTypes.STRING(50) },
  parcela: { type: DataTypes.INTEGER, defaultValue: 1 },
  total_parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'payments_receivable', timestamps: true });

const PaymentPayable = sequelize.define('PaymentPayable', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loja_id: { type: DataTypes.INTEGER },
  fornecedor: { type: DataTypes.STRING(150) },
  descricao: { type: DataTypes.STRING(200) },
  categoria: { type: DataTypes.STRING(100) },
  valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  valor_pago: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  data_vencimento: { type: DataTypes.DATEONLY },
  data_pagamento: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('PENDENTE', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO'), defaultValue: 'PENDENTE' },
  tipo: { type: DataTypes.ENUM('VARIAVEL', 'FIXA'), defaultValue: 'VARIAVEL' },
  recorrente: { type: DataTypes.BOOLEAN, defaultValue: false },
  parcela: { type: DataTypes.INTEGER, defaultValue: 1 },
  total_parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'payments_payable', timestamps: true });

const BankAccount = sequelize.define('BankAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER },
  loja_id: { type: DataTypes.INTEGER },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  banco: { type: DataTypes.STRING(100) },
  agencia: { type: DataTypes.STRING(20) },
  conta: { type: DataTypes.STRING(30) },
  tipo: { type: DataTypes.ENUM('CORRENTE', 'POUPANCA', 'CAIXA'), defaultValue: 'CORRENTE' },
  saldo_inicial: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  saldo_atual: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'bank_accounts', timestamps: true });

const BankTransaction = sequelize.define('BankTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conta_id: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.DATEONLY },
  valor: { type: DataTypes.DECIMAL(12, 2) },
  tipo: { type: DataTypes.ENUM('CREDITO', 'DEBITO'), defaultValue: 'CREDITO' },
  historico: { type: DataTypes.TEXT },
  identificador_pix: { type: DataTypes.STRING(100) },
  codigo_unico: { type: DataTypes.STRING(100) },
  categoria: { type: DataTypes.STRING(100) },
  conciliado: { type: DataTypes.BOOLEAN, defaultValue: false },
  pagamento_id: { type: DataTypes.INTEGER },
  recebimento_id: { type: DataTypes.INTEGER },
  importado_de: { type: DataTypes.STRING(50) }
}, { tableName: 'bank_transactions', timestamps: true });

const ReconciliationRule = sequelize.define('ReconciliationRule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER },
  nome: { type: DataTypes.STRING(100) },
  padrao: { type: DataTypes.STRING(200) },
  categoria: { type: DataTypes.STRING(100) },
  tipo: { type: DataTypes.ENUM('RECEITA', 'DESPESA', 'TARIFA', 'TAXA'), defaultValue: 'DESPESA' },
  acao: { type: DataTypes.STRING(50) },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'reconciliation_rules', timestamps: true });

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  acao: { type: DataTypes.STRING(50) },
  tabela: { type: DataTypes.STRING(50) },
  registro_id: { type: DataTypes.INTEGER },
  dados_antes: { type: DataTypes.JSON },
  dados_depois: { type: DataTypes.JSON },
  ip: { type: DataTypes.STRING(50) },
  user_agent: { type: DataTypes.TEXT }
}, { tableName: 'audit_logs', timestamps: true });

const PurchaseRequest = sequelize.define('PurchaseRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loja_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('PENDENTE', 'APROVADA', 'REJEITADA', 'ENVIADA', 'RECEBIDA'), defaultValue: 'PENDENTE' },
  observacoes: { type: DataTypes.TEXT },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'purchase_requests', timestamps: true });

const PurchaseRequestItem = sequelize.define('PurchaseRequestItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  solicitacao_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 1 },
  preco_unitario: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'purchase_request_items', timestamps: true });

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  loja_origem_id: { type: DataTypes.INTEGER },
  loja_destino_id: { type: DataTypes.INTEGER },
  tipo: { type: DataTypes.ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'VENDA', 'OS'), defaultValue: 'ENTRADA' },
  quantidade: { type: DataTypes.INTEGER },
  user_id: { type: DataTypes.INTEGER },
  referencia_id: { type: DataTypes.INTEGER },
  referencia_tipo: { type: DataTypes.STRING(50) },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'inventory_movements', timestamps: true });

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  titulo: { type: DataTypes.STRING(150) },
  mensagem: { type: DataTypes.TEXT },
  tipo: { type: DataTypes.STRING(50) },
  lida: { type: DataTypes.BOOLEAN, defaultValue: false },
  link: { type: DataTypes.STRING(255) }
}, { tableName: 'notifications', timestamps: true });

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER },
  chave: { type: DataTypes.STRING(100) },
  valor: { type: DataTypes.TEXT },
  tipo: { type: DataTypes.STRING(50) }
}, { tableName: 'settings', timestamps: true });

const FiscalData = sequelize.define('FiscalData', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER },
  loja_id: { type: DataTypes.INTEGER },
  razao_social: { type: DataTypes.STRING(200) },
  nome_fantasia: { type: DataTypes.STRING(200) },
  cnpj: { type: DataTypes.STRING(20) },
  inscricao_estadual: { type: DataTypes.STRING(20) },
  inscricao_municipal: { type: DataTypes.STRING(20) },
  cnae: { type: DataTypes.STRING(10) },
  regime_tributario: { type: DataTypes.ENUM('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'), defaultValue: 'SIMPLES_NACIONAL' },
  endereco: { type: DataTypes.STRING(200) },
  numero: { type: DataTypes.STRING(20) },
  complemento: { type: DataTypes.STRING(100) },
  bairro: { type: DataTypes.STRING(100) },
  cidade: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.STRING(2) },
  cep: { type: DataTypes.STRING(10) },
  codigo_municipio: { type: DataTypes.STRING(10) },
  telefone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  api_provider: { type: DataTypes.ENUM('FOCUS_NFE', 'PLUGNOTAS', 'WEBMANIA', 'NFE_IO', 'MANUAL'), defaultValue: 'MANUAL' },
  api_token: { type: DataTypes.STRING(255) },
  api_ambiente: { type: DataTypes.ENUM('HOMOLOGACAO', 'PRODUCAO'), defaultValue: 'HOMOLOGACAO' },
  certificado_base64: { type: DataTypes.TEXT },
  certificado_senha: { type: DataTypes.STRING(100) },
  certificado_validade: { type: DataTypes.DATE },
  serie_nfe: { type: DataTypes.INTEGER, defaultValue: 1 },
  numero_nfe_atual: { type: DataTypes.INTEGER, defaultValue: 0 },
  serie_nfce: { type: DataTypes.INTEGER, defaultValue: 1 },
  numero_nfce_atual: { type: DataTypes.INTEGER, defaultValue: 0 },
  csc_id: { type: DataTypes.STRING(10) },
  csc_token: { type: DataTypes.STRING(50) },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'fiscal_data', timestamps: true });

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loja_id: { type: DataTypes.INTEGER },
  venda_id: { type: DataTypes.INTEGER },
  os_id: { type: DataTypes.INTEGER },
  cliente_id: { type: DataTypes.INTEGER },
  tipo: { type: DataTypes.ENUM('NFE', 'NFCE', 'NFSE'), defaultValue: 'NFE' },
  numero: { type: DataTypes.INTEGER },
  serie: { type: DataTypes.INTEGER, defaultValue: 1 },
  chave_acesso: { type: DataTypes.STRING(50) },
  protocolo: { type: DataTypes.STRING(20) },
  status: { type: DataTypes.ENUM('RASCUNHO', 'PROCESSANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'INUTILIZADA', 'DENEGADA'), defaultValue: 'RASCUNHO' },
  mensagem_sefaz: { type: DataTypes.TEXT },
  codigo_status: { type: DataTypes.STRING(10) },
  natureza_operacao: { type: DataTypes.STRING(100), defaultValue: 'Venda de Mercadoria' },
  finalidade: { type: DataTypes.ENUM('NORMAL', 'COMPLEMENTAR', 'AJUSTE', 'DEVOLUCAO'), defaultValue: 'NORMAL' },
  destinatario_nome: { type: DataTypes.STRING(200) },
  destinatario_cpf_cnpj: { type: DataTypes.STRING(20) },
  destinatario_ie: { type: DataTypes.STRING(20) },
  destinatario_email: { type: DataTypes.STRING(150) },
  destinatario_endereco: { type: DataTypes.STRING(200) },
  destinatario_numero: { type: DataTypes.STRING(20) },
  destinatario_bairro: { type: DataTypes.STRING(100) },
  destinatario_cidade: { type: DataTypes.STRING(100) },
  destinatario_uf: { type: DataTypes.STRING(2) },
  destinatario_cep: { type: DataTypes.STRING(10) },
  destinatario_codigo_municipio: { type: DataTypes.STRING(10) },
  destinatario_telefone: { type: DataTypes.STRING(20) },
  valor_produtos: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_frete: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_seguro: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_outras_despesas: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_icms: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_ipi: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_pis: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_cofins: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_iss: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  forma_pagamento: { type: DataTypes.STRING(50) },
  informacoes_complementares: { type: DataTypes.TEXT },
  informacoes_fisco: { type: DataTypes.TEXT },
  xml: { type: DataTypes.TEXT },
  pdf_url: { type: DataTypes.STRING(500) },
  pdf_base64: { type: DataTypes.TEXT },
  data_emissao: { type: DataTypes.DATE },
  data_saida: { type: DataTypes.DATE },
  data_cancelamento: { type: DataTypes.DATE },
  motivo_cancelamento: { type: DataTypes.TEXT },
  referencia_api: { type: DataTypes.STRING(100) },
  user_id: { type: DataTypes.INTEGER }
}, { tableName: 'invoices', timestamps: true });

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER },
  numero_item: { type: DataTypes.INTEGER, defaultValue: 1 },
  codigo: { type: DataTypes.STRING(50) },
  descricao: { type: DataTypes.STRING(200) },
  ncm: { type: DataTypes.STRING(10) },
  cfop: { type: DataTypes.STRING(10) },
  unidade: { type: DataTypes.STRING(10), defaultValue: 'UN' },
  quantidade: { type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
  valor_unitario: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  valor_total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  valor_desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cst_icms: { type: DataTypes.STRING(5) },
  aliquota_icms: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  valor_icms: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cst_ipi: { type: DataTypes.STRING(5) },
  aliquota_ipi: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  valor_ipi: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cst_pis: { type: DataTypes.STRING(5) },
  aliquota_pis: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  valor_pis: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cst_cofins: { type: DataTypes.STRING(5) },
  aliquota_cofins: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  valor_cofins: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  origem: { type: DataTypes.STRING(2), defaultValue: '0' }
}, { tableName: 'invoice_items', timestamps: true });

const InvoiceEvent = sequelize.define('InvoiceEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('EMISSAO', 'CANCELAMENTO', 'CARTA_CORRECAO', 'INUTILIZACAO', 'MANIFESTACAO'), defaultValue: 'EMISSAO' },
  sequencia: { type: DataTypes.INTEGER, defaultValue: 1 },
  protocolo: { type: DataTypes.STRING(20) },
  descricao: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(20) },
  mensagem: { type: DataTypes.TEXT },
  xml: { type: DataTypes.TEXT },
  data_evento: { type: DataTypes.DATE },
  user_id: { type: DataTypes.INTEGER }
}, { tableName: 'invoice_events', timestamps: true });

Company.hasMany(Store, { foreignKey: 'empresa_id', as: 'lojas' });
Store.belongsTo(Company, { foreignKey: 'empresa_id', as: 'empresa' });

Company.hasMany(User, { foreignKey: 'empresa_id' });
User.belongsTo(Company, { foreignKey: 'empresa_id' });

Store.hasMany(User, { foreignKey: 'loja_id' });
User.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });

Category.hasMany(Product, { foreignKey: 'categoria_id' });
Product.belongsTo(Category, { foreignKey: 'categoria_id', as: 'categoria' });

Product.hasOne(InventoryMain, { foreignKey: 'produto_id', as: 'estoque_central' });
InventoryMain.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Store.hasMany(InventoryStore, { foreignKey: 'loja_id' });
InventoryStore.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
Product.hasMany(InventoryStore, { foreignKey: 'produto_id' });
InventoryStore.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Store.hasMany(Customer, { foreignKey: 'loja_id' });
Customer.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });

Store.hasMany(Vendor, { foreignKey: 'loja_id' });
Vendor.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
User.hasOne(Vendor, { foreignKey: 'user_id' });
Vendor.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

Store.hasMany(Sale, { foreignKey: 'loja_id' });
Sale.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
Customer.hasMany(Sale, { foreignKey: 'cliente_id' });
Sale.belongsTo(Customer, { foreignKey: 'cliente_id', as: 'cliente' });
Vendor.hasMany(Sale, { foreignKey: 'vendedor_id' });
Sale.belongsTo(Vendor, { foreignKey: 'vendedor_id', as: 'vendedor' });

Sale.hasMany(SaleItem, { foreignKey: 'venda_id', as: 'itens' });
SaleItem.belongsTo(Sale, { foreignKey: 'venda_id' });
Product.hasMany(SaleItem, { foreignKey: 'produto_id' });
SaleItem.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Store.hasMany(ServiceOrder, { foreignKey: 'loja_id' });
ServiceOrder.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
Customer.hasMany(ServiceOrder, { foreignKey: 'cliente_id' });
ServiceOrder.belongsTo(Customer, { foreignKey: 'cliente_id', as: 'cliente' });
Vendor.hasMany(ServiceOrder, { foreignKey: 'vendedor_id' });
ServiceOrder.belongsTo(Vendor, { foreignKey: 'vendedor_id', as: 'vendedor' });

ServiceOrder.hasMany(ServiceOrderItem, { foreignKey: 'os_id', as: 'itens' });
ServiceOrderItem.belongsTo(ServiceOrder, { foreignKey: 'os_id' });
Product.hasMany(ServiceOrderItem, { foreignKey: 'produto_id' });
ServiceOrderItem.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Store.hasMany(PaymentReceivable, { foreignKey: 'loja_id' });
PaymentReceivable.belongsTo(Store, { foreignKey: 'loja_id' });
Sale.hasMany(PaymentReceivable, { foreignKey: 'venda_id' });
PaymentReceivable.belongsTo(Sale, { foreignKey: 'venda_id' });
ServiceOrder.hasMany(PaymentReceivable, { foreignKey: 'os_id' });
PaymentReceivable.belongsTo(ServiceOrder, { foreignKey: 'os_id' });
Customer.hasMany(PaymentReceivable, { foreignKey: 'cliente_id' });
PaymentReceivable.belongsTo(Customer, { foreignKey: 'cliente_id', as: 'cliente' });

Store.hasMany(PaymentPayable, { foreignKey: 'loja_id' });
PaymentPayable.belongsTo(Store, { foreignKey: 'loja_id' });

Company.hasMany(BankAccount, { foreignKey: 'empresa_id' });
BankAccount.belongsTo(Company, { foreignKey: 'empresa_id' });
Store.hasMany(BankAccount, { foreignKey: 'loja_id' });
BankAccount.belongsTo(Store, { foreignKey: 'loja_id' });

BankAccount.hasMany(BankTransaction, { foreignKey: 'conta_id', as: 'transacoes' });
BankTransaction.belongsTo(BankAccount, { foreignKey: 'conta_id', as: 'conta' });

User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

Store.hasMany(PurchaseRequest, { foreignKey: 'loja_id' });
PurchaseRequest.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
User.hasMany(PurchaseRequest, { foreignKey: 'user_id' });
PurchaseRequest.belongsTo(User, { foreignKey: 'user_id', as: 'solicitante' });

PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'solicitacao_id', as: 'itens' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'solicitacao_id' });
Product.hasMany(PurchaseRequestItem, { foreignKey: 'produto_id' });
PurchaseRequestItem.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

Company.hasMany(Setting, { foreignKey: 'empresa_id' });
Setting.belongsTo(Company, { foreignKey: 'empresa_id' });

Product.hasMany(InventoryMovement, { foreignKey: 'produto_id' });
InventoryMovement.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Company.hasMany(FiscalData, { foreignKey: 'empresa_id' });
FiscalData.belongsTo(Company, { foreignKey: 'empresa_id', as: 'empresa' });
Store.hasMany(FiscalData, { foreignKey: 'loja_id' });
FiscalData.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });

Store.hasMany(Invoice, { foreignKey: 'loja_id' });
Invoice.belongsTo(Store, { foreignKey: 'loja_id', as: 'loja' });
Sale.hasMany(Invoice, { foreignKey: 'venda_id' });
Invoice.belongsTo(Sale, { foreignKey: 'venda_id', as: 'venda' });
ServiceOrder.hasMany(Invoice, { foreignKey: 'os_id' });
Invoice.belongsTo(ServiceOrder, { foreignKey: 'os_id', as: 'ordem_servico' });
Customer.hasMany(Invoice, { foreignKey: 'cliente_id' });
Invoice.belongsTo(Customer, { foreignKey: 'cliente_id', as: 'cliente' });
User.hasMany(Invoice, { foreignKey: 'user_id' });
Invoice.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'itens' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });
Product.hasMany(InvoiceItem, { foreignKey: 'produto_id' });
InvoiceItem.belongsTo(Product, { foreignKey: 'produto_id', as: 'produto' });

Invoice.hasMany(InvoiceEvent, { foreignKey: 'invoice_id', as: 'eventos' });
InvoiceEvent.belongsTo(Invoice, { foreignKey: 'invoice_id' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', as: 'users' });

UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'userRoles' });
Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'roleUsers' });

module.exports = {
  sequelize,
  Role,
  User,
  UserRole,
  Company,
  Store,
  Category,
  Product,
  InventoryMain,
  InventoryStore,
  Customer,
  Vendor,
  Sale,
  SaleItem,
  ServiceOrder,
  ServiceOrderItem,
  PaymentReceivable,
  PaymentPayable,
  BankAccount,
  BankTransaction,
  ReconciliationRule,
  AuditLog,
  PurchaseRequest,
  PurchaseRequestItem,
  InventoryMovement,
  Notification,
  Setting,
  FiscalData,
  Invoice,
  InvoiceItem,
  InvoiceEvent
};
