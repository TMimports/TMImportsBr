import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, applyTenantFilter, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const filter = applyTenantFilter(req);
    const where: any = {};
    if (filter.lojaId) where.lojaId = filter.lojaId;
    else if (filter.grupoId) where.loja = { grupoId: filter.grupoId };

    if (req.query.tipo) where.tipo = req.query.tipo;
    if (req.query.status) where.status = req.query.status;
    if (req.query.fornecedorId) where.fornecedorId = Number(req.query.fornecedorId);

    if (req.query.mes) {
      const [ano, mes] = (req.query.mes as string).split('-').map(Number);
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);
      where.dataEmissao = { gte: inicio, lte: fim };
    }

    const notas = await prisma.notaFiscal.findMany({
      where,
      include: {
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } },
        pedidoCompra: { select: { id: true } },
        venda: { select: { id: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { dataEmissao: 'desc' },
    });
    res.json(notas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const nota = await prisma.notaFiscal.findUnique({
      where: { id },
      include: {
        loja: { select: { id: true, nomeFantasia: true, cnpj: true } },
        fornecedor: { select: { id: true, razaoSocial: true, cnpj: true } },
        pedidoCompra: { select: { id: true } },
        venda: { select: { id: true } },
        itens: { include: { produto: { select: { id: true, nome: true, ncm: true } } } },
      },
    });
    if (!nota) return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    res.json(nota);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      lojaId, tipo, status, numero, serie, chaveAcesso,
      emitenteCnpj, emitenteNome, destinatarioCnpj, destinatarioNome,
      valorProdutos, valorFrete, valorDesconto, valorIcms, valorIpi, valorPis, valorCofins, valorTotal,
      dataEmissao, dataEntrada, fornecedorId, pedidoCompraId, vendaId, observacoes,
      itens,
    } = req.body;

    const filter = applyTenantFilter(req);
    const resolvedLojaId = lojaId || filter.lojaId;
    if (!resolvedLojaId) return res.status(400).json({ error: 'lojaId obrigatório' });
    if (!tipo) return res.status(400).json({ error: 'Tipo obrigatório (ENTRADA/SAIDA)' });
    if (!valorTotal) return res.status(400).json({ error: 'Valor total obrigatório' });
    if (!dataEmissao) return res.status(400).json({ error: 'Data de emissão obrigatória' });

    const nota = await prisma.notaFiscal.create({
      data: {
        lojaId: resolvedLojaId,
        tipo,
        status: status || 'PENDENTE',
        numero,
        serie,
        chaveAcesso,
        emitenteCnpj,
        emitenteNome,
        destinatarioCnpj,
        destinatarioNome,
        valorProdutos: valorProdutos || 0,
        valorFrete: valorFrete || 0,
        valorDesconto: valorDesconto || 0,
        valorIcms: valorIcms || 0,
        valorIpi: valorIpi || 0,
        valorPis: valorPis || 0,
        valorCofins: valorCofins || 0,
        valorTotal,
        dataEmissao: new Date(dataEmissao),
        dataEntrada: dataEntrada ? new Date(dataEntrada) : null,
        fornecedorId: fornecedorId || null,
        pedidoCompraId: pedidoCompraId || null,
        vendaId: vendaId || null,
        observacoes,
        createdBy: req.user!.id,
        itens: itens?.length
          ? {
              create: itens.map((item: any) => ({
                produtoId: item.produtoId || null,
                descricao: item.descricao,
                ncm: item.ncm,
                cfop: item.cfop,
                cst: item.cst,
                csosn: item.csosn,
                unidade: item.unidade || 'UN',
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                valorDesconto: item.valorDesconto || 0,
                valorTotal: item.valorTotal,
                aliquotaIcms: item.aliquotaIcms,
                valorIcms: item.valorIcms,
                aliquotaIpi: item.aliquotaIpi,
                valorIpi: item.valorIpi,
                aliquotaPis: item.aliquotaPis,
                valorPis: item.valorPis,
                aliquotaCofins: item.aliquotaCofins,
                valorCofins: item.valorCofins,
              })),
            }
          : undefined,
      },
      include: { itens: true },
    });

    res.status(201).json(nota);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { itens, lojaId, createdBy, createdAt, updatedAt, id: _id, ...body } = req.body;

    const nota = await prisma.notaFiscal.update({
      where: { id },
      data: {
        ...body,
        dataEmissao: body.dataEmissao ? new Date(body.dataEmissao) : undefined,
        dataEntrada: body.dataEntrada ? new Date(body.dataEntrada) : undefined,
      },
    });
    res.json(nota);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.notaFiscal.update({ where: { id }, data: { status: 'CANCELADA' } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
