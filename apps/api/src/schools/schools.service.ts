import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSchoolDto } from './schools.dto.js';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) { return this.prisma.schoolMembership.findMany({ where: { userId }, include: { school: true }, orderBy: { createdAt: 'asc' } }).then((rows) => rows.map(({ role, school }) => ({ ...school, role }))); }
  async create(userId: string, data: CreateSchoolDto) {
    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { name: data.name.trim(), address: data.address?.trim(), academicYear: data.academicYear?.trim() } });
      await tx.schoolMembership.create({ data: { userId, schoolId: school.id, role: 'OWNER' } });
      return { ...school, role: 'OWNER' as const };
    });
  }
  async assertMembership(userId: string, schoolId: string) {
    const membership = await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId, schoolId } } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta escola');
    return membership;
  }
  async detail(userId: string, schoolId: string) {
    await this.assertMembership(userId, schoolId);
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada');
    return school;
  }
}
