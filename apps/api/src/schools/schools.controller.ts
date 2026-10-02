import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CreateSchoolDto } from './schools.dto.js';
import { SchoolsService } from './schools.service.js';

@UseGuards(AuthGuard) @Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}
  @Get() list(@CurrentUser() user: AccessPayload) { return this.schools.list(user.sub); }
  @Post() create(@CurrentUser() user: AccessPayload, @Body() dto: CreateSchoolDto) { return this.schools.create(user.sub, dto); }
  @Get(':schoolId') detail(@CurrentUser() user: AccessPayload, @Param('schoolId') id: string) { return this.schools.detail(user.sub, id); }
}
