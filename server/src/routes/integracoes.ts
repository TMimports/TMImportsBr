/**
 * Endpoints de integração externa — Fase Beta
 * Integração com n8n + Claude (análise enriquecida).
 *
 * Payload completo (POST /api/integracoes/leads-test):
 * {
 *   "nome": "João Silva",
 *   "telefone": "21999999999",
 *   "email": "joao@email.com",
 *   "origem": "META",
 *   "campanha": "Campanha TM Recreio",
 *   "interesse": "MOTO",
 *   "mensagem": "Tenho interesse em moto elétrica",
 *   "prioridade": "ALTA",
 *   "interesseCorrigido": "MOTO",
 *   "resumo": "Lead com alto interesse em moto elétrica...",
 *   "proximaAcao": "Ligar às 10h amanhã e enviar catálogo",
 *   "mensagemWhatsApp": "Olá João! Vi que você tem interesse..."
 * }
 *
 * Header obrigatório: x-integration-token: <INTEGRATION_TOKEN>
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';

const router = Router();

const INTEGRATION_TOKEN = process.env.INTEGRATION_TOKEN || 'crm_test_token_2024';

const ORIGENS_VALIDAS    = ['META', 'GOOGLE', 'SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO', 'TESTE'];
const INTERESSES_VALIDOS = ['MOTO', 'PECA', 'SERVICO', 'CURSO', 'OUTRO'];
const PRIORIDADES_VALIDAS = ['BAIXA', 'MEDIA', 'ALTA'];

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
      // ── Campos da análise Claude ─────────────────────────────────
      prioridade,
      interesseCorrigido,
      resumo,
      proximaAcao,
      mensagemWhatsApp,
      // ────────────────────────────────────────────────────────────
      lojaId,
    } = req.body;

    if (!nome?.trim()) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }

    // ── Normalizar campos com fallbacks ──────────────────────────────────────
    const origemFinal: any = ORIGENS_VALIDAS.includes(String(origem).toUpperCase())
      ? String(origem).toUpperCase()
      : 'OUTRO';

    const interesseFinal: any = INTERESSES_VALIDOS.includes(String(interesse).toUpperCase())
      ? String(interesse).toUpperCase()
      : 'MOTO';

    // Regra 1: se prioridade vier vazia/inválida, usar MEDIA
    const prioridadeFinal: any = prioridade && PRIORIDADES_VALIDAS.includes(String(prioridade).toUpperCase())
      ? String(prioridade).toUpperCase()
      : 'MEDIA';

    // Regra 2: se interesseCorrigido vier vazio, usar interesse original
    const interesseCorrigidoFinal: string | null = interesseCorrigido?.trim()
      ? interesseCorrigido.trim()
      : null;

    // Regra 3: resumo prefere campo `resumo` da Claude, fallback para mensagem original
    const resumoFinal: string | null = resumo?.trim() || mensagem?.trim() || null;

    const lead = await prisma.lead.create({
      data: {
        nome:               nome.trim(),
        telefone:           telefone?.trim() || null,
        email:              email?.trim() || null,
        origem:             origemFinal,
        campanha:           campanha?.trim() || null,
        interesse:          interesseFinal,
        interesseCorrigido: interesseCorrigidoFinal,
        lojaId:             lojaId ? Number(lojaId) : null,
        status:             'NOVO',
        prioridade:         prioridadeFinal,
        resumo:             resumoFinal,
        proximaAcao:        proximaAcao?.trim() || null,
        mensagemWhatsApp:   mensagemWhatsApp?.trim() || null,
        observacoes:        `Lead recebido via integração n8n/Claude. Origem: ${origemFinal}`,
      },
    });

    // Registrar interação de entrada com detalhes do processamento Claude
    const interacaoDesc = [
      `Lead recebido via integração n8n (análise Claude).`,
      mensagem?.trim() ? `Mensagem original: "${mensagem.trim()}"` : null,
      resumo?.trim() ? `Resumo Claude: "${resumo.trim()}"` : null,
      proximaAcao?.trim() ? `Próxima ação sugerida: "${proximaAcao.trim()}"` : null,
    ].filter(Boolean).join('\n');

    await prisma.leadInteracao.create({
      data: {
        leadId:    lead.id,
        usuarioId: 1,
        tipo:      'OBSERVACAO',
        descricao: interacaoDesc,
      },
    });

    console.log(`[INTEGRAÇÃO] Lead recebido: ${lead.nome} (id=${lead.id}) origem=${lead.origem} prioridade=${lead.prioridade}`);

    res.status(201).json({
      sucesso: true,
      leadId:   lead.id,
      mensagem: 'Lead recebido e registrado no CRM com análise Claude.',
      campos:   {
        prioridade:         prioridadeFinal,
        interesseCorrigido: interesseCorrigidoFinal,
        resumo:             resumoFinal ? 'salvo' : 'vazio',
        proximaAcao:        proximaAcao?.trim() ? 'salvo' : 'vazio',
        mensagemWhatsApp:   mensagemWhatsApp?.trim() ? 'salvo' : 'vazio',
      },
    });
  } catch (err) {
    console.error('[INTEGRAÇÃO] leads-test:', err);
    res.status(500).json({ error: 'Erro ao processar lead externo.' });
  }
});

export default router;
