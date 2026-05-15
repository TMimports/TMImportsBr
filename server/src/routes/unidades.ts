import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

const goneHandler = (_req: any, res: any) => {
  res.status(410).json({ error: 'Módulo descontinuado. Utilize o Estoque.' });
};

router.get('/', goneHandler);
router.get('/:id(\\d+)', goneHandler);
router.post('/', goneHandler);
router.put('/:id(\\d+)', goneHandler);

router.get('/disponiveis/:lojaId', async (req: AuthRequest, res) => {
  try {
    const lojaId = Number(req.params.lojaId);
    const filter = applyTenantFilter(req);

    if (filter.lojaId && filter.lojaId !== lojaId) {
      return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }
    if (filter.grupoId) {
      const loja = await prisma.loja.findFirst({ where: { id: lojaId, grupoId: filter.grupoId } });
      if (!loja) return res.status(403).json({ error: 'Acesso negado a esta loja' });
    }

    const unidades = await prisma.unidadeFisica.findMany({
      where: {
        lojaId,
        status: 'ESTOQUE'
      },
      include: { 
        produto: { select: { id: true, nome: true, preco: true } }
      },
      orderBy: { produto: { nome: 'asc' } }
    });

    res.json(unidades.map(u => ({
      id: u.id,
      produtoId: u.produtoId,
      produtoNome: u.produto.nome,
      preco: u.produto.preco,
      chassi: u.chassi,
      codigoMotor: u.codigoMotor,
      cor: u.cor,
      ano: u.ano,
      displayName: `${u.produto.nome} - Chassi: ${u.chassi || 'N/A'} | Motor: ${u.codigoMotor || 'N/A'} | Cor: ${u.cor || 'N/A'}`
    })));
  } catch (error) {
    console.error('Erro ao buscar unidades disponíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── EXCLUSÃO SEGURA DE CHASSI ────────────────────────────────────────────────
router.delete('/:id(\\d+)', requireRole('ADMIN_GERAL', 'DONO_LOJA', 'GERENTE_LOJA'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  try {
    const unidade = await prisma.unidadeFisica.findUnique({
      where: { id },
      include: {
        itensVenda:     { select: { id: true } },
        transferencias: { select: { id: true, status: true } },
        ordensServico:  { select: { id: true, status: true } },
      },
    });

    if (!unidade) return res.status(404).json({ error: 'Chassi não encontrado' });

    if (unidade.status === 'VENDIDA' || unidade.itensVenda.length > 0)
      return res.status(400).json({ error: `Chassi "${unidade.chassi}" já foi vendido — não pode ser excluído` });

    const transferAtiva = unidade.transferencias.find(t => ['SOLICITADA', 'APROVADA'].includes(t.status));
    if (transferAtiva)
      return res.status(400).json({ error: `Chassi "${unidade.chassi}" está em transferência ativa — cancele antes de excluir` });

    const osAtiva = unidade.ordensServico.find(os => os.status !== 'EXECUTADA');
    if (osAtiva)
      return res.status(400).json({ error: `Chassi "${unidade.chassi}" está em Ordem de Serviço ativa` });

    await prisma.$transaction(async (tx) => {
      await tx.unidadeFisica.delete({ where: { id } });

      const estoque = await tx.estoque.findUnique({
        where: { produtoId_lojaId: { produtoId: unidade.produtoId, lojaId: unidade.lojaId } },
      });
      const qtdAnterior = estoque?.quantidade ?? 0;
      const qtdNova = Math.max(0, qtdAnterior - 1);
      if (estoque) {
        await tx.estoque.update({ where: { id: estoque.id }, data: { quantidade: qtdNova } });
      }

      await tx.logEstoque.create({
        data: {
          tipo: 'SAIDA',
          origem: 'EXCLUSAO_MANUAL',
          origemId: id,
          produtoId: unidade.produtoId,
          lojaId: unidade.lojaId,
          quantidade: 1,
          quantidadeAnterior: qtdAnterior,
          quantidadeNova: qtdNova,
          usuarioId: req.user!.id,
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: req.user!.id,
          acao: 'EXCLUSAO_CHASSI',
          entidade: 'UnidadeFisica',
          entidadeId: id,
          dados: JSON.stringify({ chassi: unidade.chassi, produtoId: unidade.produtoId, lojaId: unidade.lojaId }),
        },
      });
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir chassi:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
