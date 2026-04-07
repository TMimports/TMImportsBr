import cron from 'node-cron';
import { dispararRelatoriosPorRole } from './relatorios.js';

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

  console.log('[SCHEDULER] Agendador de relatórios iniciado — Semanal: seg 07:00 | Mensal: dia 1 às 07:30 (Horário de Brasília)');
}
