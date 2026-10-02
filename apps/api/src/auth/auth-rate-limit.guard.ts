import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

type Bucket = { started: number; hits: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60_000;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const route = `${request.method}:${request.route?.path || request.path}`;
    const policy = route.includes('register') ? 5 : route.includes('refresh') ? 30 : 12;
    const key = `${request.ip || 'unknown'}:${route}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.started >= WINDOW_MS) buckets.set(key, { started: now, hits: 1 });
    else if (++bucket.hits > policy) throw new HttpException('Demasiadas tentativas. Aguarde 15 minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    if (buckets.size > 5000) for (const [id, entry] of buckets) if (now - entry.started > WINDOW_MS) buckets.delete(id);
    return true;
  }
}
