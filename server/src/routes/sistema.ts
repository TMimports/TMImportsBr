import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/reset', requireRole('ADMIN_GERAL'), async (req: AuthRequest, res: Response) => {
  try {
    const { confirmar } = req.body;
    
    if (confirmar !== 'RESETAR_SISTEMA') {
      return res.status(400).json({ error: 'Confirmação inválida' });
    }

    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "Caixa", "ContaPagar", "ContaReceber", "Comissao", "Garantia",
        "ItemVenda", "ItemOS", "Venda", "OrdemServico", "Estoque",
        "Transferencia", "UnidadeFisica", "Produto", "Servico", "Cliente",
        "User", "Loja", "Grupo", "Configuracao", "LogAuditoria", "Revisao"
      CASCADE
    `);

    const grupo = await prisma.grupo.create({
      data: { nome: 'Tecle Motos' }
    });

    const loja = await prisma.loja.create({
      data: {
        cnpj: '00.000.000/0001-00',
        razaoSocial: 'Tecle Motos Centro Ltda',
        nomeFantasia: 'Tecle Motos Centro',
        endereco: 'Rua Principal, 100 - Centro',
        telefone: '(11) 99999-9999',
        grupoId: grupo.id,
        comissaoMoto: 1,
        comissaoPecas: 3,
        comissaoServico: 10
      }
    });

    const senhas = {
      admin: await bcrypt.hash('admin123', 10),
      rede: await bcrypt.hash('rede123', 10),
      dono: await bcrypt.hash('dono123', 10),
      gerente: await bcrypt.hash('gerente123', 10),
      vendedor: await bcrypt.hash('vendedor123', 10),
      tecnico: await bcrypt.hash('tecnico123', 10)
    };

    await prisma.user.createMany({
      data: [
        { nome: 'Administrador Geral', email: 'admin@teclemotos.com', senha: senhas.admin, role: 'ADMIN_GERAL', lojaId: loja.id },
        { nome: 'Admin Rede', email: 'rede@teclemotos.com', senha: senhas.rede, role: 'ADMIN_REDE', lojaId: loja.id },
        { nome: 'Dono da Loja', email: 'dono@teclemotos.com', senha: senhas.dono, role: 'DONO_LOJA', lojaId: loja.id },
        { nome: 'Gerente Loja', email: 'gerente@teclemotos.com', senha: senhas.gerente, role: 'GERENTE_LOJA', lojaId: loja.id },
        { nome: 'Vendedor', email: 'vendedor@teclemotos.com', senha: senhas.vendedor, role: 'VENDEDOR', lojaId: loja.id },
        { nome: 'Técnico', email: 'tecnico@teclemotos.com', senha: senhas.tecnico, role: 'TECNICO', lojaId: loja.id }
      ]
    });

    await prisma.servico.createMany({
      data: [
        { nome: 'Revisão Completa', preco: 150.00, duracao: 120 },
        { nome: 'Troca de Bateria', preco: 80.00, duracao: 30 },
        { nome: 'Troca de Pneu', preco: 50.00, duracao: 45 },
        { nome: 'Regulagem de Freios', preco: 40.00, duracao: 30 },
        { nome: 'Diagnóstico Elétrico', preco: 100.00, duracao: 60 },
        { nome: 'Instalação de Acessórios', preco: 60.00, duracao: 45 }
      ]
    });

    await prisma.configuracao.create({
      data: {
        comissaoVendedorMoto: 1,
        comissaoTecnico: 25,
        comissaoPecaHabilitada: false,
        periodoComissao: 'MENSAL',
        descontoMaxMoto: 3.5,
        descontoMaxPeca: 10,
        descontoMaxServico: 10,
        descontoMaxOS: 10
      }
    });

    res.json({ success: true, message: 'Sistema resetado com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar sistema:', error);
    res.status(500).json({ error: 'Erro ao resetar sistema' });
  }
});

export default router;
