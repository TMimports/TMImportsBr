function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function isSuperAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.perfil === 'SUPER_ADMIN') {
    return next();
  }
  res.status(403).render('error', { message: 'Acesso negado. Apenas SUPER ADMIN.', user: req.session.user });
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && 
      (req.session.user.perfil === 'SUPER_ADMIN' || req.session.user.perfil === 'ADMIN')) {
    return next();
  }
  res.status(403).render('error', { message: 'Acesso negado. Apenas ADMIN ou SUPER ADMIN.', user: req.session.user });
}

function isVendedor(req, res, next) {
  if (req.session && req.session.user && 
      (req.session.user.perfil === 'SUPER_ADMIN' || req.session.user.perfil === 'ADMIN' || req.session.user.perfil === 'VENDEDOR')) {
    return next();
  }
  res.status(403).render('error', { message: 'Acesso negado.', user: req.session.user });
}

function isContador(req, res, next) {
  if (req.session && req.session.user && 
      (req.session.user.perfil === 'SUPER_ADMIN' || req.session.user.perfil === 'CONTADOR')) {
    return next();
  }
  res.status(403).render('error', { message: 'Acesso negado. Apenas CONTADOR ou SUPER ADMIN.', user: req.session.user });
}

function canAccessFinanceiro(req, res, next) {
  if (req.session && req.session.user && 
      (req.session.user.perfil === 'SUPER_ADMIN' || req.session.user.perfil === 'CONTADOR')) {
    return next();
  }
  res.status(403).render('error', { message: 'Acesso negado ao módulo financeiro.', user: req.session.user });
}

module.exports = {
  isAuthenticated,
  isSuperAdmin,
  isAdmin,
  isVendedor,
  isContador,
  canAccessFinanceiro,
};
