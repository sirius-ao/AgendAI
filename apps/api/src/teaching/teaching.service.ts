import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateSubjectRequestDto, ReplaceTeacherSubjectsDto, ResolveSubjectRequestDto } from './teaching.dto.js';

const managers = ['OWNER', 'ADMIN', 'COORDINATOR'];
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt');

@Injectable()
export class TeachingService {
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService, private readonly audit: AuditService) {}
  private async manager(userId: string, schoolId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (!managers.includes(membership.role)) throw new ForbiddenException('Apenas a direção ou coordenação pode gerir o catálogo e as atribuições das turmas');
    return membership;
  }
  async subjectsForTeacher(userId: string, schoolId: string) {
    await this.schools.assertMembership(userId, schoolId);
    const row = await this.prisma.dashboardRecord.findUnique({ where: { schoolId_collection_recordId: { schoolId, collection: DashboardCollection.TEACHER_SUBJECTS, recordId: userId } } });
    return { teacherId: userId, subjectIds: ids((row?.payload as { subjectIds?: unknown } | undefined)?.subjectIds) };
  }
  async replaceSubjects(userId: string, schoolId: string, dto: ReplaceTeacherSubjectsDto) {
    await this.schools.assertMembership(userId, schoolId);
    const available = await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.SUBJECTS } });
    const availableIds = new Set(available.map((row) => row.recordId));
    if (dto.subjectIds.some((id) => !availableIds.has(id))) throw new BadRequestException('Escolha apenas disciplinas do catálogo desta escola');
    const payload = { id: userId, subjectIds: dto.subjectIds };
    await this.prisma.dashboardRecord.upsert({
      where: { schoolId_collection_recordId: { schoolId, collection: DashboardCollection.TEACHER_SUBJECTS, recordId: userId } },
      create: { schoolId, collection: DashboardCollection.TEACHER_SUBJECTS, recordId: userId, payload, createdById: userId },
      update: { payload },
    });
    await this.audit.write({ schoolId, actorId: userId, action: 'UPDATE', entity: 'teacher-subjects', recordId: userId, details: { subjectIds: dto.subjectIds } });
    return payload;
  }
  async teacherSubjects(schoolId: string, userId: string) {
    await this.manager(userId, schoolId);
    const members = await this.prisma.schoolMembership.findMany({ where: { schoolId, role: 'TEACHER' }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } });
    const rows = await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.TEACHER_SUBJECTS, recordId: { in: members.map(({ userId: id }) => id) } } });
    const map = new Map(rows.map((row) => [row.recordId, ids((row.payload as { subjectIds?: unknown }).subjectIds)]));
    return members.map(({ user }) => ({ ...user, role: 'TEACHER', subjectIds: map.get(user.id) || [] }));
  }
  async createRequest(userId: string, schoolId: string, dto: CreateSubjectRequestDto) {
    await this.schools.assertMembership(userId, schoolId);
    const name = dto.name.trim();
    const catalog = await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.SUBJECTS } });
    if (catalog.some((row) => normalize(String((row.payload as { name?: unknown }).name || '')) === normalize(name))) throw new ConflictException('Esta disciplina já existe no catálogo da escola');
    const pending = await this.prisma.subjectRequest.findMany({ where: { schoolId, status: 'PENDING' }, select: { name: true } });
    if (pending.some((row) => normalize(row.name) === normalize(name))) throw new ConflictException('Já existe um pedido pendente para esta disciplina');
    const request = await this.prisma.subjectRequest.create({ data: { schoolId, requesterId: userId, name, details: dto.details?.trim() || '' }, include: { requester: { select: { name: true, email: true } } } });
    await this.audit.write({ schoolId, actorId: userId, action: 'CREATE', entity: 'subject-request', recordId: request.id, details: { name } });
    return request;
  }
  async listRequests(userId: string, schoolId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    return this.prisma.subjectRequest.findMany({
      where: managers.includes(membership.role) ? { schoolId } : { schoolId, requesterId: userId },
      include: { requester: { select: { id: true, name: true, email: true } }, resolver: { select: { name: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }
  async resolveRequest(userId: string, schoolId: string, requestId: string, dto: ResolveSubjectRequestDto) {
    await this.manager(userId, schoolId);
    const request = await this.prisma.subjectRequest.findFirst({ where: { id: requestId, schoolId, status: 'PENDING' }, include: { requester: { select: { name: true } } } });
    if (!request) throw new NotFoundException('Pedido pendente não encontrado');
    let subject: { id: string; name: string; tone: string } | undefined;
    if (dto.status === 'APPROVED') {
      const existing = await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.SUBJECTS } });
      if (existing.some((row) => normalize(String((row.payload as { name?: unknown }).name || '')) === normalize(request.name))) throw new ConflictException('A disciplina já foi adicionada ao catálogo');
      subject = { id: randomUUID(), name: request.name, tone: 'green' };
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (subject) await tx.dashboardRecord.create({ data: { schoolId, collection: DashboardCollection.SUBJECTS, recordId: subject.id, payload: subject, createdById: userId } });
      return tx.subjectRequest.update({ where: { id: request.id }, data: { status: dto.status, resolvedById: userId, resolvedAt: new Date() }, include: { requester: { select: { name: true, email: true } }, resolver: { select: { name: true } } } });
    });
    await this.audit.write({ schoolId, actorId: userId, action: dto.status, entity: 'subject-request', recordId: request.id, details: { subjectId: subject?.id } });
    return { ...updated, subject };
  }
  async validateClassAssignments(userId: string, schoolId: string, payload: Record<string, unknown>) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const assignments = payload.subjectTeacherIds && typeof payload.subjectTeacherIds === 'object' ? payload.subjectTeacherIds as Record<string, unknown> : {};
    if (membership.role === 'TEACHER' && Object.keys(assignments).length) throw new ForbiddenException('Apenas a administração pode atribuir professores às disciplinas da turma');
    const subjectIds = ids(payload.subjectIds);
    const idsInSchool = new Set((await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.SUBJECTS }, select: { recordId: true } })).map((row) => row.recordId));
    if (subjectIds.some((id) => !idsInSchool.has(id))) throw new BadRequestException('A turma contém uma disciplina que não pertence ao catálogo desta escola');
    for (const [subjectId, teacherId] of Object.entries(assignments)) {
      if (!subjectIds.includes(subjectId) || typeof teacherId !== 'string') throw new BadRequestException('Atribuição de professor inválida');
      const membershipForTeacher = await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId: teacherId, schoolId } } });
      if (!membershipForTeacher || membershipForTeacher.role !== 'TEACHER') throw new BadRequestException('O professor selecionado não pertence a esta escola');
      const row = await this.prisma.dashboardRecord.findUnique({ where: { schoolId_collection_recordId: { schoolId, collection: DashboardCollection.TEACHER_SUBJECTS, recordId: teacherId } } });
      if (!ids((row?.payload as { subjectIds?: unknown } | undefined)?.subjectIds).includes(subjectId)) throw new BadRequestException('O professor ainda não indicou esta disciplina no seu perfil');
    }
    if (Object.keys(assignments).length) {
      const teacherNames = new Map((await this.prisma.schoolMembership.findMany({ where: { schoolId, role: 'TEACHER' }, include: { user: { select: { id: true, name: true } } } })).map((member) => [member.user.id, member.user.name]));
      payload.subjectTeacherNames = Object.fromEntries(Object.entries(assignments).map(([subjectId, teacherId]) => [subjectId, teacherNames.get(String(teacherId)) || '']));
    } else delete payload.subjectTeacherNames;
  }
}
