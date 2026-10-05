import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CreateSchoolDto, UpdateSchoolDto } from './schools.dto.js';
import { SchoolsService } from './schools.service.js';
import { AuditService } from '../audit/audit.service.js';

@UseGuards(AuthGuard) @Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService, private readonly audit: AuditService) {}
  @Get() list(@CurrentUser() user: AccessPayload) { return this.schools.list(user.sub); }
  @Post() async create(@CurrentUser() user: AccessPayload, @Body() dto: CreateSchoolDto) {
    const school = await this.schools.create(user.sub, dto);
    await this.audit.write({ schoolId: school.id, actorId: user.sub, action: 'CREATE', entity: 'school', recordId: school.id });
    return school;
  }
  @Get(':schoolId') detail(@CurrentUser() user: AccessPayload, @Param('schoolId') id: string) { return this.schools.detail(user.sub, id); }
  @Patch(':schoolId') async update(@CurrentUser() user: AccessPayload, @Param('schoolId') id: string, @Body() dto: UpdateSchoolDto) {
    const school = await this.schools.update(user.sub, id, dto);
    await this.audit.write({ schoolId: id, actorId: user.sub, action: 'UPDATE', entity: 'school', recordId: id });
    return school;
  }
}
