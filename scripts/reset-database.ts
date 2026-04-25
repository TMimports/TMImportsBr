import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('\n🚨 INICIANDO RESET COMPLETO DO BANCO DE DADOS...\n');

  // Trunca todas as tabelas em ordem segura usando CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "DisparoWhatsApp",
      "LeadInteracao",
      "Lead",
      "TemplateWhatsApp",
      "LancamentoBancario",
      "ContaBancaria",
      "ItemNotaFiscal",
      "NotaFiscal",
      "InteracaoCRM",
      "Recebimento",
      "Pagamento",
      "ParcelaContaReceber",
      "ParcelaContaPagar",
      "ContaReceber",
      "ContaPagar",
      "Caixa",
      "Revisao",
      "Garantia",
      "ItemOS",
      "OrdemServico",
      "ItemVenda",
      "Venda",
      "AuditoriaEstoque",
      "LogEstoque",
      "Estoque",
      "Transferencia",
      "UnidadeFisica",
      "ItemPedidoCompra",
      "PedidoCompra",
      "Produto",
      "Servico",
      "Fornecedor",
      "Cliente",
      "Comissao",
      "LogAuditoria",
      "LogConfiguracao",
      "Configuracao",
      "CategoriaFinanceira",
      "Departamento",
      "User",
      "Loja",
      "Grupo"
    RESTART IDENTITY CASCADE
  `);

  console.log('✅ Todas as tabelas foram limpas.\n');

  // Recriar usuário SUPER_ADMIN
  const senhaSA = await bcrypt.hash('TM@master2024', 10);
  await prisma.user.create({
    data: {
      nome: 'TM Master',
      email: 'master@tmimports.com.br',
      senha: senhaSA,
      role: 'SUPER_ADMIN' as any,
      ativo: true,
    },
  });
  console.log('✅ SUPER_ADMIN recriado: master@tmimports.com.br / TM@master2024');

  // Recriar usuário ADMIN_GERAL padrão
  const senhaAdmin = await bcrypt.hash('123456', 10);
  await prisma.user.create({
    data: {
      nome: 'Admin Geral',
      email: 'admin@teclemotos.com',
      senha: senhaAdmin,
      role: 'ADMIN_GERAL',
      ativo: true,
    },
  });
  console.log('✅ ADMIN_GERAL recriado: admin@teclemotos.com / 123456');

  console.log('\n🎉 RESET CONCLUÍDO! Sistema zerado e pronto para entrega.\n');
}

resetDatabase()
  .catch((e) => {
    console.error('❌ Erro durante o reset:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
