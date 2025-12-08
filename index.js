const express = require('express');
const session = require('express-session');
const path = require('path');
const { doubleCsrf } = require('csrf-csrf');
const { sequelize, Usuario } = require('./models');
const { isAuthenticated } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const produtosRoutes = require('./routes/produtos');
const estoqueRoutes = require('./routes/estoque');
const chassiRoutes = require('./routes/chassi');
const vendasRoutes = require('./routes/vendas');
const vendedorRoutes = require('./routes/vendedor');
const financeiroRoutes = require('./routes/financeiro');
const usuariosRoutes = require('./routes/usuarios');

const app = express();
const PORT = 5000;

// Configuração das views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares básicos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Evitar cache de páginas autenticadas
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'tecle-motos-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,                  // true somente se usar HTTPS
    maxAge: 24 * 60 * 60 * 1000,    // 1 dia
    sameSite: 'strict'
  }
}));

// CSRF Protection
const csrfConfig = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'tecle-motos-csrf-secret-2024',
  cookieName: 'csrf_token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
});
const { generateToken, doubleCsrfProtection } = csrfConfig;

// Variáveis globais para views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;

  res.locals.formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value || 0);
  };

  res.locals.formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  res.locals.csrfToken = generateToken(req, res);

  next();
});

// Excluir login da proteção CSRF
app.post('/login', (req, res, next) => next());
app.use(doubleCsrfProtection);

// Rotas principais
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/produtos', produtosRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/chassi', chassiRoutes);
app.use('/vendas', vendasRoutes);
app.use('/vendedor', vendedorRoutes);
app.use('/financeiro', financeiroRoutes);
app.use('/usuarios', usuariosRoutes);

// Rota raiz: redireciona conforme perfil
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    switch (req.session.user.perfil) {
      case 'SUPER_ADMIN':
        return res.redirect('/dashboard');
      case 'ADMIN':
        return res.redirect('/produtos');
      case 'VENDEDOR':
        return res.redirect('/vendedor/dashboard');
      case 'CONTADOR':
        return res.redirect('/financeiro/contas-receber');
      default:
        break;
    }
  }
  return res.redirect('/login');
});

// 404
app.use((req, res) => {
  res
    .status(404)
    .render('error', { 
      message: 'Página não encontrada.', 
      user: req.session ? req.session.user : null 
    });
});

// Inicialização do banco e usuário padrão
async function initDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');

    const adminExists = await Usuario.findOne({ where: { perfil: 'SUPER_ADMIN' } });
    if (!adminExists) {
      const senha_hash = await Usuario.hashPassword('admin123');
      await Usuario.create({
        nome: 'Super Admin',
        email: 'admin@teclemotos.com',
        senha_hash,
        perfil: 'SUPER_ADMIN',
        ativo: true
      });
      console.log('Default SUPER ADMIN created:');
      console.log('Email: admin@teclemotos.com');
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start do servidor
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tecle Motos running on http://0.0.0.0:${PORT}`);
  });
});