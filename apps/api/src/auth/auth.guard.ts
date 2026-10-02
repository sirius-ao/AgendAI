import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import type { Request } from 'express';
import type { AccessPayload } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Sessão necessária');
    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET inválido');
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('Token inválido');
      request.user = { sub: payload.sub, email: payload.email };
      return true;
    } catch { throw new UnauthorizedException('Sessão inválida ou expirada'); }
  }
}
