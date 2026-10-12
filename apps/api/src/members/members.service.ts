import { createHash, randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import type { ChangeMemberRoleDto, InviteMemberDto } from './members.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { EmailService } from '../auth/email.service.js';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const roleLabel = (role: string) => ({ ADMIN: 'administrador', COORDINATOR: 'coordenador', TEACHER: 'professor' } as Record<string, string>)[role] || role;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService, private readonly audit: AuditService, private readonly email: EmailService) {}
  async list(userId: string, schoolId: string) {
    const actor = await this.schools.assertMembership(userId, schoolId);
    if (actor.role === 'TEACHER') throw new ForbiddenException('Apenas a administração pode gerir membros');
    return this.prisma.schoolMembership.findMany({ where: { schoolId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
  }
  async invite(userId: string, schoolId: string, dto: InviteMemberDto) {
    const actor = await this.schools.assertMembership(userId, schoolId);
    if (!['OWNER', 'ADMIN'].includes(actor.role)) throw new ForbiddenException('Apenas o proprietário ou administrador pode convidar membros');
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { where: { schoolId } } } });
    if (existing?.memberships.length) throw new ForbiddenException('Este utilizador já pertence à escola');
    const token = randomBytes(36).toString('base64url');
    const invitation = await this.prisma.schoolInvitation.create({ data: { schoolId, createdById: userId, email, role: dto.role, tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    await this.audit.write({ schoolId, actorId: userId, action: 'INVITE', entity: 'member', recordId: invitation.id, details: { email, role: dto.role } });
    let emailSent = false;
    try {
      const school = await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true } });
      await this.email.sendInvitation(email, school.name, roleLabel(dto.role), token);
      emailSent = true;
    } catch (error) {
      this.logger.error(`Invitation email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    return { id: invitation.id, email, role: invitation.role, expiresAt: invitation.expiresAt, invitationToken: token, emailSent };
  }
  async invitations(userId: string, schoolId: string) {
    const actor = await this.schools.assertMembership(userId, schoolId);
    if (!['OWNER', 'ADMIN'].includes(actor.role)) throw new ForbiddenException('Apenas a administração pode consultar convites');
    return this.prisma.schoolInvitation.findMany({ where: { schoolId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }
  async revoke(userId: string, schoolId: string, invitationId: string) {
    const actor = await this.schools.assertMembership(userId, schoolId);
    if (!['OWNER', 'ADMIN'].includes(actor.role)) throw new ForbiddenException();
    const result = await this.prisma.schoolInvitation.updateMany({ where: { id: invitationId, schoolId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException('Convite não encontrado');
    await this.audit.write({ schoolId, actorId: userId, action: 'REVOKE_INVITE', entity: 'invitation', recordId: invitationId });
    return { success: true };
  }
  async accept(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const invitation = await this.prisma.schoolInvitation.findUnique({ where: { tokenHash: digest(token) }, include: { school: { select: { isActive: true } } } });
    if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date() || invitation.email !== user.email) throw new NotFoundException('Convite inválido, expirado ou destinado a outro email');
    if (!invitation.school.isActive) throw new ForbiddenException('Esta escola está suspensa e não pode aceitar novos membros');
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.schoolInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (!claimed.count) throw new NotFoundException('Convite já utilizado');
      await tx.schoolMembership.upsert({ where: { userId_schoolId: { userId, schoolId: invitation.schoolId } }, create: { userId, schoolId: invitation.schoolId, role: invitation.role }, update: { role: invitation.role } });
    });
    await this.audit.write({ schoolId: invitation.schoolId, actorId: userId, action: 'ACCEPT_INVITE', entity: 'membership', recordId: userId });
    return this.prisma.school.findUniqueOrThrow({ where: { id: invitation.schoolId } }).then((school) => ({ ...school, role: invitation.role }));
  }
  async changeRole(actorId: string, schoolId: string, memberId: string, dto: ChangeMemberRoleDto) {
    const actor = await this.schools.assertMembership(actorId, schoolId);
    if (actor.role !== 'OWNER') throw new ForbiddenException('Apenas o proprietário pode alterar funções');
    const target = await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId: memberId, schoolId } } });
    if (!target) throw new NotFoundException('Membro não encontrado');
    if (target.role === 'OWNER') throw new ForbiddenException('Não é possível alterar o proprietário');
    const updated = await this.prisma.schoolMembership.update({ where: { id: target.id }, data: { role: dto.role } });
    await this.audit.write({ schoolId, actorId, action: 'CHANGE_ROLE', entity: 'membership', recordId: memberId, details: { role: dto.role } });
    return updated;
  }
  async remove(actorId: string, schoolId: string, memberId: string) {
    const actor = await this.schools.assertMembership(actorId, schoolId);
    if (!['OWNER', 'ADMIN'].includes(actor.role)) throw new ForbiddenException('Apenas a administração pode remover membros');
    const target = await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId: memberId, schoolId } } });
    if (!target) throw new NotFoundException('Membro não encontrado');
    if (target.role === 'OWNER' || target.userId === actorId) throw new ForbiddenException('O proprietário não pode ser removido desta forma');
    await this.prisma.schoolMembership.delete({ where: { id: target.id } });
    await this.audit.write({ schoolId, actorId, action: 'REMOVE_MEMBER', entity: 'membership', recordId: memberId });
    return { success: true };
  }
}
