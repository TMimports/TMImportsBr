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

export const prisma = new PrismaClient();

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors());
app.use(express.json());

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

if (!isDev) {
  app.use(express.static(path.join(process.cwd(), 'client/dist')));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'client/dist/index.html'));
    }
  });
}

const PORT = isDev ? 3001 : Number(process.env.PORT || 5000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ${isDev ? 'DEV' : 'PROD'} rodando em http://0.0.0.0:${PORT}`);
});
