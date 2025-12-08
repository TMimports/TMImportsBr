const crypto = require('crypto');

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfTokenMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function validateCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = (req.body && req.body._csrf) || 
                req.headers['x-csrf-token'] || 
                req.query._csrf;
  
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).render('error', { 
      message: 'Erro de segurança: Token CSRF inválido.', 
      user: req.session ? req.session.user : null 
    });
  }
  next();
}

module.exports = {
  generateCsrfToken,
  csrfTokenMiddleware,
  validateCsrf
};
