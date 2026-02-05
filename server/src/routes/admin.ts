import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/backfill/vendas', verifyToken, requireRole('ADMIN_GERAL'), async (req: AuthRequest, res: Response) => {
  try {
    const resultado = {
      vendasAnalisadas: 0,
      garantiasCriadas: 0,
      contasReceberCriadas: 0,
      erros: [] as string[]
    };

    const vendasConfirmadas = await prisma.venda.findMany({
      where: {
        confirmadaFinanceiro: true,
        deletedAt: null
      },
      include: {
        itens: {
          include: {
            unidadeFisica: true,
            produto: true
          }
        },
        cliente: true,
        loja: true
      }
    });

    resultado.vendasAnalisadas = vendasConfirmadas.length;

    for (const venda of vendasConfirmadas) {
      try {
        for (const item of venda.itens) {
          if (item.unidadeFisicaId) {
            const garantiasExistentes = await prisma.garantia.count({
              where: { vendaId: venda.id, unidadeFisicaId: item.unidadeFisicaId }
            });

            if (garantiasExistentes === 0) {
              const garantiasConfig = [
                { tipo: 'geral', meses: 3 },
                { tipo: 'motor', meses: 12 },
                { tipo: 'modulo', meses: 12 },
                { tipo: 'bateria', meses: 12 }
              ];

              const dataBase = venda.updatedAt || venda.createdAt;

              for (const g of garantiasConfig) {
                const dataInicio = new Date(dataBase);
                const dataFim = new Date(dataBase);
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
                resultado.garantiasCriadas++;
              }
            }
          }
        }

        const contaExistente = await prisma.contaReceber.count({
          where: { vendaId: venda.id }
        });

        if (contaExistente === 0) {
          const dataBase = venda.updatedAt || venda.createdAt;
          const vencimento = new Date(dataBase);
          vencimento.setDate(vencimento.getDate() + 30);

          await prisma.contaReceber.create({
            data: {
              lojaId: venda.lojaId,
              clienteId: venda.clienteId,
              vendaId: venda.id,
              descricao: `Venda #${venda.id} - ${venda.cliente?.nome || 'Cliente'}`,
              valor: venda.valorTotal,
              vencimento,
              pago: false
            }
          });
          resultado.contasReceberCriadas++;
        }
      } catch (err: any) {
        resultado.erros.push(`Venda #${venda.id}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Backfill concluido',
      ...resultado
    });
  } catch (error: any) {
    console.error('Erro no backfill:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/backfill/status', verifyToken, requireRole('ADMIN_GERAL'), async (req: AuthRequest, res: Response) => {
  try {
    const vendasConfirmadas = await prisma.venda.count({
      where: { confirmadaFinanceiro: true, deletedAt: null }
    });

    const vendasComGarantia = await prisma.venda.count({
      where: {
        confirmadaFinanceiro: true,
        deletedAt: null,
        garantias: { some: {} }
      }
    });

    const vendasComContaReceber = await prisma.contaReceber.count({
      where: { vendaId: { not: null } }
    });

    const garantiasTotal = await prisma.garantia.count();
    const contasReceberTotal = await prisma.contaReceber.count();

    res.json({
      vendasConfirmadas,
      vendasComGarantia,
      vendasComContaReceber,
      garantiasTotal,
      contasReceberTotal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
