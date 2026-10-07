import { Controller, Delete, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { PlanSharesService } from './plan-shares.service.js';

@Controller()
export class PlanSharesController {
  constructor(private readonly shares: PlanSharesService) {}

  @Post('schools/:schoolId/plans/:planId/share-links')
  @UseGuards(AuthGuard)
  create(
    @CurrentUser() user: AccessPayload,
    @Param('schoolId') schoolId: string,
    @Param('planId') planId: string,
  ) {
    return this.shares.create(user.sub, schoolId, planId);
  }

  @Get('schools/:schoolId/plans/:planId/share-links')
  @UseGuards(AuthGuard)
  list(
    @CurrentUser() user: AccessPayload,
    @Param('schoolId') schoolId: string,
    @Param('planId') planId: string,
  ) {
    return this.shares.list(user.sub, schoolId, planId);
  }

  @Delete('schools/:schoolId/plans/:planId/share-links/:linkId')
  @UseGuards(AuthGuard)
  revoke(
    @CurrentUser() user: AccessPayload,
    @Param('schoolId') schoolId: string,
    @Param('planId') planId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.shares.revoke(user.sub, schoolId, planId, linkId);
  }

  @Get('public/shared/plans/:token')
  @Header('Cache-Control', 'no-store, private')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @UseGuards(AuthRateLimitGuard)
  publicPlan(@Param('token') token: string) {
    return this.shares.publicPlan(token);
  }
}
