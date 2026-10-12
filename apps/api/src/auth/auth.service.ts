import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from './auth.types.js';
import type { RegisterDto, LoginDto, GoogleAuthDto } from './auth.dto.js';
import type { ForgotPasswordDto, ResetPasswordDto } from './auth.dto.js';
import { EmailService } from './email.service.js';
import { decryptTotpSecret, isAdminMfaRequired, verifyTotpCode } from '../admin/admin-mfa.js';

const REFRESH_DAYS = 30;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  private emailVerificationRequired() {
    return process.env.NODE_ENV === 'production';
  }

  private async sendVerification(user: AuthUser) {
    const recent = await this.prisma.emailVerificationToken.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 5 * 60_000) } }, select: { id: true } });
    if (recent) return true;
    const token = randomBytes(36).toString('base64url');
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await this.prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 24 * 3600_000) } });
    try {
      await this.email.sendVerification(user.email, user.name, token);
    } catch (error) {
      await this.prisma.emailVerificationToken.deleteMany({ where: { tokenHash: digest(token) } });
      this.logger.error(`Email verification delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
    return true;
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = digest(rawToken);
    const user = await this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) throw new BadRequestException('Ligação inválida ou expirada');
      const claimed = await tx.emailVerificationToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Ligação inválida ou expirada');
      const verifiedUser = await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerificationToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: new Date() } });
      return verifiedUser;
    });
    try {
      await this.email.sendWelcome(user.email, user.name);
    } catch (error) {
      this.logger.error(`Welcome email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    return { success: true };
  }

  async resendVerification(input: { email: string }) {
    if (!this.emailVerificationRequired()) return { success: true };
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (user && !user.emailVerifiedAt) await this.sendVerification(user);
    return { success: true };
  }

  async resendVerificationForAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilizador não encontrado');
    if (user.emailVerifiedAt) throw new ConflictException('Este email já está confirmado');
    if (!(await this.sendVerification(user)))
      throw new ServiceUnavailableException('Não foi possível enviar o email de confirmação');
    return { success: true };
  }

  async forgotPassword(input: ForgotPasswordDto) {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new ServiceUnavailableException('O envio de email de recuperação não está configurado');
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: true };
    const token = randomBytes(36).toString('base64url');
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    try {
      await this.email.sendPasswordReset(user.email, user.name, token);
    } catch (error) {
      await this.prisma.passwordResetToken.deleteMany({ where: { tokenHash: digest(token) } });
      this.logger.error(`Password recovery email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    return { success: true };
  }

  async resetPassword(input: ResetPasswordDto) {
    const tokenHash = digest(input.token);
    const passwordHash = await hash(input.password, 12);
    await this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) throw new BadRequestException('Ligação inválida ou expirada');
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Ligação inválida ou expirada');
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
      await tx.refreshSession.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: new Date() } });
    });
    return { success: true };
  }

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (!input.schoolName && !input.invitationToken) throw new BadRequestException('Indique o nome da escola ou use um convite válido');
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Este email já está registado');
    const passwordHash = await hash(input.password, 12);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { name: input.name.trim(), email, passwordHash } });
        if (input.invitationToken) {
          const invitation = await tx.schoolInvitation.findUnique({ where: { tokenHash: digest(input.invitationToken) }, include: { school: { select: { isActive: true } } } });
          if (!invitation || invitation.email !== email || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new BadRequestException('Convite inválido, expirado ou destinado a outro email');
          if (!invitation.school.isActive) throw new BadRequestException('Esta escola está suspensa e não pode aceitar novos membros');
          const accepted = await tx.schoolInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
          if (!accepted.count) throw new BadRequestException('Este convite já foi utilizado');
          await tx.schoolMembership.create({ data: { userId: created.id, schoolId: invitation.schoolId, role: invitation.role } });
        } else {
          const school = await tx.school.create({ data: { name: input.schoolName!.trim() } });
          await tx.schoolMembership.create({ data: { userId: created.id, schoolId: school.id, role: 'OWNER' } });
        }
        return created;
      });
      if (this.emailVerificationRequired()) {
        const emailSent = await this.sendVerification(user);
        return { verificationRequired: true, emailSent, email: user.email };
      }
      return this.issue(user);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('Este email já está registado');
      throw error;
    }
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (!user || !(await compare(input.password, user.passwordHash))) throw new UnauthorizedException('Email ou palavra-passe incorretos');
    if (!user.isActive) throw new UnauthorizedException('Esta conta está desativada. Contacte a administração do AgendAKI.');
    this.assertAdminMfa(user, input.mfaCode);
    if (this.emailVerificationRequired() && !user.emailVerifiedAt) {
      await this.sendVerification(user);
      throw new UnauthorizedException('Confirme o seu endereço de email antes de entrar. Se necessário, peça uma nova ligação.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issue(user);
  }

  googleNonce() { return randomBytes(32).toString('base64url'); }

  async googleAuth(input: GoogleAuthDto, expectedNonce: string | undefined) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new ServiceUnavailableException('O acesso com Google ainda não está configurado');
    if (!expectedNonce) throw new UnauthorizedException('A sessão de autenticação Google expirou. Tente novamente.');
    let claims;
    try {
      ({ payload: claims } = await jwtVerify(input.credential, googleKeys, {
        algorithms: ['RS256'], audience: clientId,
        issuer: ['accounts.google.com', 'https://accounts.google.com'],
      }));
    } catch {
      throw new UnauthorizedException('Não foi possível validar a sua conta Google. Tente novamente.');
    }
    if (typeof claims.sub !== 'string' || !claims.sub || claims.nonce !== expectedNonce || claims.email_verified !== true || typeof claims.email !== 'string') {
      throw new UnauthorizedException('A conta Google precisa de um endereço de email confirmado.');
    }
    const email = claims.email.trim().toLowerCase();
    const subject = claims.sub;
    const name = (input.name?.trim() || (typeof claims.name === 'string' ? claims.name.trim() : '') || email.split('@')[0]).slice(0, 120);
    let user = await this.prisma.user.findUnique({ where: { googleSubject: subject } });

    if (!user) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (!existing.isActive) throw new UnauthorizedException('Esta conta está desativada. Contacte a administração do AgendAKI.');
        try {
          user = await this.prisma.user.update({ where: { id: existing.id }, data: { googleSubject: subject, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } });
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('Esta conta Google já está associada a outro utilizador.');
          throw error;
        }
      } else {
        if (input.mode !== 'REGISTER') throw new UnauthorizedException('Ainda não existe uma conta AgendAKI com este Google. Crie uma conta primeiro.');
        if (!input.schoolName && !input.invitationToken) throw new BadRequestException('Indique o nome da escola ou use um convite válido.');
        const passwordHash = await hash(randomBytes(48).toString('base64url'), 12);
        try {
          user = await this.prisma.$transaction(async (tx) => {
            const created = await tx.user.create({ data: { name, email, passwordHash, googleSubject: subject, emailVerifiedAt: new Date() } });
            if (input.invitationToken) await this.acceptInvitation(tx, created.id, email, input.invitationToken);
            else {
              const school = await tx.school.create({ data: { name: input.schoolName!.trim() } });
              await tx.schoolMembership.create({ data: { userId: created.id, schoolId: school.id, role: 'OWNER' } });
            }
            return created;
          });
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('Já existe uma conta com este email. Entre com a sua conta.');
          throw error;
        }
      }
    }

    if (!user.isActive) throw new UnauthorizedException('Esta conta está desativada. Contacte a administração do AgendAKI.');
    if (input.invitationToken) {
      const invitation = await this.prisma.schoolInvitation.findUnique({ where: { tokenHash: digest(input.invitationToken) } });
      if (!invitation || invitation.email !== email || invitation.revokedAt) throw new BadRequestException('Convite inválido ou destinado a outro email');
      if (!invitation.acceptedAt) await this.prisma.$transaction((tx) => this.acceptInvitation(tx, user!.id, email, input.invitationToken!));
      else if (!await this.prisma.schoolMembership.findUnique({ where: { userId_schoolId: { userId: user.id, schoolId: invitation.schoolId } }, select: { id: true } })) throw new BadRequestException('Este convite já foi utilizado');
    }
    this.assertAdminMfa(user, input.mfaCode);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
    return this.issue(user);
  }

  private assertAdminMfa(user: AuthUser, mfaCode?: string) {
    const configuredAdmins = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase());
    const isAdmin = user.isSuperAdmin || user.platformAdminRole !== 'NONE' || configuredAdmins.includes(user.email.toLowerCase());
    if (isAdmin && isAdminMfaRequired() && user.adminMfaEnabled) {
      let validCode = false;
      try { validCode = Boolean(user.adminMfaSecret && mfaCode && verifyTotpCode(decryptTotpSecret(user.adminMfaSecret), mfaCode)); } catch { validCode = false; }
      if (!validCode) throw new UnauthorizedException({ code: 'MFA_REQUIRED', message: 'Indique um código válido de seis dígitos da sua aplicação autenticadora.' });
    }
  }

  private async acceptInvitation(tx: Prisma.TransactionClient, userId: string, email: string, rawToken: string) {
    const invitation = await tx.schoolInvitation.findUnique({ where: { tokenHash: digest(rawToken) }, include: { school: { select: { isActive: true } } } });
    if (!invitation || invitation.email !== email || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new BadRequestException('Convite inválido, expirado ou destinado a outro email');
    if (!invitation.school.isActive) throw new BadRequestException('Esta escola está suspensa e não pode aceitar novos membros');
    const accepted = await tx.schoolInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
    if (!accepted.count) throw new BadRequestException('Este convite já foi utilizado');
    await tx.schoolMembership.upsert({ where: { userId_schoolId: { userId, schoolId: invitation.schoolId } }, create: { userId, schoolId: invitation.schoolId, role: invitation.role }, update: {} });
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada');
    const old = await this.prisma.refreshSession.findUnique({ where: { tokenHash: digest(rawToken) }, include: { user: true } });
    if (!old || !old.user.isActive || old.revokedAt || old.expiresAt <= new Date()) throw new UnauthorizedException('Sessão expirada');
    if (this.emailVerificationRequired() && !old.user.emailVerifiedAt) {
      await this.sendVerification(old.user);
      throw new UnauthorizedException('Confirme o seu endereço de email antes de continuar');
    }
    const replacement = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400_000);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshSession.updateMany({ where: { id: old.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
      if (!claimed.count) throw new UnauthorizedException('Sessão expirada');
      await tx.refreshSession.create({ data: { userId: old.userId, tokenHash: digest(replacement), expiresAt } });
    });
    return { accessToken: await this.accessToken(old.user), refreshToken: replacement, user: this.publicUser(old.user) };
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.prisma.refreshSession.updateMany({ where: { tokenHash: digest(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { memberships: { include: { school: true } } } });
    if (!user) throw new UnauthorizedException('Utilizador não encontrado');
    return { ...this.publicUser(user), schools: user.memberships.filter(({ school }) => school.isActive).map(({ role, school }) => ({ id: school.id, name: school.name, address: school.address, academicYear: school.academicYear, role })) };
  }

  async updateProfile(userId: string, input: { name?: string; phone?: string }) {
    const data: { name?: string; phone?: string } = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone.trim();
    if (!Object.keys(data).length) throw new BadRequestException('Indique pelo menos um campo para atualizar');
    try {
      const user = await this.prisma.user.update({ where: { id: userId }, data });
      return this.publicUser(user);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('Este email já está associado a outra conta');
      throw error;
    }
  }

  private async issue(user: AuthUser) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshSession.create({ data: { userId: user.id, tokenHash: digest(refreshToken), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400_000) } });
    return { accessToken: await this.accessToken(user), refreshToken, user: this.publicUser(user) };
  }
  private async accessToken(user: AuthUser) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) throw new BadRequestException('JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres');
    return new SignJWT({ email: user.email, ver: user.tokenVersion ?? 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
  }
  private publicUser(user: AuthUser) {
    const configuredAdmins = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase());
    const isRoot = Boolean(user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN' || configuredAdmins.includes(user.email.toLowerCase()));
    return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? '', isSuperAdmin: isRoot, adminRole: isRoot ? 'SUPER_ADMIN' : user.platformAdminRole || 'NONE', adminMfaEnabled: Boolean(user.adminMfaEnabled) };
  }
}
