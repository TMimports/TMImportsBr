import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/caixa', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const movimentos = await prisma.caixa.findMany({
      where,
      include: { loja: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(movimentos);
  } catch (error) {
    console.error('Erro ao listar caixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const contas = await prisma.contaPagar.findMany({
      where,
      include: { loja: true },
      orderBy: { vencimento: 'asc' }
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/contas-pagar/alertas', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);

    const where: any = { pago: false };
    if (filter.lojaId) where.lojaId = filter.lojaId;
    if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 5);

    where.vencimento = { lte: limite };

    const contas = await prisma.contaPagar.findMany({
      where,
      include: { loja: true },
      orderBy: { vencimento: 'asc' }
    });

    res.json(contas);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/contas-pagar', async (req: AuthRequest, res) => {
  try {
    const { lojaId, categoria, descricao, valor, vencimento, recorrente } = req.body;

    if (!lojaId || !categoria || !valor || !vencimento) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const conta = await prisma.contaPagar.create({
      data: {
        lojaId: Number(lojaId),
        categoria,
        descricao,
        valor: Number(valor),
        vencimento: new Date(vencimento),
        recorrente: recorrente || false,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(conta);
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/contas-pagar/:id/pagar', async (req: AuthRequest, res) => {
  try {
    const conta = await prisma.contaPagar.update({
      where: { id: Number(req.params.id) },
      data: { pago: true, dataPago: new Date() }
    });

    await prisma.caixa.create({
      data: {
        lojaId: conta.lojaId,
        tipo: 'saida',
        descricao: `${conta.categoria}: ${conta.descricao}`,
        valor: conta.valor,
        referencia: `conta_${conta.id}`
      }
    });

    res.json(conta);
  } catch (error) {
    console.error('Erro ao pagar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
