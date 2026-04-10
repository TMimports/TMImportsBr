// ─── Z-API Integration ────────────────────────────────────────────────────────
// Sends real WhatsApp messages via Z-API (wa.me links remain as fallback)

const INSTANCE_ID    = process.env.ZAPI_INSTANCE_ID    || '';
const INSTANCE_TOKEN = process.env.ZAPI_INSTANCE_TOKEN || '';
const CLIENT_TOKEN   = process.env.ZAPI_CLIENT_TOKEN   || '';

const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}`;

function limparNumero(tel: string): string {
  const digits = tel.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return `55${digits}`;
}

export interface ZApiSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function zapiEnviarMensagem(
  numero: string,
  mensagem: string,
): Promise<ZApiSendResult> {
  if (!INSTANCE_ID || !INSTANCE_TOKEN || !CLIENT_TOKEN) {
    console.warn('[Z-API] Credenciais não configuradas — pulando envio real');
    return { success: false, error: 'Credenciais Z-API não configuradas' };
  }

  const phone = limparNumero(numero);

  try {
    const res = await fetch(`${BASE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Client-Token':  CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message: mensagem }),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error('[Z-API] Erro HTTP', res.status, json);
      return { success: false, error: json?.message || `HTTP ${res.status}` };
    }

    // Z-API returns { zaapId, messageId, id } on success
    const msgId = json?.zaapId || json?.messageId || json?.id || 'sent';
    console.log(`[Z-API] Mensagem enviada para ${phone} → ${msgId}`);
    return { success: true, messageId: String(msgId) };
  } catch (err: any) {
    console.error('[Z-API] Erro de rede:', err.message);
    return { success: false, error: err.message };
  }
}

export async function zapiVerificarStatus(): Promise<{ connected: boolean; phone?: string; error?: string }> {
  if (!INSTANCE_ID || !INSTANCE_TOKEN || !CLIENT_TOKEN) {
    return { connected: false, error: 'Credenciais não configuradas' };
  }

  try {
    const res = await fetch(`${BASE_URL}/status`, {
      headers: { 'Client-Token': CLIENT_TOKEN },
    });
    const json = await res.json() as any;
    return {
      connected: json?.connected === true || json?.status === 'connected',
      phone: json?.phone || json?.number,
    };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
