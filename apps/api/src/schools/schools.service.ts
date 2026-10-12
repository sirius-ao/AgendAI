import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSchoolDto, UpdateSchoolDto } from './schools.dto.js';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) { return this.prisma.schoolMembership.findMany({ where: { userId, school: { isActive: true } }, include: { school: true }, orderBy: { createdAt: 'asc' } }).then((rows) => rows.map(({ role, school }) => ({ ...school, role }))); }
  async create(userId: string, data: CreateSchoolDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { name: data.name.trim(), address: data.address?.trim(), academicYear: data.academicYear?.trim() } });
      await tx.schoolMembership.create({ data: { userId, schoolId: school.id, role: 'OWNER' } });
      return { ...school, role: 'OWNER' as const };
    });
    return result;
  }
  async assertMembership(userId: string, schoolId: string) {
    const membership = await this.prisma.schoolMembership.findFirst({ where: { userId, schoolId, school: { isActive: true } } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta escola');
    return membership;
  }
  async detail(userId: string, schoolId: string) {
    await this.assertMembership(userId, schoolId);
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada');
    return school;
  }
  async update(userId: string, schoolId: string, data: UpdateSchoolDto) {
    const membership = await this.assertMembership(userId, schoolId);
    if (membership.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode alterar os dados da escola');
    const values: UpdateSchoolDto = {};
    if (data.name !== undefined) values.name = data.name.trim();
    if (data.address !== undefined) values.address = data.address.trim();
    if (data.academicYear !== undefined) values.academicYear = data.academicYear.trim();
    if (data.timezone !== undefined) values.timezone = data.timezone.trim();
    if (!Object.keys(values).length) throw new NotFoundException('Nenhum dado para atualizar');
    return this.prisma.school.update({ where: { id: schoolId }, data: values });
  }
}
