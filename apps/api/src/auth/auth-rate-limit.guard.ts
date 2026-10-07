import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

const WINDOW_MS = 15 * 60_000;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);
  private cleanupAfter = 0;
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: { sub?: string } }>();
    const route = `${request.method}:${request.route?.path || request.path}`;
    const policy = route.includes('register')
      ? 5
      : route.includes('login')
        ? 12
        : route.includes('password/forgot') || route.includes('verify-email/resend')
          ? 6
          : route.includes('refresh')
            ? 30
            : route.includes('public/shared/plans')
              ? 120
              : route.includes('/attachments/upload')
                ? 5
                : 12;
    const now = Date.now();
    const window = Math.floor(now / WINDOW_MS);
    const key = createHash('sha256').update(`${request.ip || 'unknown'}:${route}:${window}`).digest('hex');
    const bucket = await this.prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, hits: 1, expiresAt: new Date((window + 1) * WINDOW_MS) },
      update: { hits: { increment: 1 } },
      select: { hits: true },
    });
    if (bucket.hits > policy) throw new HttpException('Demasiadas tentativas. Aguarde 15 minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    const email = (request.body as { email?: unknown } | undefined)?.email;
    const accountEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : undefined;
    const accountLimit = accountEmail
      ? route.includes('login') ? 10
        : route.includes('password/forgot') || route.includes('verify-email/resend') ? 3
          : route.includes('register') ? 5 : undefined
      : undefined;
    if (accountLimit !== undefined) {
      const accountKey = createHash('sha256').update(`account:${accountEmail}:${route}:${window}`).digest('hex');
      const accountBucket = await this.prisma.rateLimitBucket.upsert({
        where: { key: accountKey },
        create: { key: accountKey, hits: 1, expiresAt: new Date((window + 1) * WINDOW_MS) },
        update: { hits: { increment: 1 } },
        select: { hits: true },
      });
      if (accountBucket.hits > accountLimit) throw new HttpException('Demasiadas tentativas para este endereço. Aguarde 15 minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (request.user?.sub) {
      const userKey = createHash('sha256').update(`user:${request.user.sub}:${route}:${window}`).digest('hex');
      const userBucket = await this.prisma.rateLimitBucket.upsert({
        where: { key: userKey },
        create: { key: userKey, hits: 1, expiresAt: new Date((window + 1) * WINDOW_MS) },
        update: { hits: { increment: 1 } },
        select: { hits: true },
      });
      const userLimit = route.includes('/attachments/upload') ? 5 : policy;
      if (userBucket.hits > userLimit) throw new HttpException('Demasiados pedidos para esta conta. Aguarde 15 minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (now >= this.cleanupAfter) {
      this.cleanupAfter = now + WINDOW_MS;
      void this.prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch((error: unknown) => this.logger.warn(`Rate limit cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}`));
    }
    return true;
  }
}
