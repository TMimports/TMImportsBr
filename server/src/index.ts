import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import gruposRoutes from './routes/grupos.js';
import lojasRoutes from './routes/lojas.js';
import usuariosRoutes from './routes/usuarios.js';
import produtosRoutes from './routes/produtos.js';
import servicosRoutes from './routes/servicos.js';
import unidadesRoutes from './routes/unidades.js';
import estoqueRoutes from './routes/estoque.js';
import clientesRoutes from './routes/clientes.js';
import vendasRoutes from './routes/vendas.js';
import osRoutes from './routes/ordens-servico.js';
import financeiroRoutes from './routes/financeiro.js';
import comissoesRoutes from './routes/comissoes.js';
import dashboardRoutes from './routes/dashboard.js';
import garantiasRoutes from './routes/garantias.js';
import transferenciasRoutes from './routes/transferencias.js';
import importacaoRoutes from './routes/importacao.js';
import rankingRoutes from './routes/ranking.js';
import franqueadosRoutes from './routes/franqueados.js';
import sistemaRoutes from './routes/sistema.js';
import configuracoesRoutes from './routes/configuracoes.js';

export const prisma = new PrismaClient();

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors());
app.use(express.json());

app.get('/api/setup', async (req, res) => {
  try {
    const bcrypt = await import('bcryptjs');
    let admin = await prisma.user.findFirst({ where: { email: 'admin@teclemotos.com' } });
    
    if (!admin) {
      let grupo = await prisma.grupo.findFirst();
      if (!grupo) {
        grupo = await prisma.grupo.create({ data: { nome: 'Tecle Motos' } });
      }
      let loja = await prisma.loja.findFirst();
      if (!loja) {
        loja = await prisma.loja.create({
          data: {
            cnpj: '00.000.000/0001-00',
            razaoSocial: 'Tecle Motos Centro Ltda',
            nomeFantasia: 'Tecle Motos Centro',
            endereco: 'Rua Principal, 100',
            telefone: '(11) 99999-9999',
            grupoId: grupo.id
          }
        });
      }
      const senha = await bcrypt.default.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          nome: 'Admin Geral',
          email: 'admin@teclemotos.com',
          senha,
          role: 'ADMIN_GERAL',
          ativo: true
        }
      });
      res.json({ status: 'Admin criado!', email: 'admin@teclemotos.com', senha: 'admin123' });
    } else {
      const senha = await bcrypt.default.hash('admin123', 10);
      await prisma.user.update({ where: { id: admin.id }, data: { senha, ativo: true } });
      res.json({ status: 'Senha resetada!', email: 'admin@teclemotos.com', senha: 'admin123' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/lojas', lojasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/os', osRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/comissoes', comissoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/garantias', garantiasRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/importacao', importacaoRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/franqueados', franqueadosRoutes);
app.use('/api/sistema', sistemaRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

if (!isDev) {
  app.use(express.static(path.join(process.cwd(), 'client/dist')));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'client/dist/index.html'));
    }
  });
}

const PORT = isDev ? 3001 : 5000;

async function initializeDatabase() {
  const bcrypt = await import('bcryptjs');
  
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Banco vazio, inicializando dados...');
    
    let grupo = await prisma.grupo.findFirst();
    if (!grupo) {
      grupo = await prisma.grupo.create({ data: { nome: 'Tecle Motos' } });
    }

    let loja = await prisma.loja.findFirst();
    if (!loja) {
      loja = await prisma.loja.create({
        data: {
          cnpj: '00.000.000/0001-00',
          razaoSocial: 'Tecle Motos Centro Ltda',
          nomeFantasia: 'Tecle Motos Centro',
          endereco: 'Rua Principal, 100 - Centro',
          telefone: '(11) 99999-9999',
          grupoId: grupo.id
        }
      });
    }

    const senhaAdmin = await bcrypt.default.hash('admin123', 10);
    await prisma.user.create({
      data: {
        nome: 'Administrador Geral',
        email: 'admin@teclemotos.com',
        senha: senhaAdmin,
        role: 'ADMIN_GERAL',
        lojaId: loja.id
      }
    });

    console.log('Dados iniciais criados! Login: admin@teclemotos.com / admin123');
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor ${isDev ? 'DEV' : 'PROD'} rodando em http://0.0.0.0:${PORT}`);
  await initializeDatabase();
});
