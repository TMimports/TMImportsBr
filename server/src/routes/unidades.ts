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

// ── Cadastro manual de chassi ──────────────────────────────────────────────
router.post('/manual', async (req: AuthRequest, res) => {
  try {
    const { produtoId, lojaId, cor, chassi, codigoMotor, ano, custo, fornecedorId, notaFiscalEntrada } = req.body;
    const user = req.user!;

    if (!produtoId || !lojaId) {
      return res.status(400).json({ error: 'produtoId e lojaId são obrigatórios' });
    }

    // Verificar permissão de loja (não-admin só pode cadastrar na própria loja)
    if (user.lojaId && user.lojaId !== Number(lojaId)) {
      return res.status(403).json({ error: 'Você só pode cadastrar chassis na sua loja' });
    }

    // Verificar se produto existe e é MOTO
    const produto = await prisma.produto.findUnique({ where: { id: Number(produtoId) } });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    if (produto.tipo !== 'MOTO') return res.status(400).json({ error: 'Somente produtos do tipo MOTO aceitam chassi' });

    // Verificar chassi duplicado
    if (chassi && chassi.trim()) {
      const chassiExistente = await prisma.unidadeFisica.findFirst({ where: { chassi: chassi.trim() } });
      if (chassiExistente) return res.status(400).json({ error: `Chassi "${chassi}" já cadastrado` });
    }

    // Gerar número de série
    const prefixo = 'TMUNI';
    const ultimo = await prisma.unidadeFisica.findFirst({
      where: { numeroSerie: { startsWith: prefixo } },
      orderBy: { numeroSerie: 'desc' }
    });
    let seq = 1;
    if (ultimo?.numeroSerie) {
      const m = ultimo.numeroSerie.match(/\d+$/);
      if (m) seq = parseInt(m[0]) + 1;
    }
    const numeroSerie = `${prefixo}${String(seq).padStart(5, '0')}`;

    const unidade = await prisma.unidadeFisica.create({
      data: {
        produtoId: Number(produtoId),
        lojaId: Number(lojaId),
        cor: cor?.trim() || null,
        chassi: chassi?.trim() || null,
        codigoMotor: codigoMotor?.trim() || null,
        ano: ano ? Number(ano) : new Date().getFullYear(),
        numeroSerie,
        status: 'ESTOQUE',
        createdBy: user.id,
      },
      include: {
        produto: { select: { nome: true } },
        loja: { select: { nomeFantasia: true } },
      }
    });

    // Atualizar custo médio do produto se informado
    if (custo && Number(custo) > 0) {
      await prisma.produto.update({
        where: { id: Number(produtoId) },
        data: { custo: Number(custo) }
      });
    }

    return res.status(201).json(unidade);
  } catch (error: any) {
    console.error('Erro ao cadastrar chassi manual:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// ── Cadastro em lote (vários chassi de uma vez) ─────────────────────────────
router.post('/manual/lote', async (req: AuthRequest, res) => {
  try {
    const { lojaId, produtoId, itens, fornecedorId, notaFiscalEntrada } = req.body;
    const user = req.user!;

    if (!lojaId || !produtoId || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'lojaId, produtoId e itens são obrigatórios' });
    }
    if (user.lojaId && user.lojaId !== Number(lojaId)) {
      return res.status(403).json({ error: 'Você só pode cadastrar chassis na sua loja' });
    }

    const produto = await prisma.produto.findUnique({ where: { id: Number(produtoId) } });
    if (!produto || produto.tipo !== 'MOTO') {
      return res.status(400).json({ error: 'Produto inválido ou não é MOTO' });
    }

    const erros: string[] = [];
    const criados: any[] = [];

    for (let i = 0; i < itens.length; i++) {
      const { chassi, cor, codigoMotor, ano } = itens[i];
      try {
        if (chassi?.trim()) {
          const dup = await prisma.unidadeFisica.findFirst({ where: { chassi: chassi.trim() } });
          if (dup) { erros.push(`Item ${i + 1}: chassi "${chassi}" já cadastrado`); continue; }
        }

        const prefixo = 'TMUNI';
        const ultimo = await prisma.unidadeFisica.findFirst({
          where: { numeroSerie: { startsWith: prefixo } },
          orderBy: { numeroSerie: 'desc' }
        });
        let seq = 1;
        if (ultimo?.numeroSerie) {
          const m = ultimo.numeroSerie.match(/\d+$/);
          if (m) seq = parseInt(m[0]) + 1;
        }
        const numeroSerie = `${prefixo}${String(seq).padStart(5, '0')}`;

        const unidade = await prisma.unidadeFisica.create({
          data: {
            produtoId: Number(produtoId),
            lojaId: Number(lojaId),
            chassi: chassi?.trim() || null,
            cor: cor?.trim() || null,
            codigoMotor: codigoMotor?.trim() || null,
            ano: ano ? Number(ano) : new Date().getFullYear(),
            numeroSerie,
            status: 'ESTOQUE',
            createdBy: user.id,
          }
        });
        criados.push(unidade);
      } catch (e: any) {
        erros.push(`Item ${i + 1}: ${e.message}`);
      }
    }

    return res.json({ sucesso: true, criados: criados.length, erros: erros.length, detalhesErros: erros });
  } catch (error: any) {
    console.error('Erro ao cadastrar chassi em lote:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
});

// ── Slots disponíveis para cadastro de chassi ─────────────────────────────
// Retorna quantas unidades do estoque ainda não têm chassi registrado
router.get('/slots', async (req: AuthRequest, res) => {
  try {
    const produtoId = Number(req.query.produtoId);
    const lojaId    = Number(req.query.lojaId);

    if (!produtoId || !lojaId) {
      return res.status(400).json({ error: 'produtoId e lojaId são obrigatórios' });
    }

    // Quantidade no estoque (tabela Estoque)
    const estoque = await prisma.estoque.findUnique({
      where: { produtoId_lojaId: { produtoId, lojaId } },
      select: { quantidade: true },
    });
    const estoqueQtd = estoque?.quantidade ?? 0;

    // Chassis já cadastrados em status ESTOQUE para esse produto+loja
    const chassisCadastrados = await prisma.unidadeFisica.count({
      where: { produtoId, lojaId, status: 'ESTOQUE' },
    });

    const slotsDisponiveis = Math.max(0, estoqueQtd - chassisCadastrados);

    res.json({ estoqueQtd, chassisCadastrados, slotsDisponiveis });
  } catch (error) {
    console.error('Erro ao calcular slots:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

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
