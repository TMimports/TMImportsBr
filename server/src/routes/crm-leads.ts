import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

// Guard: apenas ADMIN_GERAL nesta fase beta
function onlyAdminGeral(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== 'ADMIN_GERAL') {
    return res.status(403).json({ error: 'Módulo em beta — acesso restrito ao Administrador Geral.' });
  }
  // Verificar flag de ambiente (opcional — se não definida, libera para ADMIN_GERAL)
  const betaAtivo = process.env.CRM_LEADS_BETA;
  if (betaAtivo !== undefined && betaAtivo !== 'true') {
    return res.status(503).json({ error: 'CRM Leads Beta desativado neste ambiente.' });
  }
  next();
}

const INCLUDE_LEAD = {
  loja:        { select: { id: true, nomeFantasia: true } },
  vendedor:    { select: { id: true, nome: true, telefone: true } },
  repassadoPor:{ select: { id: true, nome: true } },
  interacoes: {
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
};

// ── GET /crm-leads — listar ──────────────────────────────────────────────────
router.get('/', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const { status, origem, prioridade, lojaId, vendedorId, from, to, busca } = req.query;

    const where: any = {};
    if (status)     where.status     = status;
    if (origem)     where.origem     = origem;
    if (prioridade) where.prioridade = prioridade;
    if (lojaId)     where.lojaId     = Number(lojaId);
    if (vendedorId) where.vendedorId = Number(vendedorId);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to)   where.createdAt.lte = new Date(String(to) + 'T23:59:59');
    }
    if (busca) {
      const q = String(busca);
      where.OR = [
        { nome:     { contains: q, mode: 'insensitive' } },
        { telefone: { contains: q } },
        { email:    { contains: q, mode: 'insensitive' } },
        { campanha: { contains: q, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { loja: { select: { id: true, nomeFantasia: true } }, vendedor: { select: { id: true, nome: true } } },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(leads);
  } catch (err) {
    console.error('[CRM Leads] GET /', err);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

// ── GET /crm-leads/dashboard — métricas ──────────────────────────────────────
// IMPORTANTE: deve ficar ANTES de /:id para o Express não capturar "dashboard" como id
router.get('/dashboard', onlyAdminGeral, async (_req: AuthRequest, res) => {
  try {
    const [
      total, porStatus, porOrigem, porPrioridade, porLoja, porVendedor,
      ganhos, perdidos, semana, mes,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ['status'],    _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['origem'],    _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['prioridade'], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['lojaId'],    _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['vendedorId'], _count: { _all: true }, orderBy: { _count: { vendedorId: 'desc' } }, take: 10 }),
      prisma.lead.count({ where: { status: 'GANHO' } }),
      prisma.lead.count({ where: { status: 'PERDIDO' } }),
      prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
      prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
    ]);

    const lojaIds = porLoja.map(l => l.lojaId).filter((id): id is number => id !== null);
    const lojas   = await prisma.loja.findMany({ where: { id: { in: lojaIds } }, select: { id: true, nomeFantasia: true } });
    const lojaMap = Object.fromEntries(lojas.map(l => [l.id, l.nomeFantasia]));

    const vendedorIds = porVendedor.map(v => v.vendedorId).filter((id): id is number => id !== null);
    const vendedores  = await prisma.user.findMany({ where: { id: { in: vendedorIds } }, select: { id: true, nome: true } });
    const vendMap     = Object.fromEntries(vendedores.map(v => [v.id, v.nome]));

    const taxaConversao = total > 0 ? Math.round((ganhos / total) * 100) : 0;

    res.json({
      total, ganhos, perdidos, taxaConversao,
      novosUltimaSemana: semana, novosUltimoMes: mes,
      porStatus:     porStatus.map(x  => ({ status:    x.status,    total: x._count._all })),
      porOrigem:     porOrigem.map(x  => ({ origem:    x.origem,    total: x._count._all })),
      porPrioridade: porPrioridade.map(x => ({ prioridade: x.prioridade, total: x._count._all })),
      porLoja:       porLoja.map(x    => ({ lojaId:    x.lojaId,    nome: lojaMap[x.lojaId ?? 0] ?? '—', total: x._count._all })),
      porVendedor:   porVendedor.map(x => ({ vendedorId: x.vendedorId, nome: vendMap[x.vendedorId ?? 0] ?? '—', total: x._count._all })),
    });
  } catch (err) {
    console.error('[CRM Leads] GET /dashboard', err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// ── GET /crm-leads/lojas — listar lojas com campos de região ─────────────────
// IMPORTANTE: deve vir ANTES de /:id
// Usa apenas campos seguros no select (existem em qualquer versão do schema de prod).
// regiao, bairrosAtendidos, uf retornados como null se não existirem na resposta do Prisma.
router.get('/lojas', onlyAdminGeral, async (_req: AuthRequest, res) => {
  try {
    const lojas = await prisma.loja.findMany({
      where:   { ativo: true },
      select: {
        id: true, nomeFantasia: true, razaoSocial: true, endereco: true,
      },
      orderBy: { nomeFantasia: 'asc' },
    });
    // Adiciona campos de região como null para manter compatibilidade com o frontend
    res.json(lojas.map(l => ({
      ...l,
      regiao:          null,
      bairrosAtendidos: null,
      cidade:          null,
      uf:              null,
    })));
  } catch (err) {
    console.error('[CRM Leads] GET /lojas', err);
    res.status(500).json({ error: 'Erro ao listar lojas' });
  }
});

// ── PATCH /crm-leads/lojas/:id — atualizar campos de região da loja ───────────
// Tenta salvar todos os campos recebidos; se o schema de prod não tiver alguns,
// faz fallback com apenas os campos básicos seguros. Sempre retorna shape completo.
router.patch('/lojas/:id', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { regiao, bairrosAtendidos, cidade, uf } = req.body;

    // Monta payload com todos os campos recebidos (podem não existir em prod)
    const dataExtendido: any = {};
    if (regiao           !== undefined) dataExtendido.regiao           = regiao?.trim() || null;
    if (bairrosAtendidos !== undefined) dataExtendido.bairrosAtendidos = bairrosAtendidos?.trim() || null;
    if (cidade           !== undefined) dataExtendido.cidade           = cidade?.trim() || null;
    if (uf               !== undefined) dataExtendido.uf               = uf?.trim() || null;

    // Payload base: somente campos que sempre existem no schema de prod
    const dataBase: any = {};
    // (nenhum campo de região é garantido em prod — o update pode ser no-op se necessário)

    // Select seguro: apenas campos que sempre existem
    const selectSeguro = { id: true, nomeFantasia: true, razaoSocial: true, endereco: true } as const;

    let loja: any;
    try {
      loja = await prisma.loja.update({ where: { id }, data: dataExtendido, select: selectSeguro });
    } catch (errUpdate: any) {
      console.warn(`[CRM Leads] PATCH /lojas/${id} fallback (schema antigo): ${String(errUpdate?.message ?? '').slice(0, 100)}`);
      loja = await prisma.loja.update({ where: { id }, data: dataBase, select: selectSeguro });
    }

    // Retorna shape completo com campos de região (valores recebidos ou null)
    res.json({
      ...loja,
      regiao:          regiao?.trim()           || null,
      bairrosAtendidos: bairrosAtendidos?.trim() || null,
      cidade:          cidade?.trim()           || null,
      uf:              uf?.trim()               || null,
    });
  } catch (err) {
    console.error('[CRM Leads] PATCH /lojas/:id', err);
    res.status(500).json({ error: 'Erro ao atualizar região da loja' });
  }
});

// ── GET /crm-leads/vendedores — listar vendedores ativos ─────────────────────
// IMPORTANTE: deve vir ANTES de /:id para o Express não interpretar "vendedores" como id
router.get('/vendedores', onlyAdminGeral, async (_req: AuthRequest, res) => {
  try {
    const vendedores = await prisma.user.findMany({
      where: {
        role: { in: ['VENDEDOR', 'GERENTE_LOJA', 'DONO_LOJA'] },
        ativo: true,
      },
      select: {
        id: true, nome: true, email: true, telefone: true,
        loja: { select: { id: true, nomeFantasia: true } },
      },
      orderBy: { nome: 'asc' },
    });
    res.json(vendedores);
  } catch (err) {
    console.error('[CRM Leads] GET /vendedores', err);
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

// ── POST /crm-leads/:id/repasse — passar bastão ───────────────────────────────
router.post('/:id/repasse', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const leadId = Number(req.params.id);
    const { vendedorId } = req.body;

    if (!vendedorId) return res.status(400).json({ error: 'vendedorId é obrigatório' });

    const [lead, vendedor] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.user.findUnique({ where: { id: Number(vendedorId) }, select: { id: true, nome: true, telefone: true } }),
    ]);
    if (!lead)     return res.status(404).json({ error: 'Lead não encontrado' });
    if (!vendedor) return res.status(404).json({ error: 'Vendedor não encontrado' });

    const repassante = req.user!;

    const atualizado = await prisma.lead.update({
      where: { id: leadId },
      data: {
        vendedorId:         Number(vendedorId),
        repassadoPorId:     repassante.id,
        dataRepasseVendedor: new Date(),
        status:             lead.status === 'NOVO' ? 'EM_ATENDIMENTO' : lead.status,
      },
      include: INCLUDE_LEAD,
    });

    await prisma.leadInteracao.create({
      data: {
        leadId,
        usuarioId: repassante.id,
        tipo:     'OBSERVACAO',
        descricao: `🤝 Lead repassado para ${vendedor.nome} por ${repassante.nome}.`,
      },
    });

    // Recarregar com interações atualizadas
    const final = await prisma.lead.findUnique({ where: { id: leadId }, include: INCLUDE_LEAD });
    res.json(final);
  } catch (err) {
    console.error('[CRM Leads] POST /:id/repasse', err);
    res.status(500).json({ error: 'Erro ao repassar lead' });
  }
});

// ── GET /crm-leads/:id — detalhe ─────────────────────────────────────────────
router.get('/:id', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.id) },
      include: INCLUDE_LEAD,
    });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(lead);
  } catch (err) {
    console.error('[CRM Leads] GET /:id', err);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// ── POST /crm-leads — criar ──────────────────────────────────────────────────
router.post('/', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const {
      nome, telefone, email, origem, campanha, interesse,
      interesseCorrigido, lojaId, vendedorId, status, prioridade,
      resumo, proximaAcao, mensagemWhatsApp, dataProximoFollowUp, observacoes,
      regiaoCliente, bairroCliente, cidadeCliente, ufCliente, lojaSugerida, motivoLojaSugerida,
    } = req.body;

    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Campos base: sempre existem em qualquer versão do schema de produção
    const dadosBase: any = {
      nome:                nome.trim(),
      telefone:            telefone?.trim() || null,
      email:               email?.trim() || null,
      origem:              origem || 'OUTRO',
      campanha:            campanha?.trim() || null,
      interesse:           interesse || 'MOTO',
      lojaId:              lojaId ? Number(lojaId) : null,
      vendedorId:          vendedorId ? Number(vendedorId) : null,
      status:              status || 'NOVO',
      prioridade:          prioridade || 'MEDIA',
      resumo:              resumo?.trim() || null,
      proximaAcao:         proximaAcao?.trim() || null,
      dataProximoFollowUp: dataProximoFollowUp ? new Date(dataProximoFollowUp) : null,
      observacoes:         observacoes?.trim() || null,
    };

    // Campos estendidos: podem não existir em versões antigas do schema de prod
    const dadosExtendidos: any = {
      ...dadosBase,
      interesseCorrigido:  interesseCorrigido?.trim() || null,
      mensagemWhatsApp:    mensagemWhatsApp?.trim() || null,
      regiaoCliente:       regiaoCliente?.trim() || null,
      bairroCliente:       bairroCliente?.trim() || null,
      cidadeCliente:       cidadeCliente?.trim() || null,
      ufCliente:           ufCliente?.trim() || null,
      lojaSugerida:        lojaSugerida?.trim() || null,
      motivoLojaSugerida:  motivoLojaSugerida?.trim() || null,
    };

    let lead: any;
    try {
      lead = await prisma.lead.create({ data: dadosExtendidos, include: INCLUDE_LEAD });
    } catch (errCreate: any) {
      console.warn(`[CRM Leads] Fallback create (schema antigo): ${String(errCreate?.message ?? '').slice(0, 120)}`);
      lead = await prisma.lead.create({ data: dadosBase, include: INCLUDE_LEAD });
    }

    // Registrar interação inicial de criação
    await prisma.leadInteracao.create({
      data: {
        leadId:    lead.id,
        usuarioId: req.user!.id,
        tipo:      'OBSERVACAO',
        descricao: `Lead criado manualmente pelo admin.`,
      },
    });

    res.status(201).json(lead);
  } catch (err) {
    console.error('[CRM Leads] POST /', err);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// ── PATCH /crm-leads/:id — editar ────────────────────────────────────────────
router.patch('/:id', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.lead.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Lead não encontrado' });

    const {
      nome, telefone, email, origem, campanha, interesse,
      interesseCorrigido, lojaId, vendedorId, status, prioridade,
      resumo, proximaAcao, mensagemWhatsApp, dataProximoFollowUp, observacoes,
      whatsappComercialOrigem, canalOrigem, mensagemRecebida, linkConversa,
      regiaoCliente, bairroCliente, cidadeCliente, ufCliente, lojaSugerida, motivoLojaSugerida,
    } = req.body;

    const data: any = {};
    if (nome !== undefined)                    data.nome                    = nome.trim();
    if (telefone !== undefined)                data.telefone                = telefone?.trim() || null;
    if (email !== undefined)                   data.email                   = email?.trim() || null;
    if (origem !== undefined)                  data.origem                  = origem;
    if (campanha !== undefined)                data.campanha                = campanha?.trim() || null;
    if (interesse !== undefined)               data.interesse               = interesse;
    if (interesseCorrigido !== undefined)      data.interesseCorrigido      = interesseCorrigido?.trim() || null;
    if (lojaId !== undefined)                  data.lojaId                  = lojaId ? Number(lojaId) : null;
    if (vendedorId !== undefined)              data.vendedorId              = vendedorId ? Number(vendedorId) : null;
    if (prioridade !== undefined)              data.prioridade              = prioridade;
    if (resumo !== undefined)                  data.resumo                  = resumo?.trim() || null;
    if (proximaAcao !== undefined)             data.proximaAcao             = proximaAcao?.trim() || null;
    if (mensagemWhatsApp !== undefined)        data.mensagemWhatsApp        = mensagemWhatsApp?.trim() || null;
    if (dataProximoFollowUp !== undefined)     data.dataProximoFollowUp     = dataProximoFollowUp ? new Date(dataProximoFollowUp) : null;
    if (observacoes !== undefined)             data.observacoes             = observacoes?.trim() || null;
    if (whatsappComercialOrigem !== undefined) data.whatsappComercialOrigem = whatsappComercialOrigem?.trim() || null;
    if (canalOrigem !== undefined)             data.canalOrigem             = canalOrigem?.trim() || null;
    if (mensagemRecebida !== undefined)        data.mensagemRecebida        = mensagemRecebida?.trim() || null;
    if (linkConversa !== undefined)            data.linkConversa            = linkConversa?.trim() || null;
    if (regiaoCliente !== undefined)           data.regiaoCliente           = regiaoCliente?.trim() || null;
    if (bairroCliente !== undefined)           data.bairroCliente           = bairroCliente?.trim() || null;
    if (cidadeCliente !== undefined)           data.cidadeCliente           = cidadeCliente?.trim() || null;
    if (ufCliente !== undefined)               data.ufCliente               = ufCliente?.trim() || null;
    if (lojaSugerida !== undefined)            data.lojaSugerida            = lojaSugerida?.trim() || null;
    if (motivoLojaSugerida !== undefined)      data.motivoLojaSugerida      = motivoLojaSugerida?.trim() || null;
    if ((req.body as any).origemRepasse !== undefined) data.origemRepasse   = (req.body as any).origemRepasse?.trim() || null;

    // Registrar mudança de status como interação automática
    if (status !== undefined && status !== current.status) {
      data.status = status;
      await prisma.leadInteracao.create({
        data: {
          leadId:    id,
          usuarioId: req.user!.id,
          tipo:      'OBSERVACAO',
          descricao: `Status alterado: ${current.status} → ${status}`,
        },
      });
    }

    // Fallback: campos que podem não existir em versões antigas do schema de prod
    const CAMPOS_EXTENDIDOS = [
      'interesseCorrigido', 'mensagemWhatsApp', 'regiaoCliente', 'bairroCliente',
      'cidadeCliente', 'ufCliente', 'lojaSugerida', 'motivoLojaSugerida',
      'origemRepasse', 'whatsappComercialOrigem', 'canalOrigem', 'mensagemRecebida', 'linkConversa',
    ];
    const dataBase: any = Object.fromEntries(
      Object.entries(data).filter(([k]) => !CAMPOS_EXTENDIDOS.includes(k))
    );

    let lead: any;
    try {
      lead = await prisma.lead.update({ where: { id }, data, include: INCLUDE_LEAD });
    } catch (errUpdate: any) {
      console.warn(`[CRM Leads] Fallback update (schema antigo): ${String(errUpdate?.message ?? '').slice(0, 120)}`);
      lead = await prisma.lead.update({ where: { id }, data: dataBase, include: INCLUDE_LEAD });
    }
    res.json(lead);
  } catch (err) {
    console.error('[CRM Leads] PATCH /:id', err);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// ── DELETE /crm-leads/:id — excluir ──────────────────────────────────────────
router.delete('/:id', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    await prisma.leadInteracao.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[CRM Leads] DELETE /:id', err);
    res.status(500).json({ error: 'Erro ao excluir lead' });
  }
});

// ── POST /crm-leads/:id/interacoes — registrar interação ─────────────────────
router.post('/:id/interacoes', onlyAdminGeral, async (req: AuthRequest, res) => {
  try {
    const leadId = Number(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const { tipo, descricao } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ error: 'Descrição obrigatória' });

    const interacao = await prisma.leadInteracao.create({
      data: {
        leadId,
        usuarioId: req.user!.id,
        tipo:      tipo || 'OBSERVACAO',
        descricao: descricao.trim(),
      },
      include: { usuario: { select: { id: true, nome: true } } },
    });

    res.status(201).json(interacao);
  } catch (err) {
    console.error('[CRM Leads] POST /:id/interacoes', err);
    res.status(500).json({ error: 'Erro ao registrar interação' });
  }
});

export default router;
