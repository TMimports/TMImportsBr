/**
 * Endpoints de integração externa — Fase Beta
 * Integração com n8n + Claude (análise enriquecida + atribuição automática por região).
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
 *   "mensagemWhatsApp": "Olá João! Vi que você tem interesse...",
 *   // ── Região (atribuição automática) ──────────────────────────────
 *   "regiaoCliente": "Recreio",
 *   "bairroCliente": "Recreio dos Bandeirantes",
 *   "cidadeCliente": "Rio de Janeiro",
 *   "ufCliente": "RJ",
 *   "lojaSugerida": "TM Recreio",
 *   "motivoLojaSugerida": "Cliente mora em Recreio dos Bandeirantes, cobertura da loja Recreio."
 * }
 *
 * Header obrigatório: x-integration-token: <INTEGRATION_TOKEN>
 *
 * Regra de atribuição automática:
 *  1. Se lojaId fornecido → usa diretamente.
 *  2. Se lojaSugerida fornecido → busca Loja por nomeFantasia (contém, case-insensitive).
 *  3. Se regiaoCliente → busca Loja por regiao (case-insensitive).
 *  4. Se bairroCliente → busca Loja onde bairrosAtendidos contém o bairro.
 *  5. Se cidadeCliente → busca Loja por cidade (case-insensitive).
 *  6. Se loja encontrada → rodízio entre VENDEDORs ativos (último atribuído = fim da fila).
 *  7. Se nenhuma loja → status NOVO + observação de espera por região.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';

const router = Router();

const INTEGRATION_TOKEN = process.env.INTEGRATION_TOKEN || 'crm_test_token_2024';

const ORIGENS_VALIDAS    = ['META', 'GOOGLE', 'SITE', 'WHATSAPP', 'INDICACAO', 'OUTRO', 'TESTE'];
const INTERESSES_VALIDOS = ['MOTO', 'PECA', 'SERVICO', 'CURSO', 'OUTRO'];
const PRIORIDADES_VALIDAS = ['BAIXA', 'MEDIA', 'ALTA'];

// ── Rodízio de vendedores ─────────────────────────────────────────────────────
// Retorna o vendedor ativo da loja que está há mais tempo sem receber um lead.
// Critério: ordena pelo dataRepasseVendedor (NULL = nunca recebeu = prioridade máxima).
async function escolherVendedorRodizio(lojaId: number): Promise<{ id: number; nome: string } | null> {
  const vendedores = await prisma.user.findMany({
    where: {
      lojaId,
      role:  { in: ['VENDEDOR', 'GERENTE_LOJA', 'DONO_LOJA'] },
      ativo: true,
    },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  if (vendedores.length === 0) return null;

  // Para cada vendedor, busca a data do lead mais recente atribuído a ele
  const ultimosRepasses = await Promise.all(
    vendedores.map(async v => {
      const ultimo = await prisma.lead.findFirst({
        where:   { vendedorId: v.id },
        orderBy: { dataRepasseVendedor: 'desc' },
        select:  { dataRepasseVendedor: true },
      });
      return { vendedor: v, ultimoRepasse: ultimo?.dataRepasseVendedor ?? null };
    })
  );

  // Ordena: null primeiro (nunca recebeu), depois o mais antigo
  ultimosRepasses.sort((a, b) => {
    if (!a.ultimoRepasse) return -1;
    if (!b.ultimoRepasse) return 1;
    return a.ultimoRepasse.getTime() - b.ultimoRepasse.getTime();
  });

  return ultimosRepasses[0].vendedor;
}

// ── Buscar loja compatível com os dados de região ─────────────────────────────
async function resolverLojaPorRegiao(params: {
  lojaId?: number | null;
  lojaSugerida?: string | null;
  regiaoCliente?: string | null;
  bairroCliente?: string | null;
  cidadeCliente?: string | null;
}): Promise<{ loja: { id: number; nomeFantasia: string | null } | null; metodo: string }> {
  const { lojaId, lojaSugerida, regiaoCliente, bairroCliente, cidadeCliente } = params;

  // Passo 1: lojaId explícito
  if (lojaId) {
    const loja = await prisma.loja.findUnique({
      where:  { id: Number(lojaId) },
      select: { id: true, nomeFantasia: true },
    });
    if (loja) return { loja, metodo: 'lojaId explícito fornecido pelo payload' };
  }

  // Passo 2: nome da loja sugerida pela Claude
  if (lojaSugerida?.trim()) {
    const loja = await prisma.loja.findFirst({
      where:  { nomeFantasia: { contains: lojaSugerida.trim(), mode: 'insensitive' } },
      select: { id: true, nomeFantasia: true },
    });
    if (loja) return { loja, metodo: `Loja sugerida pela Claude: "${lojaSugerida.trim()}"` };
  }

  // Passo 3: região do cliente → campo regiao da loja
  if (regiaoCliente?.trim()) {
    const loja = await prisma.loja.findFirst({
      where:  { regiao: { contains: regiaoCliente.trim(), mode: 'insensitive' }, ativo: true },
      select: { id: true, nomeFantasia: true },
    });
    if (loja) return { loja, metodo: `Região do cliente: "${regiaoCliente.trim()}"` };
  }

  // Passo 4: bairro → bairrosAtendidos da loja
  if (bairroCliente?.trim()) {
    const loja = await prisma.loja.findFirst({
      where:  { bairrosAtendidos: { contains: bairroCliente.trim(), mode: 'insensitive' }, ativo: true },
      select: { id: true, nomeFantasia: true },
    });
    if (loja) return { loja, metodo: `Bairro do cliente: "${bairroCliente.trim()}"` };
  }

  // Passo 5: cidade
  if (cidadeCliente?.trim()) {
    const loja = await prisma.loja.findFirst({
      where:  { cidade: { contains: cidadeCliente.trim(), mode: 'insensitive' }, ativo: true },
      select: { id: true, nomeFantasia: true },
    });
    if (loja) return { loja, metodo: `Cidade do cliente: "${cidadeCliente.trim()}"` };
  }

  return { loja: null, metodo: '' };
}

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
      // ── Região e atribuição ──────────────────────────────────────
      lojaId,
      regiaoCliente,
      bairroCliente,
      cidadeCliente,
      ufCliente,
      lojaSugerida,
      motivoLojaSugerida,
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

    const prioridadeFinal: any = prioridade && PRIORIDADES_VALIDAS.includes(String(prioridade).toUpperCase())
      ? String(prioridade).toUpperCase()
      : 'MEDIA';

    const interesseCorrigidoFinal: string | null = interesseCorrigido?.trim()
      ? interesseCorrigido.trim()
      : null;

    const resumoFinal: string | null = resumo?.trim() || mensagem?.trim() || null;

    // ── Resolver loja e vendedor por região ──────────────────────────────────
    const { loja: lojaResolvida, metodo: metodoResolucao } = await resolverLojaPorRegiao({
      lojaId,
      lojaSugerida:  lojaSugerida?.trim()  || null,
      regiaoCliente: regiaoCliente?.trim() || null,
      bairroCliente: bairroCliente?.trim() || null,
      cidadeCliente: cidadeCliente?.trim() || null,
    });

    let vendedorAtribuido: { id: number; nome: string } | null = null;
    let statusFinal: any = 'NOVO';
    let observacoesFinal: string;

    if (lojaResolvida) {
      vendedorAtribuido = await escolherVendedorRodizio(lojaResolvida.id);
      if (vendedorAtribuido) {
        statusFinal = 'EM_ATENDIMENTO';
        observacoesFinal = `Lead recebido via integração n8n/Claude. Origem: ${origemFinal}. Atribuído automaticamente para ${vendedorAtribuido.nome} (${lojaResolvida.nomeFantasia ?? lojaResolvida.id}). Método: ${metodoResolucao}.`;
      } else {
        observacoesFinal = `Lead recebido via integração n8n/Claude. Origem: ${origemFinal}. Loja identificada (${lojaResolvida.nomeFantasia ?? lojaResolvida.id}), mas sem vendedores ativos disponíveis. Lead aguardando atribuição manual.`;
      }
    } else {
      const temDadosRegiao = regiaoCliente || bairroCliente || cidadeCliente || lojaSugerida;
      if (temDadosRegiao) {
        observacoesFinal = `Lead recebido via integração n8n/Claude. Origem: ${origemFinal}. Região informada não corresponde a nenhuma loja cadastrada. Lead aguardando definição de região para atribuição automática.`;
      } else {
        observacoesFinal = `Lead recebido via integração n8n/Claude. Origem: ${origemFinal}. Sem dados de região. Lead aguardando definição de região para atribuição automática.`;
      }
    }

    // ── Criar lead ────────────────────────────────────────────────────────────
    const lead = await prisma.lead.create({
      data: {
        nome:               nome.trim(),
        telefone:           telefone?.trim() || null,
        email:              email?.trim() || null,
        origem:             origemFinal,
        campanha:           campanha?.trim() || null,
        interesse:          interesseFinal,
        interesseCorrigido: interesseCorrigidoFinal,
        lojaId:             lojaResolvida ? lojaResolvida.id : (lojaId ? Number(lojaId) : null),
        vendedorId:         vendedorAtribuido ? vendedorAtribuido.id : null,
        repassadoPorId:     vendedorAtribuido ? 1 : null,
        dataRepasseVendedor: vendedorAtribuido ? new Date() : null,
        status:             statusFinal,
        prioridade:         prioridadeFinal,
        resumo:             resumoFinal,
        proximaAcao:        proximaAcao?.trim() || null,
        mensagemWhatsApp:   mensagemWhatsApp?.trim() || null,
        observacoes:        observacoesFinal,
        regiaoCliente:      regiaoCliente?.trim() || null,
        bairroCliente:      bairroCliente?.trim() || null,
        cidadeCliente:      cidadeCliente?.trim() || null,
        ufCliente:          ufCliente?.trim() || null,
        lojaSugerida:       lojaSugerida?.trim() || null,
        motivoLojaSugerida: motivoLojaSugerida?.trim() || null,
      },
    });

    // ── Registrar interação de entrada ────────────────────────────────────────
    const interacaoDesc = [
      `🤖 Lead recebido via integração n8n (análise Claude).`,
      mensagem?.trim()       ? `Mensagem original: "${mensagem.trim()}"` : null,
      resumo?.trim()         ? `Resumo Claude: "${resumo.trim()}"` : null,
      proximaAcao?.trim()    ? `Próxima ação sugerida: "${proximaAcao.trim()}"` : null,
      regiaoCliente?.trim()  ? `Região do cliente: ${regiaoCliente.trim()}` : null,
      bairroCliente?.trim()  ? `Bairro: ${bairroCliente.trim()}` : null,
      lojaSugerida?.trim()   ? `Loja sugerida: ${lojaSugerida.trim()}` : null,
      motivoLojaSugerida?.trim() ? `Motivo: ${motivoLojaSugerida.trim()}` : null,
    ].filter(Boolean).join('\n');

    await prisma.leadInteracao.create({
      data: {
        leadId:    lead.id,
        usuarioId: 1,
        tipo:      'OBSERVACAO',
        descricao: interacaoDesc,
      },
    });

    // Interação de atribuição automática (se aconteceu)
    if (vendedorAtribuido && lojaResolvida) {
      await prisma.leadInteracao.create({
        data: {
          leadId:    lead.id,
          usuarioId: 1,
          tipo:      'OBSERVACAO',
          descricao: `🤖 Atribuição automática: lead direcionado para ${vendedorAtribuido.nome} (${lojaResolvida.nomeFantasia ?? 'loja #' + lojaResolvida.id}) via rodízio. Método de identificação: ${metodoResolucao}.`,
        },
      });
    }

    console.log(
      `[INTEGRAÇÃO] Lead recebido: ${lead.nome} (id=${lead.id}) origem=${lead.origem} prioridade=${lead.prioridade}` +
      (vendedorAtribuido ? ` → atribuído para ${vendedorAtribuido.nome}` : ' → sem atribuição (sem região/loja)')
    );

    let mensagemFinal: string;
    if (vendedorAtribuido && lojaResolvida) {
      mensagemFinal = `Lead recebido e atribuído automaticamente para ${vendedorAtribuido.nome} (${lojaResolvida.nomeFantasia}).`;
    } else if (lojaResolvida) {
      mensagemFinal = `Lead recebido. Loja identificada: ${lojaResolvida.nomeFantasia}. Sem vendedores ativos disponíveis — aguardando atribuição manual.`;
    } else {
      mensagemFinal = 'Lead recebido. Sem dados de região suficientes — aguardando definição de região para atribuição automática.';
    }

    res.status(201).json({
      sucesso:       true,
      leadId:        lead.id,
      mensagem:      mensagemFinal,
      atribuicao: {
        lojaId:           lojaResolvida?.id    ?? null,
        lojaNome:         lojaResolvida?.nomeFantasia ?? null,
        vendedorId:       vendedorAtribuido?.id   ?? null,
        vendedorNome:     vendedorAtribuido?.nome  ?? null,
        metodoResolucao:  metodoResolucao || null,
        statusFinal,
      },
      campos: {
        prioridade:         prioridadeFinal,
        interesseCorrigido: interesseCorrigidoFinal,
        resumo:             resumoFinal ? 'salvo' : 'vazio',
        proximaAcao:        proximaAcao?.trim() ? 'salvo' : 'vazio',
        mensagemWhatsApp:   mensagemWhatsApp?.trim() ? 'salvo' : 'vazio',
        regiaoCliente:      regiaoCliente?.trim() || null,
        bairroCliente:      bairroCliente?.trim() || null,
        cidadeCliente:      cidadeCliente?.trim() || null,
        lojaSugerida:       lojaSugerida?.trim() || null,
      },
    });
  } catch (err) {
    console.error('[INTEGRAÇÃO] leads-test:', err);
    res.status(500).json({ error: 'Erro ao processar lead externo.' });
  }
});

export default router;
