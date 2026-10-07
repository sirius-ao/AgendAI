import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CreatePlanUploadDto } from './files.dto.js';
import { FilesService } from './files.service.js';

@UseGuards(AuthGuard, AuthRateLimitGuard)
@Controller('schools/:schoolId/plans/:planId/attachments')
export class FilesController {
  constructor(private readonly files: FilesService) {}
  @Post('upload') upload(@CurrentUser() u: AccessPayload, @Param('schoolId') schoolId: string, @Param('planId') planId: string, @Body() dto: CreatePlanUploadDto) { return this.files.createUpload(u.sub, schoolId, planId, dto); }
  @Post(':attachmentId/complete') complete(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('planId') p: string, @Param('attachmentId') a: string) { return this.files.complete(u.sub, s, p, a); }
  @Get() list(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('planId') p: string) { return this.files.list(u.sub, s, p); }
  @Get(':attachmentId/download') download(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('planId') p: string, @Param('attachmentId') a: string) { return this.files.download(u.sub, s, p, a); }
  @Delete(':attachmentId') remove(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('planId') p: string, @Param('attachmentId') a: string) { return this.files.remove(u.sub, s, p, a); }
}
