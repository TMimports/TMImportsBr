import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';
import { gerarEEnviarRelatorio, dispararRelatoriosPorRole, tipoRelatorioParaRole, TipoRelatorio, PeriodoRelatorio } from '../services/relatorios.js';
import { testarEmail } from '../services/email.js';

const router = Router();
router.use(verifyToken);

router.get('/destinatarios', async (req: AuthRequest, res) => {
  try {
    const ROLES_GERAL = ['ADMIN_GERAL'];
    const ROLES_FINANCEIRO = ['ADMIN_FINANCEIRO'];
    const ROLES_COMERCIAL = ['ADMIN_REDE', 'DONO_LOJA', 'GERENTE_LOJA'];

    const usuarios = await prisma.user.findMany({
      where: {
        ativo: true,
        role: { in: [...ROLES_GERAL, ...ROLES_FINANCEIRO, ...ROLES_COMERCIAL] }
      },
      select: {
        id: true, nome: true, email: true, role: true,
        loja: { select: { nomeFantasia: true } }
      },
      orderBy: { nome: 'asc' }
    });

    const mapeados = usuarios.map(u => ({
      ...u,
      relatorios: tipoRelatorioParaRole(u.role)
    }));

    res.json(mapeados);
  } catch (err) {
    console.error('[RELATORIO] Erro ao listar destinatários:', err);
    res.status(500).json({ error: 'Erro ao listar destinatários' });
  }
});

router.post('/disparar', async (req: AuthRequest, res) => {
  if (!['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  const { tipo, periodo } = req.body as { tipo?: TipoRelatorio; periodo: PeriodoRelatorio };

  if (!periodo || !['SEMANAL', 'MENSAL'].includes(periodo)) {
    return res.status(400).json({ error: 'Período inválido. Use SEMANAL ou MENSAL.' });
  }

  try {
    let resultados;

    if (tipo) {
      if (!['FINANCEIRO', 'COMERCIAL', 'GERAL'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo inválido. Use FINANCEIRO, COMERCIAL ou GERAL.' });
      }

      const ROLES_MAP: Record<TipoRelatorio, string[]> = {
        GERAL: ['ADMIN_GERAL'],
        FINANCEIRO: ['ADMIN_FINANCEIRO'],
        COMERCIAL: ['ADMIN_REDE', 'DONO_LOJA', 'GERENTE_LOJA']
      };

      const usuarios = await prisma.user.findMany({
        where: { ativo: true, role: { in: ROLES_MAP[tipo] } },
        select: { nome: true, email: true, lojaId: true }
      });

      if (usuarios.length === 0) {
        return res.json({ mensagem: 'Nenhum destinatário encontrado para este tipo de relatório.', enviados: 0 });
      }

      resultados = await gerarEEnviarRelatorio(tipo, periodo, usuarios.map(u => ({
        nome: u.nome,
        email: u.email,
        lojaId: u.lojaId || undefined
      })));

    } else {
      resultados = await dispararRelatoriosPorRole(periodo);
    }

    const totalEnviados = Array.isArray(resultados) && resultados[0]?.email
      ? resultados.filter((r: any) => r.ok).length
      : resultados.reduce((acc: number, g: any) => acc + (g.resultados?.filter((r: any) => r.ok).length || 0), 0);

    res.json({
      mensagem: `Relatórios enviados com sucesso`,
      enviados: totalEnviados,
      detalhes: resultados
    });
  } catch (err: any) {
    console.error('[RELATORIO] Erro ao disparar:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar relatórios' });
  }
});

router.post('/testar-email', async (req: AuthRequest, res) => {
  if (!['ADMIN_GERAL', 'ADMIN_FINANCEIRO'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  const email = req.body.email || req.user!.email;
  const resultado = await testarEmail(email);
  res.json(resultado);
});

export default router;
