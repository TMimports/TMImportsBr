import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    
    if (req.user?.role === 'ADMIN_GERAL' || req.user?.role === 'ADMIN_REDE') {
    } else if (req.user?.lojaId) {
      where.OR = [
        { lojaId: req.user.lojaId },
        { lojaId: null, createdBy: null }
      ];
    } else if (req.user?.grupoId) {
      const lojasDoGrupo = await prisma.loja.findMany({
        where: { grupoId: req.user.grupoId },
        select: { id: true }
      });
      const lojaIds = lojasDoGrupo.map(l => l.id);
      where.OR = [
        { lojaId: { in: lojaIds } },
        { lojaId: null, createdBy: null }
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome: 'asc' }
    });

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/buscar-cep/:cep', async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido' });
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado' });
    }

    res.json({
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    });
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    res.status(500).json({ error: 'Erro ao buscar CEP' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(req.params.id) },
      include: { vendas: true, ordensServico: true, loja: true }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const userRole = req.user?.role;
    if (userRole !== 'ADMIN_GERAL' && userRole !== 'ADMIN_REDE') {
      const userGrupoId = req.user?.grupoId;
      if (cliente.loja && cliente.loja.grupoId !== userGrupoId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { nome, cpfCnpj, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, lojaId: lojaIdBody } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    if (!cep) {
      return res.status(400).json({ error: 'CEP é obrigatório' });
    }

    let lojaId = req.user!.lojaId;
    if (!lojaId && lojaIdBody && req.user!.grupoId) {
      const lojaValida = await prisma.loja.findFirst({
        where: { id: parseInt(lojaIdBody), grupoId: req.user!.grupoId, ativo: true }
      });
      if (lojaValida) lojaId = lojaValida.id;
    }
    if (!lojaId && req.user!.grupoId) {
      const primeiraLoja = await prisma.loja.findFirst({
        where: { grupoId: req.user!.grupoId, ativo: true },
        select: { id: true }
      });
      if (primeiraLoja) lojaId = primeiraLoja.id;
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        cpfCnpj,
        telefone,
        email,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        lojaId,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { nome, cpfCnpj, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body;

    const cliente = await prisma.cliente.update({
      where: { id: Number(req.params.id) },
      data: { nome, cpfCnpj, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado }
    });

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const clienteId = Number(req.params.id);

    const [vendasCount, osCount] = await Promise.all([
      prisma.venda.count({ where: { clienteId } }),
      prisma.ordemServico.count({ where: { clienteId } }),
    ]);

    if (vendasCount > 0 || osCount > 0) {
      const refs: string[] = [];
      if (vendasCount > 0) refs.push(`${vendasCount} venda(s)`);
      if (osCount > 0) refs.push(`${osCount} ordem(ns) de serviço`);
      return res.status(400).json({
        error: `Não é possível excluir este cliente pois ele possui ${refs.join(' e ')} vinculada(s).`
      });
    }

    await prisma.cliente.delete({
      where: { id: clienteId }
    });

    res.json({ message: 'Cliente excluído' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
