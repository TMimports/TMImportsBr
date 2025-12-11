const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const { sequelize, User, Company, Store, Category } = require('./models');

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

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

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

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/', (req, res) => {
  res.redirect('/app');
});

app.get('/app', (req, res) => {
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
