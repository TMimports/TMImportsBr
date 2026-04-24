import { prisma } from '../index.js';

export interface LogParams {
  usuarioId?: number | null;
  userName?: string;
  userRole?: string;
  acao: string;
  entidade?: string;
  entidadeId?: number | null;
  detalhes?: string;
  ip?: string;
}

export async function registrarLog(params: LogParams): Promise<void> {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId:  params.usuarioId  ?? null,
        userName:   params.userName   ?? null,
        userRole:   params.userRole   ?? null,
        acao:       params.acao,
        entidade:   params.entidade   ?? '',
        entidadeId: params.entidadeId ?? null,
        detalhes:   params.detalhes   ?? null,
        ip:         params.ip         ?? null,
      },
    });
  } catch (err) {
    console.warn('[LogService] Falha ao registrar log:', (err as Error).message?.slice(0, 120));
  }
}

export function obterIp(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}
