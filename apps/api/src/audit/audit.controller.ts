import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { AuditService } from './audit.service.js';
import { AuditListQueryDto } from './audit.dto.js';
@UseGuards(AuthGuard)
@Controller('schools/:schoolId/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() list(@CurrentUser() user: AccessPayload, @Param('schoolId') schoolId: string, @Query() query: AuditListQueryDto) {
    return this.audit.list(user.sub, schoolId, query.limit, query.cursor);
  }
}
