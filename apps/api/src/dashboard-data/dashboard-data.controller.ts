import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CreateDirectConversationDto, SaveDashboardRecordDto, SetResourceSharingDto } from './dashboard-data.dto.js';
import { DashboardDataService } from './dashboard-data.service.js';

@UseGuards(AuthGuard)
@Controller('schools/:schoolId')
export class DashboardDataController {
  constructor(private readonly data: DashboardDataService) {}
  @Get('messaging/participants') participants(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.data.messagingParticipants(u.sub, s); }
  @Post('messaging/conversations') createDirectConversation(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() body: CreateDirectConversationDto) { return this.data.createDirectConversation(u.sub, s, body.recipientId); }
  @Get('resources/:resourceId/sharing') resourceSharing(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('resourceId') id: string) { return this.data.resourceSharing(u.sub, s, id); }
  @Post('resources/:resourceId/sharing') @UseGuards(AuthGuard, AuthRateLimitGuard) setResourceSharing(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('resourceId') id: string, @Body() body: SetResourceSharingDto) { return this.data.setResourceSharing(u.sub, s, id, body); }
  @Get('dashboard') snapshot(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.data.snapshot(u.sub, s); }
  @Get('data/:collection') list(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string) { return this.data.list(u.sub, s, c); }
  @Put('data/:collection/:recordId') save(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string, @Param('recordId') id: string, @Body() body: SaveDashboardRecordDto) {
    if (body.id !== undefined && id !== body.id) throw new BadRequestException('O ID do registo não corresponde à rota');
    return this.data.save(u.sub, s, c, { ...body, id });
  }
  @Delete('data/:collection/:recordId') remove(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string, @Param('recordId') id: string) { return this.data.remove(u.sub, s, c, id); }
}

@UseGuards(AuthGuard)
@Controller('resources')
export class SharedResourcesController {
  constructor(private readonly data: DashboardDataService) {}
  @Get('shared') @UseGuards(AuthGuard, AuthRateLimitGuard) shared(@CurrentUser() u: AccessPayload) { return this.data.sharedResources(u.sub); }
}
