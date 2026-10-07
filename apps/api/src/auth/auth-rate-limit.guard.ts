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
    const request = context.switchToHttp().getRequest<Request>();
    const route = `${request.method}:${request.route?.path || request.path}`;
    const policy = route.includes('register')
      ? 5
      : route.includes('refresh')
        ? 30
        : route.includes('public/shared/plans')
          ? 120
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
    if (now >= this.cleanupAfter) {
      this.cleanupAfter = now + WINDOW_MS;
      void this.prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch((error: unknown) => this.logger.warn(`Rate limit cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}`));
    }
    return true;
  }
}
