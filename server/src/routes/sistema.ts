import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { AuthRequest, verifyToken, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/reset', verifyToken, requireRole('ADMIN_GERAL'), async (req: AuthRequest, res: Response) => {
  try {
    const { confirmar } = req.body;
    
    if (confirmar !== 'RESETAR_SISTEMA') {
      return res.status(400).json({ error: 'Confirmação inválida' });
    }

    // Deletar na ordem correta (respeitando foreign keys)
    await prisma.comissao.deleteMany({});
    await prisma.logAuditoria.deleteMany({});
    await prisma.logEstoque.deleteMany({});
    await prisma.logConfiguracao.deleteMany({});
    await prisma.caixa.deleteMany({});
    await prisma.contaPagar.deleteMany({});
    await prisma.contaReceber.deleteMany({});
    await prisma.revisao.deleteMany({});
    await prisma.garantia.deleteMany({});
    await prisma.itemOS.deleteMany({});
    await prisma.ordemServico.deleteMany({});
    await prisma.itemVenda.deleteMany({});
    await prisma.venda.deleteMany({});
    await prisma.transferencia.deleteMany({});
    await prisma.estoque.deleteMany({});
    await prisma.unidadeFisica.deleteMany({});
    await prisma.produto.deleteMany({});
    await prisma.servico.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.loja.deleteMany({});
    await prisma.grupo.deleteMany({});
    await prisma.configuracao.deleteMany({});

    const senhaAdmin = await bcrypt.hash('123456', 10);

    await prisma.user.create({
      data: {
        nome: 'Admin Geral',
        email: 'admin@teclemotos.com',
        senha: senhaAdmin,
        role: 'ADMIN_GERAL',
        ativo: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Sistema resetado. Banco completamente limpo. Apenas o admin foi recriado.',
      credenciais: {
        email: 'admin@teclemotos.com',
        senha: '123456'
      }
    });
  } catch (error: any) {
    console.error('Erro ao resetar sistema:', error);
    res.status(500).json({ error: 'Erro ao resetar sistema: ' + error.message });
  }
});

export default router;
