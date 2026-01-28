import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { generateToken, verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log('Tentativa de login:', { email, senhaLength: senha?.length });

    if (!email || !senha) {
      console.log('Login falhou: campos vazios');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { loja: true, grupo: true }
    });

    console.log('Usuário encontrado:', user ? { id: user.id, email: user.email, ativo: user.ativo } : 'Não');

    if (!user || !user.ativo) {
      console.log('Login falhou: usuário não encontrado ou inativo');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    console.log('Senha válida:', senhaValida);
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

router.get('/setup-admin', async (req, res) => {
  try {
    const senhaHash = await bcrypt.hash('123456', 10);
    
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN_GERAL' }
    });
    
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          nome: 'Admin Geral',
          email: 'admin@teclemotos.com',
          senha: senhaHash,
          role: 'ADMIN_GERAL',
          ativo: true
        }
      });
      res.json({ success: true, message: 'Admin criado com sucesso', email: admin.email });
    } else {
      await prisma.user.update({
        where: { id: admin.id },
        data: { senha: senhaHash }
      });
      res.json({ success: true, message: 'Senha do admin resetada para 123456', email: admin.email });
    }
  } catch (error) {
    console.error('Erro ao setup admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint temporário para limpar banco de dados (remover após uso)
router.post('/reset-sistema', async (req, res) => {
  try {
    const { chave } = req.body;
    
    if (chave !== 'LIMPAR_SISTEMA_2026') {
      return res.status(403).json({ error: 'Chave incorreta' });
    }

    // Limpar todos os dados transacionais
    await prisma.garantia.deleteMany({});
    await prisma.revisao.deleteMany({});
    await prisma.comissao.deleteMany({});
    await prisma.caixa.deleteMany({});
    await prisma.contaReceber.deleteMany({});
    await prisma.contaPagar.deleteMany({});
    await prisma.itemVenda.deleteMany({});
    await prisma.venda.deleteMany({});
    await prisma.itemOS.deleteMany({});
    await prisma.ordemServico.deleteMany({});
    await prisma.unidadeFisica.deleteMany({});
    await prisma.estoque.deleteMany({});
    await prisma.transferencia.deleteMany({});
    await prisma.produto.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.logAuditoria.deleteMany({});

    // Manter serviços - deletar e recriar
    await prisma.servico.deleteMany({});
    await prisma.servico.createMany({
      data: [
        { nome: 'Revisao Geral', preco: 150, duracao: 60, ativo: true },
        { nome: 'Troca de Oleo', preco: 80, duracao: 30, ativo: true },
        { nome: 'Alinhamento', preco: 60, duracao: 30, ativo: true },
        { nome: 'Balanceamento', preco: 50, duracao: 20, ativo: true },
        { nome: 'Manutencao de Freios', preco: 120, duracao: 45, ativo: true },
        { nome: 'Reparo de Suspensao', preco: 200, duracao: 90, ativo: true },
        { nome: 'Servico Eletrico', preco: 180, duracao: 60, ativo: true },
        { nome: 'Diagnostico Completo', preco: 100, duracao: 45, ativo: true },
        { nome: 'Troca de Bateria', preco: 250, duracao: 30, ativo: true },
        { nome: 'Reparo de Motor', preco: 500, duracao: 180, ativo: true },
        { nome: 'Reparo de Modulo', preco: 400, duracao: 120, ativo: true },
        { nome: 'Instalacao de Acessorios', preco: 80, duracao: 45, ativo: true }
      ]
    });

    res.json({ 
      success: true, 
      message: 'Sistema limpo com sucesso! Pronto para primeiro uso.' 
    });
  } catch (error) {
    console.error('Erro ao resetar sistema:', error);
    res.status(500).json({ error: 'Erro ao resetar sistema' });
  }
});

export default router;
