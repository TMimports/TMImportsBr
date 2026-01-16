import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { generateToken, verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { loja: true, grupo: true }
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      grupoId: user.grupoId,
      lojaId: user.lojaId
    });

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        grupoId: user.grupoId,
        lojaId: user.lojaId,
        loja: user.loja,
        grupo: user.grupo,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { loja: true, grupo: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      grupoId: user.grupoId,
      lojaId: user.lojaId,
      loja: user.loja,
      grupo: user.grupo,
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/trocar-senha', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
    }

    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'Nova senha e confirmacao nao conferem' });
    }

    if (novaSenha.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter no minimo 8 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        senha: novaSenhaHash,
        mustChangePassword: false
      }
    });

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao trocar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
