import { BadRequestException, Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { SaveDashboardRecordDto } from './dashboard-data.dto.js';
import { DashboardDataService } from './dashboard-data.service.js';

@UseGuards(AuthGuard)
@Controller('schools/:schoolId')
export class DashboardDataController {
  constructor(private readonly data: DashboardDataService) {}
  @Get('dashboard') snapshot(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.data.snapshot(u.sub, s); }
  @Get('data/:collection') list(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string) { return this.data.list(u.sub, s, c); }
  @Put('data/:collection/:recordId') save(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string, @Param('recordId') id: string, @Body() body: SaveDashboardRecordDto) {
    if (body.id !== undefined && id !== body.id) throw new BadRequestException('O ID do registo não corresponde à rota');
    return this.data.save(u.sub, s, c, { ...body, id });
  }
  @Delete('data/:collection/:recordId') remove(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('collection') c: string, @Param('recordId') id: string) { return this.data.remove(u.sub, s, c, id); }
}
