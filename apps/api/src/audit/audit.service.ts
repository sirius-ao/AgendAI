import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  write(input: { schoolId: string; actorId: string; action: string; entity: string; recordId?: string; details?: Record<string, unknown> }) {
    return this.prisma.auditEvent.create({ data: { ...input, details: input.details as Prisma.InputJsonObject | undefined } });
  }
  async list(userId: string, schoolId: string, requestedLimit = 10, cursor?: string) {
    const membership = await this.prisma.schoolMembership.findFirst({ where: { userId, schoolId, school: { isActive: true } } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta escola');
    if (!['OWNER', 'ADMIN', 'COORDINATOR'].includes(membership.role)) throw new ForbiddenException('Apenas a administração pode consultar o registo de atividade');
    if (cursor && !(await this.prisma.auditEvent.findFirst({ where: { id: cursor, schoolId }, select: { id: true } })))
      throw new NotFoundException('O ponto de paginação não existe nesta escola');
    const limit = Math.max(1, Math.min(50, requestedLimit));
    const [rows, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { schoolId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.auditEvent.count({ where: { schoolId } }),
    ]);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return { items, total, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
  }
}
