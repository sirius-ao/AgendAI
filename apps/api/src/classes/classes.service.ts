import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import type { CreateClassDto, CreateStudentDto, UpdateClassDto } from './classes.dto.js';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService) {}
  async list(userId: string, schoolId: string) {
    await this.schools.assertMembership(userId, schoolId);
    return this.prisma.schoolClass.findMany({ where: { schoolId, archived: false }, include: { _count: { select: { students: true } }, subjects: { include: { subject: true } } }, orderBy: [{ year: 'asc' }, { name: 'asc' }] });
  }
  async create(userId: string, schoolId: string, dto: CreateClassDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    return this.prisma.schoolClass.create({ data: { schoolId, ...dto } });
  }
  async update(userId: string, schoolId: string, classId: string, dto: UpdateClassDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    const result = await this.prisma.schoolClass.updateMany({ where: { id: classId, schoolId, archived: false }, data: dto });
    if (!result.count) throw new NotFoundException('Turma não encontrada');
    return this.prisma.schoolClass.findUnique({ where: { id_schoolId: { id: classId, schoolId } } });
  }
  async archive(userId: string, schoolId: string, classId: string) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir turmas');
    const result = await this.prisma.schoolClass.updateMany({ where: { id: classId, schoolId, archived: false }, data: { archived: true } });
    if (!result.count) throw new NotFoundException('Turma não encontrada');
    return { success: true };
  }
  async students(userId: string, schoolId: string, classId: string) {
    await this.schools.assertMembership(userId, schoolId);
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, archived: false } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada');
    return this.prisma.student.findMany({ where: { schoolId, classId }, orderBy: { name: 'asc' } });
  }
  async addStudent(userId: string, schoolId: string, classId: string, dto: CreateStudentDto) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir alunos');
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, archived: false } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada');
    return this.prisma.student.create({ data: { schoolId, classId, name: dto.name.trim(), contact: dto.contact?.trim(), status: dto.status } });
  }
}
