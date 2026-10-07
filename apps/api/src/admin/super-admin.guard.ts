import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { isAdminMfaRequired } from './admin-mfa.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: { sub?: string; adminRole?: string } }>();
    if (!request.user?.sub)
      throw new ForbiddenException('Acesso reservado à administração da plataforma');
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { isActive: true, isSuperAdmin: true, platformAdminRole: true, adminMfaEnabled: true, email: true },
    });
    const configuredAdmins = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (
      !user?.isActive ||
      (!user.isSuperAdmin && user.platformAdminRole === 'NONE' && !configuredAdmins.includes(user.email.toLowerCase()))
    ) {
      throw new ForbiddenException('Acesso reservado à administração da plataforma');
    }
    const isRoot = Boolean(user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN' || configuredAdmins.includes(user.email.toLowerCase()));
    request.user.adminRole = isRoot ? 'SUPER_ADMIN' : user.platformAdminRole;
    const mfaSetupRoute = /\/admin\/mfa\/(status|setup|enable)$/.test(request.path);
    if (isAdminMfaRequired() && !user.adminMfaEnabled && !mfaSetupRoute)
      throw new ForbiddenException('MFA_SETUP_REQUIRED: configure a autenticação de dois fatores para continuar.');
    return true;
  }
}

@Injectable()
export class AdminWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: { adminRole?: string } }>();
    if (request.user?.adminRole !== 'SUPER_ADMIN')
      throw new ForbiddenException('Esta ação exige perfil de super administrador');
    return true;
  }
}
