import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

function gerarSenhaTemporaria(tamanho: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  if (!req.user || !['ADMIN_GERAL', 'ADMIN_REDE'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem cadastrar franqueados.' });
  }
  next();
};

router.post('/', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { nome, email, cnpj, razaoSocial, nomeFantasia, endereco, telefone, emailLoja } = req.body;

    if (!nome || !email || !cnpj || !razaoSocial) {
      return res.status(400).json({ error: 'Nome, email, CNPJ e razao social sao obrigatorios' });
    }

    const emailExistente = await prisma.user.findUnique({ where: { email } });
    if (emailExistente) {
      return res.status(400).json({ error: 'Email ja cadastrado no sistema' });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const lojaExistente = await prisma.loja.findUnique({ where: { cnpj: cnpjLimpo } });
    if (lojaExistente) {
      return res.status(400).json({ error: 'CNPJ ja cadastrado no sistema' });
    }

    let grupo = await prisma.grupo.findFirst({ orderBy: { id: 'asc' } });
    if (!grupo) {
      grupo = await prisma.grupo.create({
        data: { nome: 'Tecle Motos' }
      });
    }

    const loja = await prisma.loja.create({
      data: {
        cnpj: cnpjLimpo,
        razaoSocial,
        nomeFantasia: nomeFantasia || razaoSocial,
        endereco: endereco || null,
        telefone: telefone || null,
        email: emailLoja || email,
        grupoId: grupo.id,
        ativo: true
      }
    });

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

    const usuario = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role: 'DONO_LOJA',
        grupoId: grupo.id,
        lojaId: loja.id,
        mustChangePassword: true,
        ativo: true,
        createdBy: req.user?.id
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        loja: {
          select: {
            id: true,
            nomeFantasia: true,
            cnpj: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      usuario,
      senhaTemporaria,
      mensagem: 'Franqueado criado com sucesso. A senha temporaria deve ser alterada no primeiro login.'
    });
  } catch (error: any) {
    console.error('Erro ao criar franqueado:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const franqueados = await prisma.user.findMany({
      where: { role: 'DONO_LOJA' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        mustChangePassword: true,
        createdAt: true,
        loja: {
          select: {
            id: true,
            nomeFantasia: true,
            cnpj: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(franqueados);
  } catch (error: any) {
    console.error('Erro ao listar franqueados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
