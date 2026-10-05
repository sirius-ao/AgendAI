import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { AcceptInvitationDto, ChangeMemberRoleDto, InviteMemberDto } from './members.dto.js';
import { MembersService } from './members.service.js';

@UseGuards(AuthGuard)
@Controller()
export class MembersController {
  constructor(private readonly members: MembersService) {}
  @Get('schools/:schoolId/members') list(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.members.list(u.sub, s); }
  @Post('schools/:schoolId/invitations') invite(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Body() dto: InviteMemberDto) { return this.members.invite(u.sub, s, dto); }
  @Get('schools/:schoolId/invitations') invitations(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string) { return this.members.invitations(u.sub, s); }
  @Delete('schools/:schoolId/invitations/:invitationId') revoke(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('invitationId') i: string) { return this.members.revoke(u.sub, s, i); }
  @Post('invitations/accept') accept(@CurrentUser() u: AccessPayload, @Body() dto: AcceptInvitationDto) { return this.members.accept(u.sub, dto.token); }
  @Patch('schools/:schoolId/members/:memberId') role(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('memberId') m: string, @Body() dto: ChangeMemberRoleDto) { return this.members.changeRole(u.sub, s, m, dto); }
  @Delete('schools/:schoolId/members/:memberId') remove(@CurrentUser() u: AccessPayload, @Param('schoolId') s: string, @Param('memberId') m: string) { return this.members.remove(u.sub, s, m); }
}
