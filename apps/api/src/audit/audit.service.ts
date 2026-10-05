import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  write(input: { schoolId: string; actorId: string; action: string; entity: string; recordId?: string; details?: Record<string, unknown> }) {
    return this.prisma.auditEvent.create({ data: { ...input, details: input.details as Prisma.InputJsonObject | undefined } });
  }
  async list(userId: string, schoolId: string, limit = 100) {
    const membership = await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId, schoolId } } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta escola');
    if (!['OWNER', 'ADMIN', 'COORDINATOR'].includes(membership.role)) throw new ForbiddenException('Apenas a administração pode consultar o registo de atividade');
    return this.prisma.auditEvent.findMany({ where: { schoolId }, take: Math.max(1, Math.min(200, limit)), include: { actor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  }
}
