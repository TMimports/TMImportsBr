const jwt = require('jsonwebtoken');
const { User, Store, Company } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'tm-imports-tecle-motos-secret-2024';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Store, as: 'loja' },
        { model: Company }
      ]
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const isAdminGlobal = (req, res, next) => {
  if (req.user.perfil !== 'ADMIN_GLOBAL') {
    return res.status(403).json({ error: 'Acesso negado. Apenas Admin Global.' });
  }
  next();
};

const isGestorOuAdmin = (req, res, next) => {
  if (!['ADMIN_GLOBAL', 'GESTOR_FRANQUIA'].includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.perfil === 'ADMIN_GLOBAL') {
      return next();
    }
    
    const permissoes = req.user.permissoes || {};
    if (permissoes[permission]) {
      return next();
    }
    
    return res.status(403).json({ error: 'Permissão negada' });
  };
};

const filterByStore = (req, res, next) => {
  if (req.user.perfil === 'ADMIN_GLOBAL') {
    req.storeFilter = {};
  } else {
    req.storeFilter = { loja_id: req.user.loja_id };
  }
  next();
};

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  isAdminGlobal,
  isGestorOuAdmin,
  hasPermission,
  filterByStore
};
