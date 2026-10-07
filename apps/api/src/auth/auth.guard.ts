import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import type { Request } from 'express';
import type { AccessPayload } from './auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Sessão necessária');
    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET inválido');
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('Token inválido');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { tokenVersion: true, emailVerifiedAt: true } });
      if (!user || user.tokenVersion !== (typeof payload.ver === 'number' ? payload.ver : 0)) throw new Error('Sessão revogada');
      if (process.env.NODE_ENV === 'production' && !user.emailVerifiedAt) throw new Error('Email não verificado');
      request.user = { sub: payload.sub, email: payload.email };
      return true;
    } catch { throw new UnauthorizedException('Sessão inválida ou expirada'); }
  }
}
