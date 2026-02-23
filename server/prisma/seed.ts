import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  const senhaHash = await bcrypt.hash('123456', 10);

  const grupo = await prisma.grupo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Tecle Motos',
    }
  });

  console.log('Grupo criado:', grupo.nome);

  const loja = await prisma.loja.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      cnpj: '12345678000190',
      razaoSocial: 'Tecle Motos Ltda',
      nomeFantasia: 'Tecle Motos Centro',
      endereco: 'Rua Principal, 100, Centro',
      telefone: '11999999999',
      email: 'contato@teclemotos.com',
      grupoId: grupo.id
    }
  });

  console.log('Loja criada:', loja.nomeFantasia);

  const usuarios = [
    { nome: 'Admin Geral', email: 'admin@teclemotos.com', role: Role.ADMIN_GERAL, grupoId: null, lojaId: null },
    { nome: 'Admin Rede', email: 'rede@teclemotos.com', role: Role.ADMIN_REDE, grupoId: null, lojaId: null },
    { nome: 'Dono Loja', email: 'dono@teclemotos.com', role: Role.DONO_LOJA, grupoId: grupo.id, lojaId: null },
    { nome: 'Gerente Loja', email: 'gerente@teclemotos.com', role: Role.GERENTE_LOJA, grupoId: grupo.id, lojaId: loja.id },
    { nome: 'Vendedor', email: 'vendedor@teclemotos.com', role: Role.VENDEDOR, grupoId: grupo.id, lojaId: loja.id }
  ];

  for (const u of usuarios) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nome: u.nome,
        email: u.email,
        senha: senhaHash,
        role: u.role,
        grupoId: u.grupoId,
        lojaId: u.lojaId
      }
    });
    console.log('Usuário criado:', u.email);
  }

  const servicosPorTempo = [
    { nome: 'Mão de Obra 15min', preco: 70, duracao: 15 },
    { nome: 'Mão de Obra 30min', preco: 140, duracao: 30 },
    { nome: 'Mão de Obra 45min', preco: 270, duracao: 45 },
    { nome: 'Mão de Obra 60min', preco: 330, duracao: 60 }
  ];

  const servicosFixos = [
    { nome: 'Revitalização', preco: 1290, duracao: null },
    { nome: 'Manutenção Motor', preco: 1200, duracao: null },
    { nome: 'Manutenção Módulo', preco: 1000, duracao: null },
    { nome: 'Revisão', preco: 350, duracao: null },
    { nome: 'Pneu Dianteiro', preco: 150, duracao: null },
    { nome: 'Pneu Traseiro', preco: 290, duracao: null },
    { nome: 'Solda', preco: 250, duracao: null }
  ];

  const servicosExistentes = await prisma.servico.count();
  if (servicosExistentes === 0) {
    for (const s of [...servicosPorTempo, ...servicosFixos]) {
      await prisma.servico.create({ data: s });
    }
    console.log('Serviços criados:', servicosPorTempo.length + servicosFixos.length);
  }

  const configExistente = await prisma.configuracao.count();
  if (configExistente === 0) {
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
    console.log('Configurações criadas');
  }

  console.log('Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
