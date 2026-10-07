import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';

const managers = new Set(['OWNER', 'ADMIN', 'COORDINATOR']);
const stringValue = (value: unknown) => (typeof value === 'string' ? value : '');
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class PlanSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schools: SchoolsService,
  ) {}

  private async planForMember(userId: string, schoolId: string, planId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const row = await this.prisma.dashboardRecord.findUnique({
      where: {
        schoolId_collection_recordId: {
          schoolId,
          collection: DashboardCollection.PLANS,
          recordId: planId,
        },
      },
    });
    if (!row) throw new NotFoundException('Plano não encontrado');
    const payload = row.payload as Record<string, unknown>;
    if (
      !managers.has(membership.role) &&
      row.createdById !== userId &&
      payload.teacherId !== userId
    )
      throw new ForbiddenException('Só pode partilhar um plano criado por si');
    return { membership, row, payload };
  }

  async create(userId: string, schoolId: string, planId: string) {
    await this.planForMember(userId, schoolId, planId);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.sharedPlanLink.updateMany({
      where: { schoolId, recordId: planId, createdById: userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const link = await this.prisma.sharedPlanLink.create({
      data: {
        schoolId,
        recordId: planId,
        createdById: userId,
        tokenHash: tokenHash(token),
        expiresAt,
      },
      select: { id: true, createdAt: true, expiresAt: true },
    });
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_APP_URL || 'https://agendaki.net';
    return {
      ...link,
      revokedAt: null,
      url: new URL(`/partilha/plano/${token}`, siteUrl).toString(),
    };
  }

  async list(userId: string, schoolId: string, planId: string) {
    const { membership } = await this.planForMember(userId, schoolId, planId);
    return this.prisma.sharedPlanLink.findMany({
      where: {
        schoolId,
        recordId: planId,
        ...(!managers.has(membership.role) ? { createdById: userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdById: true, createdAt: true, expiresAt: true, revokedAt: true },
    });
  }

  async revoke(userId: string, schoolId: string, planId: string, linkId: string) {
    const { membership } = await this.planForMember(userId, schoolId, planId);
    const link = await this.prisma.sharedPlanLink.findFirst({
      where: { id: linkId, schoolId, recordId: planId },
    });
    if (!link) throw new NotFoundException('Link de partilha não encontrado');
    if (link.createdById !== userId && !managers.has(membership.role))
      throw new ForbiddenException('Só o autor ou a administração pode revogar este link');
    if (!link.revokedAt)
      await this.prisma.sharedPlanLink.update({
        where: { id: link.id },
        data: { revokedAt: new Date() },
      });
    return { success: true };
  }

  async publicPlan(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new NotFoundException('Este link não está disponível');
    const link = await this.prisma.sharedPlanLink.findFirst({
      where: { tokenHash: tokenHash(token), revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!link) throw new NotFoundException('Este link expirou ou foi revogado');
    const [row, author] = await Promise.all([
      this.prisma.dashboardRecord.findUnique({
        where: {
          schoolId_collection_recordId: {
            schoolId: link.schoolId,
            collection: DashboardCollection.PLANS,
            recordId: link.recordId,
          },
        },
      }),
      this.prisma.user.findUnique({ where: { id: link.createdById }, select: { name: true } }),
    ]);
    if (!row) throw new NotFoundException('Este plano já não está disponível');
    const plan = row.payload as Record<string, unknown>;
    const classId = stringValue(plan.classId);
    const classRow = classId
      ? await this.prisma.dashboardRecord.findUnique({
          where: {
            schoolId_collection_recordId: {
              schoolId: link.schoolId,
              collection: DashboardCollection.CLASSES,
              recordId: classId,
            },
          },
          select: { payload: true },
        })
      : null;
    const classPayload = classRow?.payload as Record<string, unknown> | undefined;
    const name = (key: string) => stringValue(plan[key]);
    return {
      title: name('title') || name('subject') || 'Plano de aula',
      subject: name('subject'),
      className: name('className') || stringValue(classPayload?.name),
      date: name('date'),
      startTime: name('startTime') || name('time'),
      duration: typeof plan.duration === 'number' ? plan.duration : null,
      authorName: author?.name || 'Professor AgendAKI',
      expiresAt: link.expiresAt,
      sections: [
        { title: 'Objetivos', content: name('objectives') },
        { title: 'Conteúdo', content: name('content') || name('topic') },
        { title: 'Metodologia', content: name('methodology') },
        { title: 'Recursos', content: name('resources') },
        { title: 'Avaliação', content: name('evaluation') },
      ].filter((section) => section.content.trim()),
    };
  }
}
