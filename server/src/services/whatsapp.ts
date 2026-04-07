import { prisma } from '../index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function limparNumero(tel: string): string {
  const digits = tel.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return `55${digits}`;
}

function gerarLinkWa(numero: string, mensagem: string): string {
  const num = limparNumero(numero);
  const encoded = encodeURIComponent(mensagem);
  return `https://wa.me/${num}?text=${encoded}`;
}

function substituirVariaveis(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// ─── Criação de disparo com link wa.me ────────────────────────────────────────

export async function criarDisparo(opts: {
  destinatario: string;
  numero: string;
  mensagem: string;
  contexto?: string;
  templateId?: number;
  operadorId?: number;
  clienteId?: number;
  fornecedorId?: number;
  destinatarioUserId?: number;
  tipo?: 'MANUAL' | 'AUTOMATICO' | 'CRON';
}) {
  const link = gerarLinkWa(opts.numero, opts.mensagem);

  const disparo = await prisma.disparoWhatsApp.create({
    data: {
      destinatario: opts.destinatario,
      numero: limparNumero(opts.numero),
      mensagem: opts.mensagem,
      contexto: (opts.contexto as any) || null,
      templateId: opts.templateId || null,
      operadorId: opts.operadorId || null,
      clienteId: opts.clienteId || null,
      fornecedorId: opts.fornecedorId || null,
      destinatarioUserId: opts.destinatarioUserId || null,
      tipo: (opts.tipo as any) || 'MANUAL',
      status: 'PENDENTE',
    },
  });

  return { disparo, link };
}

export async function marcarEnviado(id: number) {
  return prisma.disparoWhatsApp.update({
    where: { id },
    data: { status: 'ENVIADO', enviadoAt: new Date() },
  });
}

// ─── Templates padrão (seeding) ───────────────────────────────────────────────

export const TEMPLATES_PADRAO = [
  {
    nome: 'Motivação Diária – Vendedor',
    contexto: 'MOTIVACIONAL_VENDEDOR' as const,
    mensagem:
      'Bom dia, {{nome}}! 🚀\n\nNova oportunidade começa hoje! Lembre-se: cada cliente que você atende é uma moto a mais na rua. Você é peça fundamental da nossa equipe.\n\nVamos com tudo hoje! 💪\n\n— Equipe TM Imports / Tecle Motos',
  },
  {
    nome: 'Follow-up Cliente',
    contexto: 'FOLLOWUP_CLIENTE' as const,
    mensagem:
      'Olá, {{nome}}! 😊\n\nTudo bem? Passando para verificar se você ficou satisfeito com sua moto e se tem alguma dúvida ou necessidade.\n\nEstamos à disposição! Entre em contato quando quiser.\n\n— Tecle Motos',
  },
  {
    nome: 'Follow-up Fornecedor',
    contexto: 'FOLLOWUP_FORNECEDOR' as const,
    mensagem:
      'Olá, {{nome}}! 👋\n\nPassando para reforçar nosso interesse em continuar a parceria com {{empresa}}. Podemos conversar sobre novos pedidos?\n\nAguardo seu retorno!\n\n— TM Imports',
  },
  {
    nome: 'Cobrança Amigável',
    contexto: 'COBRANCA' as const,
    mensagem:
      'Olá, {{nome}}! 😊\n\nIdentificamos uma pendência financeira em seu cadastro. Seria possível regularizar? Podemos facilitar o pagamento.\n\nEntre em contato: {{contato}}',
  },
  {
    nome: 'Boas-vindas Cliente',
    contexto: 'BOAS_VINDAS' as const,
    mensagem:
      'Seja bem-vindo à família Tecle Motos, {{nome}}! 🏍️✨\n\nFicamos muito felizes com a sua compra. Para qualquer necessidade, estamos aqui.\n\nBoas pedaladas! 🚀',
  },
  {
    nome: 'Confirmação de Venda',
    contexto: 'CONFIRMACAO_VENDA' as const,
    mensagem:
      'Olá, {{nome}}! Sua compra foi confirmada com sucesso! 🎉\n\nPedido: {{descricao}}\nValor: {{valor}}\n\nEm breve entraremos em contato com mais detalhes. Obrigado pela confiança!\n\n— Tecle Motos',
  },
  {
    nome: 'Aviso de Garantia',
    contexto: 'AVISO_GARANTIA' as const,
    mensagem:
      'Olá, {{nome}}! 🛡️\n\nSua garantia está próxima do vencimento ({{vencimento}}). Caso precise de revisão ou manutenção, agende com nossa equipe técnica.\n\n— Tecle Motos',
  },
];

// ─── Gerar disparos motivacionais diários (cron) ──────────────────────────────

export async function gerarDisparosMotivacioanis(): Promise<{ total: number; links: { nome: string; link: string }[] }> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const template = await prisma.templateWhatsApp.findFirst({
    where: { contexto: 'MOTIVACIONAL_VENDEDOR', ativo: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!template) {
    console.log('[WHATSAPP] Nenhum template motivacional ativo encontrado.');
    return { total: 0, links: [] };
  }

  const vendedores = await prisma.user.findMany({
    where: { role: 'VENDEDOR', ativo: true, telefone: { not: null } },
    select: { id: true, nome: true, telefone: true },
  });

  const links: { nome: string; link: string }[] = [];

  for (const v of vendedores) {
    if (!v.telefone) continue;

    const mensagem = substituirVariaveis(template.mensagem, {
      nome: v.nome.split(' ')[0],
    });

    const { link } = await criarDisparo({
      destinatario: v.nome,
      numero: v.telefone,
      mensagem,
      contexto: 'MOTIVACIONAL_VENDEDOR',
      templateId: template.id,
      destinatarioUserId: v.id,
      tipo: 'CRON',
    });

    links.push({ nome: v.nome, link });
  }

  console.log(`[WHATSAPP] ${links.length} disparos motivacionais gerados para ${new Date().toLocaleDateString('pt-BR')}`);
  return { total: links.length, links };
}
