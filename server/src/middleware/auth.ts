import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET env var must be set in production'); })()
    : 'tecle-motos-dev-secret'
);

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  role: Role;
  grupoId: number | null;
  lojaId: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nome: true, role: true, grupoId: true, lojaId: true, ativo: true }
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
}

export function requireAdminGeral(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN_GERAL') {
    return res.status(403).json({ error: 'Acesso restrito ao Administrador Geral' });
  }
  next();
}

export function requireAdminRede(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !['ADMIN_GERAL', 'ADMIN_REDE'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito a Administradores' });
  }
  next();
}

export function requireGestorUsuarios(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !['ADMIN_GERAL', 'ADMIN_REDE', 'DONO_LOJA'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

export function applyTenantFilter(req: AuthRequest): { grupoId?: number; lojaId?: number } {
  const { role, grupoId, lojaId } = req.user!;

  if (role === 'ADMIN_GERAL') {
    return {};
  }

  if (role === 'ADMIN_REDE' || role === 'ADMIN_FINANCEIRO') {
    return {};
  }

  if (role === 'DONO_LOJA' && grupoId) {
    return { grupoId };
  }

  if (lojaId) {
    return { lojaId };
  }

  return {};
}
