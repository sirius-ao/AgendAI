import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import type { SaveDashboardRecordDto } from './dashboard-data.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';

const collections = new Map<string, DashboardCollection>([
  ['subjects', DashboardCollection.SUBJECTS], ['plans', DashboardCollection.PLANS],
  ['attendance', DashboardCollection.ATTENDANCE], ['assessments', DashboardCollection.ASSESSMENTS],
  ['events', DashboardCollection.EVENTS], ['resources', DashboardCollection.RESOURCES],
  ['library', DashboardCollection.LIBRARY], ['reports', DashboardCollection.REPORTS],
  ['conversations', DashboardCollection.CONVERSATIONS], ['tasks', DashboardCollection.TASKS],
  ['settings', DashboardCollection.SETTINGS], ['onboarding', DashboardCollection.ONBOARDING],
  ['classes', DashboardCollection.CLASSES], ['students', DashboardCollection.STUDENTS],
  ['folders', DashboardCollection.FOLDERS],
]);

@Injectable()
export class DashboardDataService {
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService, private readonly audit: AuditService) {}
  private collection(value: string) {
    const collection = collections.get(value);
    if (!collection) throw new NotFoundException('Módulo não encontrado');
    return collection;
  }
  async list(userId: string, schoolId: string, name: string) {
    await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    return this.prisma.dashboardRecord.findMany({ where: { schoolId, collection }, orderBy: { createdAt: 'asc' }, select: { recordId: true, payload: true, updatedAt: true } });
  }
  async save(userId: string, schoolId: string, name: string, dto: SaveDashboardRecordDto) {
    await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    if (dto.payload.id !== undefined && dto.payload.id !== dto.id) throw new BadRequestException('O ID do registo não corresponde ao corpo do pedido');
    const serialized = JSON.stringify(dto.payload);
    if (serialized.length > 1_000_000) throw new BadRequestException('O registo excede o limite de 1 MB');
    const saved = await this.prisma.dashboardRecord.upsert({
      where: { schoolId_collection_recordId: { schoolId, collection, recordId: dto.id } },
      create: { schoolId, collection, recordId: dto.id, payload: dto.payload as Prisma.InputJsonValue, createdById: userId },
      update: { payload: dto.payload as Prisma.InputJsonValue },
      select: { recordId: true, payload: true, updatedAt: true },
    });
    await this.audit.write({ schoolId, actorId: userId, action: 'UPSERT', entity: name, recordId: dto.id });
    return saved;
  }
  async remove(userId: string, schoolId: string, name: string, recordId: string) {
    await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    const result = await this.prisma.dashboardRecord.deleteMany({ where: { schoolId, collection, recordId } });
    if (!result.count) throw new NotFoundException('Registo não encontrado');
    await this.audit.write({ schoolId, actorId: userId, action: 'DELETE', entity: name, recordId });
    return { success: true };
  }
  async snapshot(userId: string, schoolId: string) {
    await this.schools.assertMembership(userId, schoolId);
    const rows = await this.prisma.dashboardRecord.findMany({ where: { schoolId }, select: { collection: true, recordId: true, payload: true, updatedAt: true } });
    const data: Record<string, Array<{ id: string; payload: unknown; updatedAt: Date }>> = {};
    for (const [name, collection] of collections) data[name] = rows.filter((row) => row.collection === collection).map((row) => ({ id: row.recordId, payload: row.payload, updatedAt: row.updatedAt }));
    const [school, classes, students] = await Promise.all([
      this.prisma.school.findUniqueOrThrow({ where: { id: schoolId } }),
      this.prisma.schoolClass.findMany({ where: { schoolId, archived: false }, orderBy: [{ year: 'asc' }, { name: 'asc' }] }),
      this.prisma.student.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
    ]);
    return { school, classes, students, data };
  }
}
