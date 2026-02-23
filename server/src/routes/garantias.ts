import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    const where: any = {};

    if (userRole !== 'ADMIN_GERAL' && userRole !== 'ADMIN_REDE') {
      if (userRole === 'DONO_LOJA' && req.user?.grupoId) {
        where.OR = [
          { unidadeFisica: { loja: { grupoId: req.user.grupoId } } },
          { unidadeFisica: null, venda: { loja: { grupoId: req.user.grupoId } } }
        ];
      } else if (req.user?.lojaId) {
        where.OR = [
          { unidadeFisica: { lojaId: req.user.lojaId } },
          { unidadeFisica: null, venda: { lojaId: req.user.lojaId } }
        ];
      }
    }

    const garantias = await prisma.garantia.findMany({
      where,
      include: { 
        unidadeFisica: { include: { produto: true, loja: true } },
        cliente: true,
        venda: { include: { itens: { include: { produto: true } }, loja: true } }
      },
      orderBy: { dataFim: 'asc' }
    });

    const resultado = garantias.map(g => ({
      ...g,
      tipo: g.tipoGarantia,
      unidade: g.unidadeFisica
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar garantias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:id/revisao', async (req: AuthRequest, res) => {
  try {
    const { revisaoFeita } = req.body;
    
    const garantia = await prisma.garantia.update({
      where: { id: Number(req.params.id) },
      data: { revisaoFeita: Boolean(revisaoFeita) }
    });

    res.json(garantia);
  } catch (error) {
    console.error('Erro ao atualizar revisao:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/alertas', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 20);

    const garantias = await prisma.garantia.findMany({
      where: {
        ativa: true,
        dataFim: { gte: hoje, lte: limite }
      },
      include: { unidadeFisica: { include: { produto: true } } },
      orderBy: { dataFim: 'asc' }
    });

    res.json(garantias);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/retroativas', async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    if (!['ADMIN_GERAL', 'ADMIN_REDE'].includes(userRole || '')) {
      return res.status(403).json({ error: 'Apenas administradores podem executar esta ação' });
    }

    const vendas = await prisma.venda.findMany({
      where: {
        tipo: 'VENDA',
        deletedAt: null
      },
      include: {
        itens: {
          include: { produto: true }
        }
      }
    });

    let garantiasCriadas = 0;
    let vendasCorrigidas = 0;

    for (const venda of vendas) {
      if (!venda.confirmadaFinanceiro) {
        await prisma.venda.update({
          where: { id: venda.id },
          data: { confirmadaFinanceiro: true }
        });
        vendasCorrigidas++;
      }

      for (const item of venda.itens) {
        const isMoto = item.produto?.tipo === 'MOTO';
        if (!isMoto) continue;

        const garantiasExistentes = await prisma.garantia.count({
          where: { vendaId: venda.id }
        });

        if (garantiasExistentes > 0) continue;

        const garantiasConfig = [
          { tipo: 'geral', meses: 3 },
          { tipo: 'motor', meses: 12 },
          { tipo: 'modulo', meses: 12 },
          { tipo: 'bateria', meses: 12 }
        ];

        for (const g of garantiasConfig) {
          const dataInicio = new Date(venda.createdAt);
          const dataFim = new Date(venda.createdAt);
          dataFim.setMonth(dataFim.getMonth() + g.meses);

          await prisma.garantia.create({
            data: {
              unidadeFisicaId: item.unidadeFisicaId,
              clienteId: venda.clienteId,
              vendaId: venda.id,
              tipoGarantia: g.tipo,
              meses: g.meses,
              dataInicio,
              dataFim
            }
          });
          garantiasCriadas++;
        }
      }
    }

    res.json({
      success: true,
      garantiasCriadas,
      vendasCorrigidas,
      vendasProcessadas: vendas.length,
      mensagem: `${garantiasCriadas} garantias criadas e ${vendasCorrigidas} vendas corrigidas para confirmada`
    });
  } catch (error) {
    console.error('Erro ao criar garantias retroativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { unidadeFisicaId, tipoGarantia, meses } = req.body;

    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setMonth(dataFim.getMonth() + Number(meses));

    const garantia = await prisma.garantia.create({
      data: {
        unidadeFisicaId: Number(unidadeFisicaId),
        tipoGarantia,
        meses: Number(meses),
        dataInicio,
        dataFim
      }
    });

    res.status(201).json(garantia);
  } catch (error) {
    console.error('Erro ao criar garantia:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/revisoes', async (req: AuthRequest, res) => {
  try {
    const revisoes = await prisma.revisao.findMany({
      include: { unidadeFisica: { include: { produto: true } } },
      orderBy: { dataAgendada: 'asc' }
    });

    res.json(revisoes);
  } catch (error) {
    console.error('Erro ao listar revisões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/revisoes/alertas', async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 20);

    const revisoes = await prisma.revisao.findMany({
      where: {
        dataRealizada: null,
        dataAgendada: { gte: hoje, lte: limite }
      },
      include: { unidadeFisica: { include: { produto: true } } },
      orderBy: { dataAgendada: 'asc' }
    });

    res.json(revisoes);
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/revisoes', async (req: AuthRequest, res) => {
  try {
    const { unidadeFisicaId, dataAgendada, gratuita, valor } = req.body;

    const ultimaRevisao = await prisma.revisao.findFirst({
      where: { unidadeFisicaId: Number(unidadeFisicaId) },
      orderBy: { numero: 'desc' }
    });

    const numero = (ultimaRevisao?.numero || 0) + 1;
    const isGratuita = numero === 1 || gratuita;

    const revisao = await prisma.revisao.create({
      data: {
        unidadeFisicaId: Number(unidadeFisicaId),
        numero,
        dataAgendada: new Date(dataAgendada),
        gratuita: isGratuita,
        valor: isGratuita ? null : (valor ? Number(valor) : null)
      }
    });

    res.status(201).json(revisao);
  } catch (error) {
    console.error('Erro ao agendar revisão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/revisoes/:id/realizar', async (req: AuthRequest, res) => {
  try {
    const revisao = await prisma.revisao.update({
      where: { id: Number(req.params.id) },
      data: { dataRealizada: new Date() }
    });

    res.json(revisao);
  } catch (error) {
    console.error('Erro ao realizar revisão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
