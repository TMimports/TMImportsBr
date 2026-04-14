/**
 * Endpoints de integração externa — Fase Beta
 * Preparado para futura integração com n8n + Claude.
 * Não dispara automações reais nesta fase.
 *
 * Payload esperado (POST /api/integracoes/leads-test):
 * {
 *   "nome": "João Silva",
 *   "telefone": "21999999999",
 *   "email": "joao@email.com",
 *   "origem": "META",
 *   "campanha": "Campanha TM Recreio",
 *   "interesse": "MOTO",
 *   "mensagem": "Tenho interesse em moto elétrica",
 *   "lojaId": 1
 * }
 *
 * Header obrigatório: x-integration-token: <INTEGRATION_TOKEN>
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';

const router = Router();

const INTEGRATION_TOKEN = process.env.INTEGRATION_TOKEN || 'crm_test_token_2024';

const ORIGENS_VALIDAS = ['META', 'GOOGLE', 'SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO', 'TESTE'];
const INTERESSES_VALIDOS = ['MOTO', 'PECA', 'SERVICO', 'CURSO', 'OUTRO'];

// ── POST /api/integracoes/leads-test ─────────────────────────────────────────
router.post('/leads-test', async (req: Request, res: Response) => {
  try {
    // Verificar token de integração
    const token = req.headers['x-integration-token'];
    if (!token || token !== INTEGRATION_TOKEN) {
      return res.status(401).json({ error: 'Token de integração inválido ou ausente.' });
    }

    // Verificar flag de ambiente
    const betaAtivo = process.env.CRM_LEADS_BETA;
    if (betaAtivo !== undefined && betaAtivo !== 'true') {
      return res.status(503).json({ error: 'CRM Leads Beta desativado.' });
    }

    const {
      nome, telefone, email,
      origem = 'OUTRO', campanha,
      interesse = 'MOTO', mensagem,
      lojaId,
    } = req.body;

    if (!nome?.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }

    const origemFinal: any = ORIGENS_VALIDAS.includes(String(origem).toUpperCase())
      ? String(origem).toUpperCase()
      : 'OUTRO';

    const interesseFinal: any = INTERESSES_VALIDOS.includes(String(interesse).toUpperCase())
      ? String(interesse).toUpperCase()
      : 'MOTO';

    const lead = await prisma.lead.create({
      data: {
        nome:       nome.trim(),
        telefone:   telefone?.trim() || null,
        email:      email?.trim() || null,
        origem:     origemFinal,
        campanha:   campanha?.trim() || null,
        interesse:  interesseFinal,
        lojaId:     lojaId ? Number(lojaId) : null,
        status:     'NOVO',
        prioridade: 'MEDIA',
        resumo:     mensagem?.trim() || null,
        observacoes: `Lead recebido via integração externa (teste). Origem: ${origemFinal}`,
      },
    });

    // Registrar interação de entrada
    await prisma.leadInteracao.create({
      data: {
        leadId:    lead.id,
        usuarioId: 1, // admin system — sem contexto de usuário logado
        tipo:      'OBSERVACAO',
        descricao: `Lead recebido via endpoint de integração (teste). Mensagem original: "${mensagem || '—'}"`,
      },
    });

    console.log(`[INTEGRAÇÃO] Lead recebido: ${lead.nome} (id=${lead.id}) origem=${lead.origem}`);

    res.status(201).json({
      sucesso: true,
      leadId:  lead.id,
      mensagem: 'Lead recebido e registrado no CRM Beta.',
      aviso:   'MODO TESTE — Nenhuma automação foi disparada.',
    });
  } catch (err) {
    console.error('[INTEGRAÇÃO] leads-test:', err);
    res.status(500).json({ error: 'Erro ao processar lead externo.' });
  }
});

export default router;
