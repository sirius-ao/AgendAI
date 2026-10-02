import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import type { CreateClassDto, CreateStudentDto, UpdateClassDto } from './classes.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { deriveTeacherScope } from '../dashboard-data/teacher-access.js';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService, private readonly audit: AuditService) {}
  private async canViewClass(userId: string, schoolId: string, classId: string) {
    const [schoolClass, classRecords] = await Promise.all([
      this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, archived: false }, include: { subjects: true } }),
      this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.CLASSES }, select: { recordId: true, payload: true } }),
    ]);
    const scope = deriveTeacherScope(userId, classRecords);
    return scope.classIds.has(classId) && !!schoolClass?.subjects.some(({ subjectId }) => scope.subjectIds.has(subjectId));
  }
  async list(userId: string, schoolId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const rows = await this.prisma.schoolClass.findMany({ where: { schoolId, archived: false }, include: { _count: { select: { students: true } }, subjects: { include: { subject: true } } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] });
    if (membership.role !== 'TEACHER') return rows;
    const classRecords = await this.prisma.dashboardRecord.findMany({ where: { schoolId, collection: DashboardCollection.CLASSES }, select: { recordId: true, payload: true } });
    const scope = deriveTeacherScope(userId, classRecords);
    return rows.filter((schoolClass) => scope.classIds.has(schoolClass.id) && schoolClass.subjects.some(({ subjectId }) => scope.subjectIds.has(subjectId)));
  }
  async create(userId: string, schoolId: string, dto: CreateClassDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    const created = await this.prisma.schoolClass.create({ data: { schoolId, ...dto } });
    await this.audit.write({ schoolId, actorId: userId, action: 'CREATE', entity: 'class', recordId: created.id });
    return created;
  }
  async update(userId: string, schoolId: string, classId: string, dto: UpdateClassDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    const result = await this.prisma.schoolClass.updateMany({ where: { id: classId, schoolId, archived: false }, data: dto });
    if (!result.count) throw new NotFoundException('Turma não encontrada');
    const updated = await this.prisma.schoolClass.findUnique({ where: { id_schoolId: { id: classId, schoolId } } });
    await this.audit.write({ schoolId, actorId: userId, action: 'UPDATE', entity: 'class', recordId: classId });
    return updated;
  }
  async archive(userId: string, schoolId: string, classId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    const result = await this.prisma.schoolClass.updateMany({ where: { id: classId, schoolId, archived: false }, data: { archived: true } });
    if (!result.count) throw new NotFoundException('Turma não encontrada');
    await this.audit.write({ schoolId, actorId: userId, action: 'ARCHIVE', entity: 'class', recordId: classId });
    return { success: true };
  }
  async students(userId: string, schoolId: string, classId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, archived: false } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada');
    if (membership.role === 'TEACHER' && !(await this.canViewClass(userId, schoolId, classId))) throw new ForbiddenException('Não tem acesso a esta turma');
    return this.prisma.student.findMany({ where: { schoolId, classId }, orderBy: { name: 'asc' } });
  }
  async addStudent(userId: string, schoolId: string, classId: string, dto: CreateStudentDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir alunos');
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, archived: false } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada');
    const student = await this.prisma.student.create({ data: { schoolId, classId, name: dto.name.trim(), contact: dto.contact?.trim(), status: dto.status } });
    await this.audit.write({ schoolId, actorId: userId, action: 'CREATE', entity: 'student', recordId: student.id });
    return student;
  }
}
