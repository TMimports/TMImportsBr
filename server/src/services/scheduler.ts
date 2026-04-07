import cron from 'node-cron';
import { dispararRelatoriosPorRole } from './relatorios.js';
import { gerarDisparosMotivacioanis } from './whatsapp.js';

export function iniciarScheduler() {
  // Semanal: toda segunda-feira às 07:00
  cron.schedule('0 7 * * 1', async () => {
    console.log('[SCHEDULER] Iniciando envio de relatórios SEMANAIS...');
    try {
      await dispararRelatoriosPorRole('SEMANAL');
    } catch (err) {
      console.error('[SCHEDULER] Erro nos relatórios semanais:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Mensal: todo dia 1 às 07:30
  cron.schedule('30 7 1 * *', async () => {
    console.log('[SCHEDULER] Iniciando envio de relatórios MENSAIS...');
    try {
      await dispararRelatoriosPorRole('MENSAL');
    } catch (err) {
      console.error('[SCHEDULER] Erro nos relatórios mensais:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Diário: toda segunda a sexta às 08:00 — mensagens motivacionais WhatsApp para vendedores
  cron.schedule('0 8 * * 1-5', async () => {
    console.log('[SCHEDULER] Gerando disparos motivacionais WhatsApp para vendedores...');
    try {
      const resultado = await gerarDisparosMotivacioanis();
      console.log(`[SCHEDULER] ${resultado.total} disparos motivacionais criados.`);
    } catch (err) {
      console.error('[SCHEDULER] Erro nos disparos motivacionais:', err);
    }
  }, { timezone: 'America/Sao_Paulo' });

  console.log('[SCHEDULER] Agendador iniciado — Relatórios: seg 07:00, dia-1 07:30 | WhatsApp motivacional: seg-sex 08:00 (BRT)');
}
