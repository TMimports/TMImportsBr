import { Router } from 'express';
import { prisma } from '../index.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/public', async (req: AuthRequest, res) => {
  try {
    let config = await prisma.configuracao.findFirst();
    if (!config) {
      config = await prisma.configuracao.create({ data: {} });
    }
    res.json({
      descontoMaxMoto: config.descontoMaxMoto,
      descontoMaxPeca: config.descontoMaxPeca,
      descontoMaxServico: config.descontoMaxServico,
      descontoMaxOS: config.descontoMaxOS
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/', requireRole('ADMIN_GERAL'), async (req: AuthRequest, res) => {
  try {
    let config = await prisma.configuracao.findFirst();
    
    if (!config) {
      config = await prisma.configuracao.create({
        data: {}
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/', requireRole('ADMIN_GERAL'), async (req: AuthRequest, res) => {
  try {
    const { 
      comissaoVendedorMoto, 
      comissaoTecnico, 
      comissaoPecaHabilitada,
      periodoComissao,
      descontoMaxMoto,
      descontoMaxPeca,
      descontoMaxServico,
      descontoMaxOS,
      lucroMoto,
      lucroPeca
    } = req.body;

    let config = await prisma.configuracao.findFirst();
    
    if (!config) {
      config = await prisma.configuracao.create({ data: {} });
    }

    const camposAlterados: Array<{ campo: string; antes: string; depois: string }> = [];

    const novosDados: any = {};

    if (comissaoVendedorMoto !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(comissaoVendedorMoto)));
      if (Number(config.comissaoVendedorMoto) !== valor) {
        camposAlterados.push({
          campo: 'comissaoVendedorMoto',
          antes: String(config.comissaoVendedorMoto),
          depois: String(valor)
        });
        novosDados.comissaoVendedorMoto = valor;
      }
    }

    if (comissaoTecnico !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(comissaoTecnico)));
      if (Number(config.comissaoTecnico) !== valor) {
        camposAlterados.push({
          campo: 'comissaoTecnico',
          antes: String(config.comissaoTecnico),
          depois: String(valor)
        });
        novosDados.comissaoTecnico = valor;
      }
    }

    if (comissaoPecaHabilitada !== undefined) {
      if (config.comissaoPecaHabilitada !== comissaoPecaHabilitada) {
        camposAlterados.push({
          campo: 'comissaoPecaHabilitada',
          antes: String(config.comissaoPecaHabilitada),
          depois: String(comissaoPecaHabilitada)
        });
        novosDados.comissaoPecaHabilitada = comissaoPecaHabilitada;
      }
    }

    if (periodoComissao !== undefined) {
      if (config.periodoComissao !== periodoComissao) {
        camposAlterados.push({
          campo: 'periodoComissao',
          antes: config.periodoComissao,
          depois: periodoComissao
        });
        novosDados.periodoComissao = periodoComissao;
      }
    }

    if (descontoMaxMoto !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(descontoMaxMoto)));
      if (Number(config.descontoMaxMoto) !== valor) {
        camposAlterados.push({
          campo: 'descontoMaxMoto',
          antes: String(config.descontoMaxMoto),
          depois: String(valor)
        });
        novosDados.descontoMaxMoto = valor;
      }
    }

    if (descontoMaxPeca !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(descontoMaxPeca)));
      if (Number(config.descontoMaxPeca) !== valor) {
        camposAlterados.push({
          campo: 'descontoMaxPeca',
          antes: String(config.descontoMaxPeca),
          depois: String(valor)
        });
        novosDados.descontoMaxPeca = valor;
      }
    }

    if (descontoMaxServico !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(descontoMaxServico)));
      if (Number(config.descontoMaxServico) !== valor) {
        camposAlterados.push({
          campo: 'descontoMaxServico',
          antes: String(config.descontoMaxServico),
          depois: String(valor)
        });
        novosDados.descontoMaxServico = valor;
      }
    }

    if (descontoMaxOS !== undefined) {
      const valor = Math.max(0, Math.min(100, Number(descontoMaxOS)));
      if (Number(config.descontoMaxOS) !== valor) {
        camposAlterados.push({
          campo: 'descontoMaxOS',
          antes: String(config.descontoMaxOS),
          depois: String(valor)
        });
        novosDados.descontoMaxOS = valor;
      }
    }

    if (lucroMoto !== undefined) {
      const valor = Math.max(0, Math.min(500, Number(lucroMoto)));
      if (Number(config.lucroMoto) !== valor) {
        camposAlterados.push({
          campo: 'lucroMoto',
          antes: String(config.lucroMoto),
          depois: String(valor)
        });
        novosDados.lucroMoto = valor;
      }
    }

    if (lucroPeca !== undefined) {
      const valor = Math.max(0, Math.min(500, Number(lucroPeca)));
      if (Number(config.lucroPeca) !== valor) {
        camposAlterados.push({
          campo: 'lucroPeca',
          antes: String(config.lucroPeca),
          depois: String(valor)
        });
        novosDados.lucroPeca = valor;
      }
    }

    if (Object.keys(novosDados).length > 0) {
      config = await prisma.configuracao.update({
        where: { id: config.id },
        data: novosDados
      });

      for (const alteracao of camposAlterados) {
        await prisma.logConfiguracao.create({
          data: {
            campo: alteracao.campo,
            valorAnterior: alteracao.antes,
            valorNovo: alteracao.depois,
            usuarioId: req.user!.id
          }
        });
      }
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/logs', async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.logConfiguracao.findMany({
      include: { usuario: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
