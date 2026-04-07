import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

export async function sendEmail(to: string | string[], subject: string, html: string, attachments?: any[]) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[EMAIL] SMTP_USER ou SMTP_PASS não configurados. Email não enviado.');
    return false;
  }

  const transporter = createTransporter();

  try {
    await transporter.sendMail({
      from: `TM Imports ERP <${SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      attachments
    });
    console.log(`[EMAIL] Enviado para: ${Array.isArray(to) ? to.join(', ') : to} | Assunto: ${subject}`);
    return true;
  } catch (err: any) {
    console.error('[EMAIL] Erro ao enviar:', err.message);
    return false;
  }
}

export async function testarEmail(to: string): Promise<{ ok: boolean; erro?: string }> {
  if (!SMTP_USER || !SMTP_PASS) {
    return { ok: false, erro: 'SMTP_USER ou SMTP_PASS não configurados' };
  }
  const transporter = createTransporter();
  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `TM Imports ERP <${SMTP_USER}>`,
      to,
      subject: '✅ Teste de Email — TM Imports ERP',
      html: `<div style="font-family:sans-serif;padding:20px;">
        <h2 style="color:#f97316;">TM Imports ERP</h2>
        <p>Email de teste enviado com sucesso! O sistema de relatórios automáticos está configurado corretamente.</p>
        <p style="color:#666;font-size:12px;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>`
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, erro: err.message };
  }
}
