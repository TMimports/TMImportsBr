import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireAdminRede, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    
    const lojas = await prisma.loja.findMany({
      where: filter.grupoId ? { grupoId: filter.grupoId } : (filter.lojaId ? { id: filter.lojaId } : {}),
      include: { grupo: true, _count: { select: { usuarios: true } } },
      orderBy: { nomeFantasia: 'asc' }
    });

    res.json(lojas);
  } catch (error) {
    console.error('Erro ao listar lojas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/consultar-cnpj/:cnpj', requireAdminRede, async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, '');

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

    if (!response.ok) {
      return res.status(404).json({ error: 'CNPJ não encontrado' });
    }

    const data = await response.json();

    res.json({
      cnpj: data.cnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia,
      endereco: [
        data.descricao_tipo_logradouro,
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio,
        data.uf,
        data.cep
      ].filter(Boolean).join(', '),
      telefone: data.ddd_telefone_1,
      email: data.email
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    res.status(500).json({ error: 'Erro ao consultar CNPJ' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const loja = await prisma.loja.findUnique({
      where: { id: Number(req.params.id) },
      include: { grupo: true, usuarios: true }
    });

    if (!loja) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    res.json(loja);
  } catch (error) {
    console.error('Erro ao buscar loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', requireAdminRede, async (req: AuthRequest, res) => {
  try {
    const { cnpj, razaoSocial, nomeFantasia, endereco, telefone, email, grupoId } = req.body;

    if (!cnpj || !razaoSocial || !grupoId) {
      return res.status(400).json({ error: 'CNPJ, razão social e grupo são obrigatórios' });
    }

    const loja = await prisma.loja.create({
      data: {
        cnpj: cnpj.replace(/\D/g, ''),
        razaoSocial,
        nomeFantasia,
        endereco,
        telefone,
        email,
        grupoId: Number(grupoId)
      }
    });

    res.status(201).json(loja);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }
    console.error('Erro ao criar loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', requireAdminRede, async (req, res) => {
  try {
    const { razaoSocial, nomeFantasia, endereco, telefone, email, ativo, grupoId } = req.body;

    const loja = await prisma.loja.update({
      where: { id: Number(req.params.id) },
      data: { razaoSocial, nomeFantasia, endereco, telefone, email, ativo, grupoId }
    });

    res.json(loja);
  } catch (error) {
    console.error('Erro ao atualizar loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
