import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

// Listar interações (por clienteId ou fornecedorId)
router.get('/interacoes', async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.fornecedorId) where.fornecedorId = Number(req.query.fornecedorId);

    const interacoes = await prisma.interacaoCRM.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(interacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/interacoes', async (req: AuthRequest, res) => {
  try {
    const { clienteId, fornecedorId, tipo, titulo, descricao, resultado, proximoContato } = req.body;
    if (!tipo) return res.status(400).json({ error: 'Tipo de interação obrigatório' });
    if (!titulo) return res.status(400).json({ error: 'Título obrigatório' });
    if (!clienteId && !fornecedorId) return res.status(400).json({ error: 'Informe clienteId ou fornecedorId' });

    const interacao = await prisma.interacaoCRM.create({
      data: {
        tipo,
        titulo,
        descricao,
        resultado,
        proximoContato: proximoContato ? new Date(proximoContato) : null,
        clienteId: clienteId ? Number(clienteId) : null,
        fornecedorId: fornecedorId ? Number(fornecedorId) : null,
        usuarioId: req.user!.id,
      },
      include: {
        usuario: { select: { id: true, nome: true } },
      },
    });
    res.status(201).json(interacao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/interacoes/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { tipo, titulo, descricao, resultado, proximoContato } = req.body;
    const interacao = await prisma.interacaoCRM.update({
      where: { id },
      data: {
        tipo,
        titulo,
        descricao,
        resultado,
        proximoContato: proximoContato ? new Date(proximoContato) : null,
      },
    });
    res.json(interacao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/interacoes/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.interacaoCRM.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Resumo de follow-ups pendentes
router.get('/follow-ups', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const interacoes = await prisma.interacaoCRM.findMany({
      where: {
        proximoContato: { lte: hoje },
        tipo: 'FOLLOW_UP',
      },
      include: {
        usuario: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
        fornecedor: { select: { id: true, razaoSocial: true } },
      },
      orderBy: { proximoContato: 'asc' },
    });
    res.json(interacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
