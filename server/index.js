const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const { sequelize, User, Company, Store, Category, Role, UserRole, Setting } = require('./models');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const companiesRoutes = require('./routes/companies');
const storesRoutes = require('./routes/stores');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const serviceOrdersRoutes = require('./routes/serviceOrders');
const customersRoutes = require('./routes/customers');
const vendorsRoutes = require('./routes/vendors');
const financialRoutes = require('./routes/financial');
const bankRoutes = require('./routes/bank');
const dashboardRoutes = require('./routes/dashboard');
const categoriesRoutes = require('./routes/categories');
const purchaseRequestsRoutes = require('./routes/purchaseRequests');
const auditRoutes = require('./routes/audit');
const invoicesRoutes = require('./routes/invoices');
const settingsRoutes = require('./routes/settings');
const notificationsRoutes = require('./routes/notifications');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/purchase-requests', purchaseRequestsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/', (req, res) => {
  res.redirect('/app');
});

app.get('/app', (req, res) => {
  res.render('app');
});

app.get('/app/:page', (req, res) => {
  res.render('app');
});

async function initializeDatabase() {
  try {
    await sequelize.sync();
    console.log('Database synchronized');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tmimports.com';
    const adminSenha = process.env.ADMIN_SENHA || 'admin123';
    const adminNome = process.env.ADMIN_NOME || 'Admin TM Imports';

    let admin = await User.findOne({ where: { email: adminEmail } });
    
    if (!admin) {
      let matriz = await Company.findOne({ where: { tipo: 'MATRIZ' } });
      
      if (!matriz) {
        matriz = await Company.create({
          nome: 'TM Imports',
          tipo: 'MATRIZ',
          cnpj: '00.000.000/0001-00'
        });
        console.log('Matriz TM Imports created');
      }

      const senhaHash = await bcrypt.hash(adminSenha, 10);
      admin = await User.create({
        nome: adminNome,
        email: adminEmail,
        senha: senhaHash,
        perfil: 'ADMIN_GLOBAL',
        empresa_id: matriz.id,
        primeiro_acesso: false
      });
      console.log('Admin Global created:', adminEmail);
    }

    const rolesCount = await Role.count();
    if (rolesCount === 0) {
      const rolesDefault = [
        { codigo: 'ADMIN_GLOBAL', nome: 'Admin Global', escopo: 'AMBOS', ordem: 1, permissoes: { all: true } },
        { codigo: 'GESTOR_DASHBOARD', nome: 'Gestor Dashboard', escopo: 'TMIMPORTS', ordem: 2, permissoes: { dashboard: ['read'], vendas: ['read'], os: ['read'], estoque: ['read'] } },
        { codigo: 'GERENTE_OP', nome: 'Gerente Operacional', escopo: 'TMIMPORTS', ordem: 3, permissoes: { produtos: ['create','read','update'], estoque: ['create','read','update'], vendas: ['create','read','update'], os: ['create','read','update'], clientes: ['create','read','update'], pedidos: ['create','read','update','approve'] } },
        { codigo: 'FINANCEIRO', nome: 'Financeiro', escopo: 'TMIMPORTS', ordem: 4, permissoes: { financeiro: ['create','read','update','delete'], fiscal: ['create','read','update'], vendas: ['read'], os: ['read'] } },
        { codigo: 'ADM1_LOGISTICA', nome: 'ADM 1 - Logística', escopo: 'TMIMPORTS', ordem: 5, permissoes: { estoque: ['create','read','update'], pedidos: ['read','update','send'], movimentacoes: ['create','read'] } },
        { codigo: 'ADM2_CADASTRO', nome: 'ADM 2 - Cadastro', escopo: 'TMIMPORTS', ordem: 6, permissoes: { usuarios: ['create','read','update'], empresas: ['create','read','update'], lojas: ['create','read','update'], produtos: ['create','read','update'] } },
        { codigo: 'ADM3_OS_GARANTIA', nome: 'ADM 3 - OS/Garantia', escopo: 'TMIMPORTS', ordem: 7, permissoes: { os: ['create','read','update'], garantia: ['create','read','update'] } },
        { codigo: 'VENDEDOR_TMI', nome: 'Vendedor TM Imports', escopo: 'TMIMPORTS', ordem: 8, permissoes: { vendas: ['create','read'], produtos: ['read'], estoque: ['read'], clientes: ['create','read','update'] } },
        { codigo: 'FRANQUEADO_GESTOR', nome: 'Franqueado/Gestor', escopo: 'TECLE_MOTOS', ordem: 10, permissoes: { dashboard: ['read'], vendas: ['create','read','update','delete'], os: ['create','read','update','delete'], estoque: ['read'], clientes: ['create','read','update'], pedidos: ['create','read','update'], usuarios: ['create','read','update'], configuracoes: ['read','update'] } },
        { codigo: 'GERENTE_LOJA', nome: 'Gerente de Loja', escopo: 'TECLE_MOTOS', ordem: 11, permissoes: { vendas: ['create','read','update'], os: ['create','read','update'], estoque: ['read'], clientes: ['create','read','update'], pedidos: ['create','read','update'] } },
        { codigo: 'VENDEDOR_LOJA', nome: 'Vendedor Loja', escopo: 'TECLE_MOTOS', ordem: 12, permissoes: { vendas: ['create','read'], os: ['create','read'], estoque: ['read'], clientes: ['create','read','update'] } }
      ];
      await Role.bulkCreate(rolesDefault);
      console.log('Default roles created');
      
      const adminRole = await Role.findOne({ where: { codigo: 'ADMIN_GLOBAL' } });
      if (admin && adminRole) {
        const existingUserRole = await UserRole.findOne({ where: { user_id: admin.id, role_id: adminRole.id } });
        if (!existingUserRole) {
          await UserRole.create({ user_id: admin.id, role_id: adminRole.id, principal: true });
          console.log('Admin assigned ADMIN_GLOBAL role');
        }
      }
    }

    const settingsCount = await Setting.count();
    if (settingsCount === 0) {
      const settingsDefault = [
        { chave: 'desconto_max_moto', valor: '3.5', tipo: 'number' },
        { chave: 'desconto_max_peca', valor: '10', tipo: 'number' },
        { chave: 'desconto_max_servico', valor: '10', tipo: 'number' },
        { chave: 'parcelas_max_moto', valor: '21', tipo: 'number' },
        { chave: 'parcelas_max_peca', valor: '10', tipo: 'number' },
        { chave: 'taxa_debito', valor: '1', tipo: 'number' },
        { chave: 'estoque_minimo_alerta', valor: '2', tipo: 'number' },
        { chave: 'margem_franqueado_peca', valor: '60', tipo: 'number' },
        { chave: 'margem_franqueado_moto', valor: '26.32', tipo: 'number' },
        { chave: 'taxas_cartao', valor: JSON.stringify({1:0,2:3.5,3:4.5,4:5.5,5:6.5,6:7.5,7:8.5,8:9.5,9:10.5,10:11.5,11:12.5,12:13.5,13:14.5,14:15.5,15:16.5,16:17.5,17:18.5,18:19.5,19:20.5,20:21.5,21:22.5}), tipo: 'json' },
        { chave: 'servicos_catalogo', valor: JSON.stringify([
          {nome:'Mão de obra 15min',preco:70,parcelas_max:1},
          {nome:'Mão de obra 30min',preco:140,parcelas_max:1},
          {nome:'Mão de obra 45min',preco:270,parcelas_max:2},
          {nome:'Mão de obra 1h',preco:330,parcelas_max:3},
          {nome:'Revitalização',preco:1200,parcelas_max:5},
          {nome:'Serviço de motor',preco:1000,parcelas_max:5},
          {nome:'Serviço de módulo',preco:700,parcelas_max:4},
          {nome:'Troca pneu dianteiro',preco:150,parcelas_max:2},
          {nome:'Troca pneu traseiro',preco:290,parcelas_max:2},
          {nome:'Revisão',preco:350,parcelas_max:2}
        ]), tipo: 'json' }
      ];
      await Setting.bulkCreate(settingsDefault);
      console.log('Default settings created');
    }

    const categoriaCount = await Category.count();
    if (categoriaCount === 0) {
      await Category.bulkCreate([
        { nome: 'Motos Elétricas', tipo: 'MOTO' },
        { nome: 'Scooters Elétricas', tipo: 'MOTO' },
        { nome: 'Bicicletas Elétricas', tipo: 'MOTO' },
        { nome: 'Baterias', tipo: 'PECA' },
        { nome: 'Carregadores', tipo: 'PECA' },
        { nome: 'Peças de Reposição', tipo: 'PECA' },
        { nome: 'Acessórios', tipo: 'PECA' },
        { nome: 'Manutenção', tipo: 'SERVICO' },
        { nome: 'Instalação', tipo: 'SERVICO' },
        { nome: 'Revisão', tipo: 'SERVICO' }
      ]);
      console.log('Default categories created');
    }

  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TM Imports / Tecle Motos running on http://0.0.0.0:${PORT}`);
  });
});
