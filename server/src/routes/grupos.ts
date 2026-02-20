import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { verifyToken, requireAdminRede, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(requireAdminRede);

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const grupos = await prisma.grupo.findMany({
      include: { 
        lojas: { select: { id: true, nomeFantasia: true } }, 
        _count: { select: { usuarios: true, lojas: true } } 
      },
      orderBy: { nome: 'asc' }
    });
    res.json(grupos);
  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const grupo = await prisma.grupo.findUnique({
      where: { id: Number(req.params.id) },
      include: { lojas: true, usuarios: true }
    });

    if (!grupo) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    const userRole = req.user?.role;
    if (userRole !== 'ADMIN_GERAL' && userRole !== 'ADMIN_REDE') {
      if (grupo.id !== req.user?.grupoId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    res.json(grupo);
  } catch (error) {
    console.error('Erro ao buscar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome, nomeProprietario, emailProprietario } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }

    if (!nomeProprietario || !emailProprietario) {
      return res.status(400).json({ error: 'Dados do proprietário são obrigatórios' });
    }

    const emailExistente = await prisma.user.findUnique({
      where: { email: emailProprietario }
    });

    if (emailExistente) {
      return res.status(400).json({ error: 'Email já cadastrado no sistema' });
    }

    const senhaTemporaria = generateTempPassword();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

    const grupo = await prisma.grupo.create({
      data: { nome }
    });

    const usuario = await prisma.user.create({
      data: {
        nome: nomeProprietario,
        email: emailProprietario,
        senha: senhaHash,
        role: 'DONO_LOJA',
        mustChangePassword: true,
        grupoId: grupo.id,
        createdBy: req.user?.id
      },
      select: { id: true, nome: true, email: true }
    });

    res.status(201).json({ 
      grupo,
      senhaTemporaria,
      usuario
    });
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, ativo } = req.body;

    const grupo = await prisma.grupo.update({
      where: { id: Number(req.params.id) },
      data: { nome, ativo }
    });

    res.json(grupo);
  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.grupo.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: 'Grupo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
