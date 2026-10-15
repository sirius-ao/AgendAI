import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { CreateSubjectRequestDto, GenerateLessonPlanDto, ReplaceTeacherSubjectsDto, ResolveSubjectRequestDto } from './teaching.dto.js';
import { TeachingService } from './teaching.service.js';

@UseGuards(AuthGuard)
@Controller('schools/:schoolId')
export class TeachingController {
  constructor(private readonly teaching: TeachingService) {}
  @Get('plans/ai-status') aiStatus(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.lessonPlanAIStatus(u.sub, s); }
  @Post('plans/generate') @UseGuards(AuthGuard, AuthRateLimitGuard) generatePlan(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: GenerateLessonPlanDto) { return this.teaching.generateLessonPlan(u.sub, s, dto); }
  @Get('teachers/me/subjects') me(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.subjectsForTeacher(u.sub, s); }
  @Put('teachers/me/subjects') updateMe(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: ReplaceTeacherSubjectsDto) { return this.teaching.replaceSubjects(u.sub, s, dto); }
  @Get('teachers/subjects') teachers(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.teacherSubjects(s, u.sub); }
  @Get('subject-requests') requests(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.teaching.listRequests(u.sub, s); }
  @Post('subject-requests') createRequest(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: CreateSubjectRequestDto) { return this.teaching.createRequest(u.sub, s, dto); }
  @Patch('subject-requests/:requestId') resolve(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('requestId') id: string, @Body() dto: ResolveSubjectRequestDto) { return this.teaching.resolveRequest(u.sub, s, id, dto); }
}
