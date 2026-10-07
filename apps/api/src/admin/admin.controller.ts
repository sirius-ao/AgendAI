import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { AdminListQueryDto, AdminRoleDto, AdminStatusDto } from './admin.dto.js';
import { AdminMfaCodeDto, AdminSupportActionDto, PlatformRoleDto } from './admin.dto.js';
import { AdminService } from './admin.service.js';
import { AdminWriteGuard, SuperAdminGuard } from './super-admin.guard.js';
import { AuthService } from '../auth/auth.service.js';

@UseGuards(AuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly auth: AuthService) {}

  @Get('summary') summary() {
    return this.admin.summary();
  }
  @Get('users') users(@Query() query: AdminListQueryDto) {
    return this.admin.listUsers(query);
  }
  @Get('users/:id') user(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.userDetail(id);
  }
  @Get('schools') schools(@Query() query: AdminListQueryDto) {
    return this.admin.listSchools(query);
  }
  @Get('schools/:id') school(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.schoolDetail(id);
  }
  @Get('audit') audit(@Query() query: AdminListQueryDto) {
    return this.admin.listAudit(query);
  }
  @Get('backups') backups() {
    return this.admin.listBackups();
  }

  @UseGuards(AdminWriteGuard)
  @Patch('users/:id/status') userStatus(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminStatusDto,
  ) {
    return this.admin.setUserStatus(user.sub, id, dto);
  }
  @UseGuards(AdminWriteGuard)
  @Post('users/:id/revoke-sessions') revokeSessions(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSupportActionDto,
  ) {
    return this.admin.revokeUserSessions(user.sub, id, dto.reason);
  }
  @UseGuards(AdminWriteGuard)
  @Post('users/:id/resend-verification') async resendVerification(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSupportActionDto,
  ) {
    const result = await this.auth.resendVerificationForAdmin(id);
    await this.admin.auditSupportAction(user.sub, id, 'RESEND_VERIFICATION', dto.reason);
    return result;
  }
  @UseGuards(AdminWriteGuard)
  @Patch('users/:id/admin-role') adminRole(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlatformRoleDto,
  ) {
    return this.admin.setPlatformRole(user.sub, id, dto);
  }
  @UseGuards(AdminWriteGuard)
  @Patch('users/:id/super-admin') userRole(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRoleDto,
  ) {
    return this.admin.setSuperAdmin(user.sub, id, dto);
  }
  @UseGuards(AdminWriteGuard)
  @Patch('schools/:id/status') schoolStatus(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminStatusDto,
  ) {
    return this.admin.setSchoolStatus(user.sub, id, dto);
  }

  @Get('mfa/status') mfaStatus(@CurrentUser() user: AccessPayload) {
    return this.admin.adminMfaStatus(user.sub);
  }
  @Post('mfa/setup') setupMfa(@CurrentUser() user: AccessPayload) {
    return this.admin.setupAdminMfa(user.sub);
  }
  @Post('mfa/enable') enableMfa(@CurrentUser() user: AccessPayload, @Body() dto: AdminMfaCodeDto) {
    return this.admin.enableAdminMfa(user.sub, dto.code);
  }
  @Post('mfa/disable') disableMfa(@CurrentUser() user: AccessPayload, @Body() dto: AdminMfaCodeDto) {
    return this.admin.disableAdminMfa(user.sub, dto.code, dto.reason || 'MFA desativado pelo titular');
  }

  @UseGuards(AdminWriteGuard)
  @Post('backups') requestBackup(@CurrentUser() user: AccessPayload) {
    return this.admin.requestBackup(user.sub);
  }
  @UseGuards(AdminWriteGuard)
  @Post('backups/:id/verify') verifyBackup(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.verifyBackup(user.sub, id);
  }
  @UseGuards(AdminWriteGuard)
  @Delete('backups/:id') deleteBackup(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.deleteBackup(user.sub, id);
  }

  @UseGuards(AdminWriteGuard)
  @Get('backups/:id/download') async downloadBackup(
    @CurrentUser() user: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const { backup, source, decrypt, gunzip } = await this.admin.downloadBackup(id, user.sub);
    const safeDate = backup.createdAt.toISOString().slice(0, 10);
    response.setHeader('Content-Type', 'application/sql; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="agendaki-backup-${safeDate}.sql"`,
    );
    response.setHeader('Cache-Control', 'no-store, private');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (backup.checksum) response.setHeader('X-Backup-SHA256', backup.checksum);
    try {
      await pipeline(source, decrypt, gunzip, response);
    } catch (error) {
      if (!response.headersSent)
        response.status(500).json({ message: 'Não foi possível validar ou transferir o backup.' });
      else response.destroy(error instanceof Error ? error : undefined);
    }
  }
}
