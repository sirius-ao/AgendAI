import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { ClassesService } from './classes.service.js';
import { CreateClassDto, CreateStudentDto, UpdateClassDto } from './classes.dto.js';

@UseGuards(AuthGuard) @Controller('schools/:schoolId/classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}
  @Get() list(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string) { return this.classes.list(user.sub, schoolId); }
  @Post() create(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Body() dto: CreateClassDto) { return this.classes.create(user.sub, schoolId, dto); }
  @Patch(':classId') update(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Param('classId') classId: string, @Body() dto: UpdateClassDto) { return this.classes.update(user.sub, schoolId, classId, dto); }
  @Delete(':classId') archive(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Param('classId') classId: string) { return this.classes.archive(user.sub, schoolId, classId); }
  @Get(':classId/students') students(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Param('classId') classId: string) { return this.classes.students(user.sub, schoolId, classId); }
  @Post(':classId/students') addStudent(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Param('classId') classId: string, @Body() dto: CreateStudentDto) { return this.classes.addStudent(user.sub, schoolId, classId, dto); }
}
