const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User, Company, Store } = require('../models');
const { generateToken, verifyToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'nome', 'email', 'senha', 'perfil', 'ativo', 'primeiro_acesso', 'empresa_id', 'loja_id', 'permissoes'],
      include: [
        { model: Store, as: 'loja' },
        { model: Company }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    await user.update({ ultimo_acesso: new Date() });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        primeiro_acesso: user.primeiro_acesso,
        empresa_id: user.empresa_id,
        loja_id: user.loja_id,
        loja: user.loja,
        Company: user.Company,
        permissoes: user.permissoes
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/definir-senha', verifyToken, async (req, res) => {
  try {
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await req.user.update({ senha: senhaHash, primeiro_acesso: false });

    res.json({ message: 'Senha definida com sucesso' });
  } catch (error) {
    console.error('Erro ao definir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  res.json({
    id: req.user.id,
    nome: req.user.nome,
    email: req.user.email,
    perfil: req.user.perfil,
    primeiro_acesso: req.user.primeiro_acesso,
    empresa_id: req.user.empresa_id,
    loja_id: req.user.loja_id,
    loja: req.user.loja,
    Company: req.user.Company,
    permissoes: req.user.permissoes
  });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;
