import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth.types.js';
import type { RegisterDto, LoginDto } from './auth.dto.js';

const REFRESH_DAYS = 30;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
      return this.issue(user);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('Este email já está registado');
      throw error;
    }
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (!user || !(await compare(input.password, user.passwordHash))) throw new UnauthorizedException('Email ou palavra-passe incorretos');
    return this.issue(user);
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada');
    const old = await this.prisma.refreshSession.findUnique({ where: { tokenHash: digest(rawToken) }, include: { user: true } });
    if (!old || old.revokedAt || old.expiresAt <= new Date()) throw new UnauthorizedException('Sessão expirada');
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
    return new SignJWT({ email: user.email }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode(secret));
  }
  private publicUser(user: AuthUser) { return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? '' }; }
}
