import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import type { SaveDashboardRecordDto } from './dashboard-data.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { TeachingService } from '../teaching/teaching.service.js';
import { deriveTeacherScope, teacherCanReadRecord } from './teacher-access.js';

const collections = new Map<string, DashboardCollection>([
  ['subjects', DashboardCollection.SUBJECTS],
  ['plans', DashboardCollection.PLANS],
  ['attendance', DashboardCollection.ATTENDANCE],
  ['assessments', DashboardCollection.ASSESSMENTS],
  ['events', DashboardCollection.EVENTS],
  ['resources', DashboardCollection.RESOURCES],
  ['library', DashboardCollection.LIBRARY],
  ['reports', DashboardCollection.REPORTS],
  ['conversations', DashboardCollection.CONVERSATIONS],
  ['tasks', DashboardCollection.TASKS],
  ['settings', DashboardCollection.SETTINGS],
  ['onboarding', DashboardCollection.ONBOARDING],
  ['classes', DashboardCollection.CLASSES],
  ['students', DashboardCollection.STUDENTS],
  ['folders', DashboardCollection.FOLDERS],
  ['diary', DashboardCollection.DIARY],
  ['announcements', DashboardCollection.ANNOUNCEMENTS],
]);
const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
type RecordPayload = Record<string, unknown>;

@Injectable()
export class DashboardDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schools: SchoolsService,
    private readonly audit: AuditService,
    private readonly teaching: TeachingService,
  ) {}
  private collection(value: string) {
    const collection = collections.get(value);
    if (!collection) throw new NotFoundException('Módulo não encontrado');
    return collection;
  }
  private async teacherScope(userId: string, schoolId: string) {
    const classes = await this.prisma.dashboardRecord.findMany({
      where: { schoolId, collection: DashboardCollection.CLASSES },
    });
    return deriveTeacherScope(userId, classes);
  }
  private async assertTeacherWrite(
    userId: string,
    schoolId: string,
    collection: DashboardCollection,
    recordId: string,
    payload?: RecordPayload,
  ) {
    const scope = await this.teacherScope(userId, schoolId);
    if (
      (
        [
          DashboardCollection.SUBJECTS,
          DashboardCollection.CLASSES,
          DashboardCollection.STUDENTS,
          DashboardCollection.SETTINGS,
          DashboardCollection.ANNOUNCEMENTS,
        ] as DashboardCollection[]
      ).includes(collection)
    )
      throw new ForbiddenException('Esta área só pode ser alterada pela administração');
    if (payload) {
      for (const key of ['teacherId', 'ownerId', 'createdById', 'authorId', 'userId']) {
        if (payload[key] !== undefined && payload[key] !== userId)
          throw new ForbiddenException('Não pode alterar registos de outro utilizador');
      }
      if (
        (
          [
            DashboardCollection.PLANS,
            DashboardCollection.ASSESSMENTS,
            DashboardCollection.EVENTS,
            DashboardCollection.TASKS,
            DashboardCollection.DIARY,
          ] as DashboardCollection[]
        ).includes(collection)
      ) {
        if (payload.teacherId === undefined) payload.teacherId = userId;
      }
    }
    const existing = await this.prisma.dashboardRecord.findUnique({
      where: { schoolId_collection_recordId: { schoolId, collection, recordId } },
    });
    if (
      existing &&
      !teacherCanReadRecord({
        collection,
        recordId,
        value: existing.payload,
        userId,
        scope,
        createdById: existing.createdById,
      })
    )
      throw new ForbiddenException('Não pode alterar este registo');
    if (
      existing &&
      collection !== DashboardCollection.ATTENDANCE &&
      collection !== DashboardCollection.CONVERSATIONS
    ) {
      const existingPayload = existing.payload as RecordPayload;
      const ownsExisting =
        existing.createdById === userId ||
        [
          existingPayload.teacherId,
          existingPayload.ownerId,
          existingPayload.createdById,
          existingPayload.authorId,
          existingPayload.userId,
        ].includes(userId);
      if (!ownsExisting)
        throw new ForbiddenException('Pode consultar este registo, mas só o autor o pode alterar');
    }
    const existingValue = existing?.payload;
    const candidate =
      payload ??
      (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)
        ? (existingValue as RecordPayload)
        : {});
    if (
      !teacherCanReadRecord({
        collection,
        recordId,
        value: candidate,
        userId,
        scope,
        createdById: existing?.createdById || userId,
      })
    )
      throw new ForbiddenException('O registo não pertence às suas turmas ou disciplinas');
  }
  async list(userId: string, schoolId: string, name: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    const rows = await this.prisma.dashboardRecord.findMany({
      where: { schoolId, collection },
      orderBy: { createdAt: 'asc' },
      select: { recordId: true, payload: true, updatedAt: true, createdById: true },
    });
    if (membership.role !== 'TEACHER') return rows;
    const scope = await this.teacherScope(userId, schoolId);
    return rows.filter((row) =>
      teacherCanReadRecord({
        collection,
        recordId: row.recordId,
        value: row.payload,
        userId,
        scope,
        createdById: row.createdById,
      }),
    );
  }
  async save(userId: string, schoolId: string, name: string, dto: SaveDashboardRecordDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    if (
      (collection === DashboardCollection.SUBJECTS || collection === DashboardCollection.CLASSES) &&
      membership.role === 'TEACHER'
    )
      throw new ForbiddenException('Apenas a administração pode alterar o catálogo e as turmas');
    if (membership.role === 'TEACHER') {
      await this.assertTeacherWrite(userId, schoolId, collection, dto.id, dto.payload);
      if (collection === DashboardCollection.CONVERSATIONS) {
        const existing = await this.prisma.dashboardRecord.findUnique({
          where: { schoolId_collection_recordId: { schoolId, collection, recordId: dto.id } },
        });
        if (existing) {
          const oldPayload = existing.payload as Record<string, unknown>;
          const incoming = Array.isArray(dto.payload.messages) ? dto.payload.messages : [];
          const original = Array.isArray(oldPayload.messages) ? oldPayload.messages : [];
          const isSameMessage = (left: unknown, right: unknown) =>
            JSON.stringify(left) === JSON.stringify(right);
          if (
            incoming.length <= original.length ||
            !original.every((message, index) => isSameMessage(message, incoming[index]))
          )
            throw new ForbiddenException('Só pode acrescentar mensagens à conversa');
          const added = incoming.slice(original.length);
          if (
            added.some(
              (message) =>
                !message ||
                typeof message !== 'object' ||
                Array.isArray(message) ||
                (message as Record<string, unknown>).senderId !== userId ||
                typeof (message as Record<string, unknown>).text !== 'string' ||
                !(message as Record<string, unknown>).text?.toString().trim(),
            )
          )
            throw new ForbiddenException(
              'As mensagens devem ser enviadas pelo utilizador autenticado',
            );
          dto.payload = { ...oldPayload, messages: [...original, ...added] };
        }
      }
    }
    if (dto.payload.id !== undefined && dto.payload.id !== dto.id)
      throw new BadRequestException('O ID do registo não corresponde ao corpo do pedido');
    if (collection === DashboardCollection.SUBJECTS && typeof dto.payload.name === 'string') {
      const normalize = (value: string) =>
        value
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt');
      const existing = await this.prisma.dashboardRecord.findMany({
        where: { schoolId, collection },
        select: { recordId: true, payload: true },
      });
      if (
        existing.some(
          (row) =>
            row.recordId !== dto.id &&
            normalize(String((row.payload as { name?: unknown }).name || '')) ===
              normalize(dto.payload.name as string),
        )
      )
        throw new BadRequestException('Já existe uma disciplina com este nome nesta escola');
    }
    if (collection === DashboardCollection.CLASSES)
      await this.teaching.validateClassAssignments(userId, schoolId, dto.payload);
    if (
      (
        [
          DashboardCollection.PLANS,
          DashboardCollection.ASSESSMENTS,
          DashboardCollection.EVENTS,
        ] as DashboardCollection[]
      ).includes(collection) &&
      typeof dto.payload.subjectId === 'string'
    ) {
      const subject = await this.prisma.dashboardRecord.findUnique({
        where: {
          schoolId_collection_recordId: {
            schoolId,
            collection: DashboardCollection.SUBJECTS,
            recordId: dto.payload.subjectId,
          },
        },
      });
      if (!subject)
        throw new BadRequestException('Escolha uma disciplina do catálogo desta escola');
      if (membership.role === 'TEACHER') {
        const assigned = await this.teaching.subjectsForTeacher(userId, schoolId);
        if (!assigned.subjectIds.includes(dto.payload.subjectId))
          throw new ForbiddenException(
            'A disciplina ainda não está associada ao seu perfil nesta escola',
          );
        if (typeof dto.payload.classId === 'string') {
          const classRecord = await this.prisma.dashboardRecord.findUnique({
            where: {
              schoolId_collection_recordId: {
                schoolId,
                collection: DashboardCollection.CLASSES,
                recordId: dto.payload.classId,
              },
            },
          });
          const classPayload = classRecord?.payload as
            { subjectIds?: unknown; subjectTeacherIds?: Record<string, unknown> } | undefined;
          if (classPayload && !ids(classPayload.subjectIds).includes(dto.payload.subjectId))
            throw new BadRequestException('Esta disciplina não está associada à turma escolhida');
          const assignedTeacher = classPayload?.subjectTeacherIds?.[dto.payload.subjectId];
          if (assignedTeacher && assignedTeacher !== userId)
            throw new ForbiddenException(
              'Esta disciplina da turma está atribuída a outro professor',
            );
        }
      }
    }
    const serialized = JSON.stringify(dto.payload);
    if (serialized.length > 1_000_000)
      throw new BadRequestException('O registo excede o limite de 1 MB');
    const saved = await this.prisma.dashboardRecord.upsert({
      where: { schoolId_collection_recordId: { schoolId, collection, recordId: dto.id } },
      create: {
        schoolId,
        collection,
        recordId: dto.id,
        payload: dto.payload as Prisma.InputJsonValue,
        createdById: userId,
      },
      update: { payload: dto.payload as Prisma.InputJsonValue },
      select: { recordId: true, payload: true, updatedAt: true },
    });
    await this.audit.write({
      schoolId,
      actorId: userId,
      action: 'UPSERT',
      entity: name,
      recordId: dto.id,
    });
    return saved;
  }
  async remove(userId: string, schoolId: string, name: string, recordId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const collection = this.collection(name);
    if (
      (collection === DashboardCollection.SUBJECTS || collection === DashboardCollection.CLASSES) &&
      membership.role === 'TEACHER'
    )
      throw new ForbiddenException('Apenas a administração pode alterar o catálogo e as turmas');
    if (membership.role === 'TEACHER')
      await this.assertTeacherWrite(userId, schoolId, collection, recordId);
    const result = await this.prisma.dashboardRecord.deleteMany({
      where: { schoolId, collection, recordId },
    });
    if (result.count)
      await this.audit.write({
        schoolId,
        actorId: userId,
        action: 'DELETE',
        entity: name,
        recordId,
      });
    return { success: true };
  }
  async snapshot(userId: string, schoolId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const rows = await this.prisma.dashboardRecord.findMany({
      where: { schoolId },
      select: {
        collection: true,
        recordId: true,
        payload: true,
        updatedAt: true,
        createdById: true,
      },
    });
    const data: Record<string, Array<{ id: string; payload: unknown; updatedAt: Date }>> = {};
    const scope =
      membership.role === 'TEACHER' ? await this.teacherScope(userId, schoolId) : undefined;
    for (const [name, collection] of collections)
      data[name] = rows
        .filter(
          (row) =>
            row.collection === collection &&
            (!scope ||
              teacherCanReadRecord({
                collection,
                recordId: row.recordId,
                value: row.payload,
                userId,
                scope,
                createdById: row.createdById,
              })),
        )
        .map((row) => ({ id: row.recordId, payload: row.payload, updatedAt: row.updatedAt }));
    const [school, classes, students] = await Promise.all([
      this.prisma.school.findUniqueOrThrow({ where: { id: schoolId } }),
      this.prisma.schoolClass.findMany({
        where: { schoolId, archived: false, ...(scope ? { id: { in: [...scope.classIds] } } : {}) },
        orderBy: [{ year: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.student.findMany({
        where: { schoolId, ...(scope ? { classId: { in: [...scope.classIds] } } : {}) },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { school, classes, students, data };
  }
}
