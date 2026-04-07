import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { verifyToken, requireAdminRede, requireGestorUsuarios, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.grupoId = filter.grupoId;

    const usuarios = await prisma.user.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        grupoId: true,
        lojaId: true,
        cpf: true,
        telefone: true,
        banco: true,
        agencia: true,
        conta: true,
        tipoConta: true,
        chavePix: true,
        loja: { select: { id: true, nomeFantasia: true } },
        grupo: { select: { id: true, nome: true } },
        createdAt: true
      },
      orderBy: { nome: 'asc' }
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        grupoId: true,
        lojaId: true,
        loja: true,
        grupo: true,
        createdAt: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireGestorUsuarios, async (req: AuthRequest, res) => {
  try {
    const { nome, email, senha, role, grupoId, lojaId, cpf, telefone, banco, agencia, conta, tipoConta, chavePix } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ error: 'Nome, email, senha e perfil são obrigatórios' });
    }

    if (senha.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres' });
    }

    const rolesPermitidosDonoLoja = ['VENDEDOR', 'GERENTE_LOJA', 'TECNICO'];
    if (req.user!.role === 'DONO_LOJA') {
      if (!rolesPermitidosDonoLoja.includes(role)) {
        return res.status(403).json({ error: 'Voce so pode cadastrar Vendedor, Gerente ou Tecnico' });
      }
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const finalGrupoId = req.user!.role === 'DONO_LOJA' ? req.user!.grupoId : (grupoId ? Number(grupoId) : null);

    const usuario = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role,
        ativo: true,
        grupoId: finalGrupoId,
        lojaId: lojaId ? Number(lojaId) : null,
        cpf: cpf || null,
        telefone: telefone || null,
        banco: banco || null,
        agencia: agencia || null,
        conta: conta || null,
        tipoConta: tipoConta || null,
        chavePix: chavePix || null,
        mustChangePassword: true,
        createdBy: req.user!.id
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        grupoId: true,
        lojaId: true
      }
    });

    res.status(201).json(usuario);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireGestorUsuarios, async (req: AuthRequest, res) => {
  try {
    const { nome, email, senha, role, ativo, grupoId, lojaId, cpf, telefone, banco, agencia, conta, tipoConta, chavePix } = req.body;

    const rolesPermitidosDonoLoja = ['VENDEDOR', 'GERENTE_LOJA', 'TECNICO'];
    if (req.user!.role === 'DONO_LOJA' && role && !rolesPermitidosDonoLoja.includes(role)) {
      return res.status(403).json({ error: 'Voce so pode editar Vendedor, Gerente ou Tecnico' });
    }

    const data: any = { 
      nome, 
      email, 
      role, 
      ativo, 
      grupoId, 
      lojaId,
      cpf: cpf || null,
      telefone: telefone || null,
      banco: banco || null,
      agencia: agencia || null,
      conta: conta || null,
      tipoConta: tipoConta || null,
      chavePix: chavePix || null
    };

    if (senha) {
      if (senha.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres' });
      }
      data.senha = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        grupoId: true,
        lojaId: true,
        cpf: true,
        telefone: true,
        banco: true,
        agencia: true,
        conta: true,
        tipoConta: true,
        chavePix: true
      }
    });

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', requireGestorUsuarios, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.id);

    const vendasCount = await prisma.venda.count({ where: { vendedorId: userId } });
    if (vendasCount > 0) {
      return res.status(400).json({ error: `Nao e possivel excluir. Este usuario possui ${vendasCount} venda(s) registrada(s).` });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir usuario:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Nao e possivel excluir. Existem registros vinculados a este usuario.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
