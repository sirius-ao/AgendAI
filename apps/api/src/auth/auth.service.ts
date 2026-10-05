import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth.types.js';
import type { RegisterDto, LoginDto } from './auth.dto.js';
import type { ForgotPasswordDto, ResetPasswordDto } from './auth.dto.js';
import { EmailService } from './email.service.js';

const REFRESH_DAYS = 30;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  private emailVerificationRequired() {
    return process.env.NODE_ENV === 'production' && process.env.REQUIRE_EMAIL_CONFIG !== 'false';
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
    await this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) throw new BadRequestException('Ligação inválida ou expirada');
      const claimed = await tx.emailVerificationToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Ligação inválida ou expirada');
      await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
      await tx.emailVerificationToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: new Date() } });
    });
    return { success: true };
  }

  async resendVerification(input: { email: string }) {
    if (!this.emailVerificationRequired()) return { success: true };
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (user && !user.emailVerifiedAt) await this.sendVerification(user);
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
          const invitation = await tx.schoolInvitation.findUnique({ where: { tokenHash: digest(input.invitationToken) } });
          if (!invitation || invitation.email !== email || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new BadRequestException('Convite inválido, expirado ou destinado a outro email');
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
    if (this.emailVerificationRequired() && !user.emailVerifiedAt) {
      await this.sendVerification(user);
      throw new UnauthorizedException('Confirme o seu endereço de email antes de entrar. Se necessário, peça uma nova ligação.');
    }
    return this.issue(user);
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada');
    const old = await this.prisma.refreshSession.findUnique({ where: { tokenHash: digest(rawToken) }, include: { user: true } });
    if (!old || old.revokedAt || old.expiresAt <= new Date()) throw new UnauthorizedException('Sessão expirada');
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
    return { ...this.publicUser(user), schools: user.memberships.map(({ role, school }) => ({ id: school.id, name: school.name, address: school.address, academicYear: school.academicYear, role })) };
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
  private publicUser(user: AuthUser) { return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? '' }; }
}
