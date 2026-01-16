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
    const { cnpj, razaoSocial, nomeFantasia, endereco, telefone, email, grupoId: grupoIdParam } = req.body;

    if (!cnpj || !razaoSocial) {
      return res.status(400).json({ error: 'CNPJ e razão social são obrigatórios' });
    }

    if (!grupoIdParam) {
      return res.status(400).json({ error: 'Grupo é obrigatório' });
    }

    const grupoExiste = await prisma.grupo.findUnique({ where: { id: Number(grupoIdParam) } });
    if (!grupoExiste) {
      return res.status(400).json({ error: 'Grupo não encontrado' });
    }

    const loja = await prisma.loja.create({
      data: {
        cnpj: cnpj.replace(/\D/g, ''),
        razaoSocial,
        nomeFantasia,
        endereco,
        telefone,
        email,
        grupoId: Number(grupoIdParam)
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

router.delete('/:id', requireAdminRede, async (req, res) => {
  try {
    const lojaId = Number(req.params.id);

    const usuariosCount = await prisma.user.count({ where: { lojaId } });
    if (usuariosCount > 0) {
      return res.status(400).json({ error: `Nao e possivel excluir. Existem ${usuariosCount} usuario(s) vinculado(s) a esta loja.` });
    }

    const unidadesCount = await prisma.unidadeFisica.count({ where: { lojaId } });
    if (unidadesCount > 0) {
      return res.status(400).json({ error: `Nao e possivel excluir. Existem ${unidadesCount} unidade(s) vinculada(s) a esta loja.` });
    }

    await prisma.loja.delete({ where: { id: lojaId } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir loja:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Nao e possivel excluir. Existem registros vinculados a esta loja.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
