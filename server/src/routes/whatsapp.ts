import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';
import { criarDisparo, marcarEnviado, gerarDisparosMotivacioanis, TEMPLATES_PADRAO } from '../services/whatsapp.js';
import { zapiVerificarStatus, zapiEnviarMensagem } from '../services/zapi.js';

const router = Router();
router.use(verifyToken);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function limparNumero(tel: string): string {
  const d = tel.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  return `55${d}`;
}

function gerarLink(numero: string, mensagem: string): string {
  return `https://wa.me/${limparNumero(numero)}?text=${encodeURIComponent(mensagem)}`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

router.get('/templates', async (_req, res) => {
  try {
    const templates = await prisma.templateWhatsApp.findMany({ orderBy: { contexto: 'asc' } });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/templates', async (req: AuthRequest, res) => {
  try {
    const { nome, contexto, mensagem } = req.body;
    if (!nome || !contexto || !mensagem) return res.status(400).json({ error: 'nome, contexto e mensagem são obrigatórios' });
    const t = await prisma.templateWhatsApp.create({ data: { nome, contexto, mensagem } });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/templates/:id', async (req: AuthRequest, res) => {
  try {
    const { nome, contexto, mensagem, ativo } = req.body;
    const t = await prisma.templateWhatsApp.update({
      where: { id: Number(req.params.id) },
      data: { nome, contexto, mensagem, ativo },
    });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/templates/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.templateWhatsApp.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Seed templates padrão
router.post('/templates/seed', async (req: AuthRequest, res) => {
  try {
    const existentes = await prisma.templateWhatsApp.count();
    if (existentes > 0) return res.json({ ok: true, msg: 'Templates já existem', count: existentes });
    await prisma.templateWhatsApp.createMany({ data: TEMPLATES_PADRAO });
    res.json({ ok: true, msg: `${TEMPLATES_PADRAO.length} templates criados` });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Disparos ─────────────────────────────────────────────────────────────────

router.get('/disparos', async (req: AuthRequest, res) => {
  try {
    const { contexto, status, page = '1', limit = '30' } = req.query;
    const where: any = {};
    if (contexto) where.contexto = contexto;
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [disparos, total] = await Promise.all([
      prisma.disparoWhatsApp.findMany({
        where,
        include: {
          template: { select: { nome: true } },
          operador: { select: { nome: true } },
          cliente: { select: { nome: true } },
          fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
          destinatarioUser: { select: { nome: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.disparoWhatsApp.count({ where }),
    ]);

    res.json({ disparos, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Disparo único com geração de link wa.me
router.post('/disparar', async (req: AuthRequest, res) => {
  try {
    const {
      destinatario, numero, mensagem, contexto,
      templateId, clienteId, fornecedorId, destinatarioUserId
    } = req.body;

    if (!destinatario || !numero || !mensagem) {
      return res.status(400).json({ error: 'destinatario, numero e mensagem são obrigatórios' });
    }

    const { disparo, link } = await criarDisparo({
      destinatario,
      numero,
      mensagem,
      contexto,
      templateId: templateId ? Number(templateId) : undefined,
      operadorId: req.user!.id,
      clienteId: clienteId ? Number(clienteId) : undefined,
      fornecedorId: fornecedorId ? Number(fornecedorId) : undefined,
      destinatarioUserId: destinatarioUserId ? Number(destinatarioUserId) : undefined,
      tipo: 'MANUAL',
    });

    res.json({ disparo, link });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Marcar como enviado
router.patch('/disparos/:id/enviado', async (req: AuthRequest, res) => {
  try {
    const d = await marcarEnviado(Number(req.params.id));
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Disparo em massa para múltiplos números
router.post('/disparar/bulk', async (req: AuthRequest, res) => {
  try {
    const { destinatarios, mensagem, contexto, templateId } = req.body;
    // destinatarios: Array<{ nome: string; numero: string; clienteId?: number; fornecedorId?: number; usuarioId?: number }>

    if (!destinatarios?.length || !mensagem) {
      return res.status(400).json({ error: 'destinatarios e mensagem são obrigatórios' });
    }

    const results: { nome: string; link: string; disparoId: number }[] = [];

    for (const dest of destinatarios) {
      if (!dest.numero) continue;
      const { disparo, link } = await criarDisparo({
        destinatario: dest.nome,
        numero: dest.numero,
        mensagem: mensagem.replace(/\{\{nome\}\}/g, dest.nome.split(' ')[0]),
        contexto,
        templateId: templateId ? Number(templateId) : undefined,
        operadorId: req.user!.id,
        clienteId: dest.clienteId,
        fornecedorId: dest.fornecedorId,
        destinatarioUserId: dest.usuarioId,
        tipo: 'MANUAL',
      });
      results.push({ nome: dest.nome, link, disparoId: disparo.id });
    }

    res.json({ total: results.length, results });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Link rápido sem salvar no banco (para botão rápido na UI)
router.post('/link-rapido', async (req: AuthRequest, res) => {
  try {
    const { numero, mensagem } = req.body;
    if (!numero || !mensagem) return res.status(400).json({ error: 'numero e mensagem são obrigatórios' });
    res.json({ link: gerarLink(numero, mensagem) });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Disparo motivacional manual (ADMIN_GERAL pode disparar)
router.post('/disparar/motivacional', async (req: AuthRequest, res) => {
  try {
    const resultado = await gerarDisparosMotivacioanis();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── Z-API Status ─────────────────────────────────────────────────────────────

router.get('/zapi/status', async (_req, res) => {
  try {
    const status = await zapiVerificarStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Reenvio imediato de um disparo via Z-API
router.post('/disparos/:id/reenviar', async (req: AuthRequest, res) => {
  try {
    const disparo = await prisma.disparoWhatsApp.findUnique({ where: { id: Number(req.params.id) } });
    if (!disparo) return res.status(404).json({ error: 'Disparo não encontrado' });

    const result = await zapiEnviarMensagem(disparo.numero, disparo.mensagem);
    if (result.success) {
      await prisma.disparoWhatsApp.update({
        where: { id: disparo.id },
        data: { status: 'ENVIADO', enviadoAt: new Date() },
      });
    }
    res.json({ success: result.success, messageId: result.messageId, error: result.error });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reenviar' });
  }
});

// ─── Estatísticas rápidas ──────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [total, enviados, pendentes, hoje_count] = await Promise.all([
      prisma.disparoWhatsApp.count(),
      prisma.disparoWhatsApp.count({ where: { status: 'ENVIADO' } }),
      prisma.disparoWhatsApp.count({ where: { status: 'PENDENTE' } }),
      prisma.disparoWhatsApp.count({ where: { createdAt: { gte: hoje } } }),
    ]);

    res.json({ total, enviados, pendentes, hoje: hoje_count });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Vendedores com telefone (para disparo motivacional)
router.get('/vendedores', async (_req, res) => {
  try {
    const vendedores = await prisma.user.findMany({
      where: { role: 'VENDEDOR', ativo: true },
      select: { id: true, nome: true, telefone: true, loja: { select: { nomeFantasia: true } } },
    });
    res.json(vendedores);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
