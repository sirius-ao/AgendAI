import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CreateSubjectRequestDto, ReplaceTeacherSubjectsDto, ResolveSubjectRequestDto } from './teaching.dto.js';
import { TeachingService } from './teaching.service.js';

@UseGuards(AuthGuard)
@Controller('schools/:schoolId')
export class TeachingController {
  constructor(private readonly teaching: TeachingService) {}
  @Get('teachers/me/subjects') me(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.subjectsForTeacher(u.sub, s); }
  @Put('teachers/me/subjects') updateMe(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: ReplaceTeacherSubjectsDto) { return this.teaching.replaceSubjects(u.sub, s, dto); }
  @Get('teachers/subjects') teachers(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.teacherSubjects(s, u.sub); }
  @Get('subject-requests') requests(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.listRequests(u.sub, s); }
  @Post('subject-requests') createRequest(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: CreateSubjectRequestDto) { return this.teaching.createRequest(u.sub, s, dto); }
  @Patch('subject-requests/:requestId') resolve(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('requestId') id: string, @Body() dto: ResolveSubjectRequestDto) { return this.teaching.resolveRequest(u.sub, s, id, dto); }
}
