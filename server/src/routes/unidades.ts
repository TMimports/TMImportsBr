import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

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

export default router;
