import { PrismaClient, TipoMovimentoEstoque } from '@prisma/client';

const prisma = new PrismaClient();

interface MovimentoEstoque {
  produtoId: number;
  lojaId: number;
  quantidade: number;
  tipo: TipoMovimentoEstoque;
  origem: string;
  origemId?: number;
  usuarioId: number;
}

interface ResultadoMovimento {
  success: boolean;
  error?: string;
  produtoNome?: string;
  quantidadeFaltante?: number;
}

export class InventoryService {
  static async verificarEstoque(produtoId: number, lojaId: number, quantidade: number): Promise<{ disponivel: boolean; estoqueAtual: number }> {
    const estoque = await prisma.estoque.findUnique({
      where: { produtoId_lojaId: { produtoId, lojaId } }
    });

    const estoqueAtual = estoque?.quantidade || 0;
    return {
      disponivel: estoqueAtual >= quantidade,
      estoqueAtual
    };
  }

  static async darBaixa(movimento: MovimentoEstoque): Promise<ResultadoMovimento> {
    try {
      return await prisma.$transaction(async (tx) => {
        const estoque = await tx.estoque.findUnique({
          where: { produtoId_lojaId: { produtoId: movimento.produtoId, lojaId: movimento.lojaId } },
          include: { produto: true }
        });

        const quantidadeAnterior = estoque?.quantidade || 0;
        const quantidadeNova = quantidadeAnterior - movimento.quantidade;

        if (quantidadeNova < 0) {
          return {
            success: false,
            error: `Estoque insuficiente para ${estoque?.produto?.nome || 'produto'}`,
            produtoNome: estoque?.produto?.nome,
            quantidadeFaltante: Math.abs(quantidadeNova)
          };
        }

        if (estoque) {
          await tx.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: quantidadeNova }
          });
        } else {
          return {
            success: false,
            error: 'Produto não encontrado no estoque desta loja'
          };
        }

        await tx.logEstoque.create({
          data: {
            tipo: movimento.tipo,
            origem: movimento.origem,
            origemId: movimento.origemId,
            produtoId: movimento.produtoId,
            lojaId: movimento.lojaId,
            quantidade: -movimento.quantidade,
            quantidadeAnterior,
            quantidadeNova,
            usuarioId: movimento.usuarioId
          }
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Erro ao dar baixa no estoque:', error);
      return { success: false, error: 'Erro interno ao processar estoque' };
    }
  }

  static async darEntrada(movimento: MovimentoEstoque): Promise<ResultadoMovimento> {
    try {
      return await prisma.$transaction(async (tx) => {
        const estoque = await tx.estoque.findUnique({
          where: { produtoId_lojaId: { produtoId: movimento.produtoId, lojaId: movimento.lojaId } }
        });

        const quantidadeAnterior = estoque?.quantidade || 0;
        const quantidadeNova = quantidadeAnterior + movimento.quantidade;

        if (estoque) {
          await tx.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: quantidadeNova }
          });
        } else {
          await tx.estoque.create({
            data: {
              produtoId: movimento.produtoId,
              lojaId: movimento.lojaId,
              quantidade: quantidadeNova
            }
          });
        }

        await tx.logEstoque.create({
          data: {
            tipo: movimento.tipo,
            origem: movimento.origem,
            origemId: movimento.origemId,
            produtoId: movimento.produtoId,
            lojaId: movimento.lojaId,
            quantidade: movimento.quantidade,
            quantidadeAnterior,
            quantidadeNova,
            usuarioId: movimento.usuarioId
          }
        });

        return { success: true };
      });
    } catch (error) {
      console.error('Erro ao dar entrada no estoque:', error);
      return { success: false, error: 'Erro interno ao processar estoque' };
    }
  }

  static async verificarItensVenda(itens: Array<{ produtoId: number; quantidade: number }>, lojaId: number): Promise<{ valido: boolean; erros: string[] }> {
    const erros: string[] = [];

    for (const item of itens) {
      const { disponivel, estoqueAtual } = await this.verificarEstoque(item.produtoId, lojaId, item.quantidade);
      
      if (!disponivel) {
        const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
        erros.push(`${produto?.nome || 'Produto'}: estoque insuficiente (disponível: ${estoqueAtual}, solicitado: ${item.quantidade})`);
      }
    }

    return { valido: erros.length === 0, erros };
  }

  static async processarBaixaVenda(vendaId: number, itens: Array<{ produtoId: number; quantidade: number; unidadeFisicaId?: number }>, lojaId: number, usuarioId: number): Promise<ResultadoMovimento> {
    try {
      return await prisma.$transaction(async (tx) => {
        for (const item of itens) {
          if (item.unidadeFisicaId) {
            await tx.unidadeFisica.update({
              where: { id: item.unidadeFisicaId },
              data: { status: 'VENDIDA' }
            });
          }

          const estoque = await tx.estoque.findUnique({
            where: { produtoId_lojaId: { produtoId: item.produtoId, lojaId } },
            include: { produto: true }
          });

          if (!estoque) continue;

          const quantidadeAnterior = estoque.quantidade;
          const quantidadeNova = quantidadeAnterior - item.quantidade;

          if (quantidadeNova < 0) {
            throw new Error(`Estoque insuficiente para ${estoque.produto.nome}. Disponível: ${quantidadeAnterior}, Solicitado: ${item.quantidade}`);
          }

          await tx.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: quantidadeNova }
          });

          await tx.logEstoque.create({
            data: {
              tipo: 'VENDA',
              origem: 'VENDA',
              origemId: vendaId,
              produtoId: item.produtoId,
              lojaId,
              quantidade: -item.quantidade,
              quantidadeAnterior,
              quantidadeNova,
              usuarioId
            }
          });
        }

        return { success: true };
      });
    } catch (error: any) {
      console.error('Erro ao processar baixa de venda:', error);
      return { success: false, error: error.message || 'Erro ao processar estoque' };
    }
  }

  static async processarBaixaOS(osId: number, itens: Array<{ produtoId: number; quantidade: number }>, lojaId: number, usuarioId: number): Promise<ResultadoMovimento> {
    try {
      return await prisma.$transaction(async (tx) => {
        for (const item of itens) {
          const estoque = await tx.estoque.findUnique({
            where: { produtoId_lojaId: { produtoId: item.produtoId, lojaId } },
            include: { produto: true }
          });

          if (!estoque) continue;

          const quantidadeAnterior = estoque.quantidade;
          const quantidadeNova = quantidadeAnterior - item.quantidade;

          if (quantidadeNova < 0) {
            throw new Error(`Estoque insuficiente para ${estoque.produto.nome}. Disponível: ${quantidadeAnterior}, Solicitado: ${item.quantidade}`);
          }

          await tx.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: quantidadeNova }
          });

          await tx.logEstoque.create({
            data: {
              tipo: 'OS',
              origem: 'OS',
              origemId: osId,
              produtoId: item.produtoId,
              lojaId,
              quantidade: -item.quantidade,
              quantidadeAnterior,
              quantidadeNova,
              usuarioId
            }
          });
        }

        return { success: true };
      });
    } catch (error: any) {
      console.error('Erro ao processar baixa de O/S:', error);
      return { success: false, error: error.message || 'Erro ao processar estoque' };
    }
  }

  static async getProdutosDisponiveis(lojaId: number) {
    return prisma.produto.findMany({
      where: {
        ativo: true,
        estoques: {
          some: {
            lojaId,
            quantidade: { gt: 0 }
          }
        }
      },
      include: {
        estoques: {
          where: { lojaId }
        }
      }
    });
  }

  static async getEstoqueTodas() {
    const lojas = await prisma.loja.findMany({
      where: { ativo: true },
      include: {
        estoques: {
          where: { quantidade: { gt: 0 } },
          include: { produto: true }
        },
        grupo: { select: { nome: true } }
      }
    });

    return lojas.map(loja => {
      const motosEstoque = loja.estoques.filter(e => e.produto.tipo === 'MOTO');
      const pecasEstoque = loja.estoques.filter(e => e.produto.tipo === 'PECA');
      const motos = motosEstoque.reduce((acc, e) => acc + e.quantidade, 0);
      const pecas = pecasEstoque.reduce((acc, e) => acc + e.quantidade, 0);
      
      return {
        lojaId: loja.id,
        lojaNome: `${loja.grupo?.nome ? loja.grupo.nome + ' - ' : ''}${loja.nomeFantasia || loja.razaoSocial}`,
        motos,
        pecas,
        detalhesMotos: motosEstoque.map(e => ({
          produtoNome: e.produto.nome,
          quantidade: e.quantidade
        })),
        detalhesPecas: pecasEstoque.map(e => ({
          produtoNome: e.produto.nome,
          quantidade: e.quantidade
        })),
        ultimaAtualizacao: new Date()
      };
    });
  }

  static async getEstoqueGrupo(grupoId: number) {
    const lojas = await prisma.loja.findMany({
      where: { grupoId, ativo: true },
      include: {
        estoques: {
          where: { quantidade: { gt: 0 } },
          include: { produto: true }
        }
      }
    });

    return lojas.map(loja => {
      const motosEstoque = loja.estoques.filter(e => e.produto.tipo === 'MOTO');
      const pecasEstoque = loja.estoques.filter(e => e.produto.tipo === 'PECA');
      const motos = motosEstoque.reduce((acc, e) => acc + e.quantidade, 0);
      const pecas = pecasEstoque.reduce((acc, e) => acc + e.quantidade, 0);
      
      return {
        lojaId: loja.id,
        lojaNome: loja.nomeFantasia || loja.razaoSocial,
        motos,
        pecas,
        detalhesMotos: motosEstoque.map(e => ({
          produtoNome: e.produto.nome,
          quantidade: e.quantidade
        })),
        detalhesPecas: pecasEstoque.map(e => ({
          produtoNome: e.produto.nome,
          quantidade: e.quantidade
        })),
        ultimaAtualizacao: new Date()
      };
    });
  }
}

export default InventoryService;
