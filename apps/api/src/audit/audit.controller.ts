import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { AuditService } from './audit.service.js';
@UseGuards(AuthGuard)
@Controller('schools/:schoolId/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() list(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Query('limit') limit?: string) { return this.audit.list(user.sub, schoolId, Number(limit) || 100); }
}
