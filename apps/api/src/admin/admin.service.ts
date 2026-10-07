import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createGzip, createGunzip } from 'node:zlib';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { BackupDecryptTransform, BackupEncryptTransform } from './backup-crypto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminListQueryDto, AdminRoleDto, AdminStatusDto, PlatformRoleDto } from './admin.dto.js';
import { createTotpSecret, decryptTotpSecret, encryptTotpSecret, isAdminMfaRequired, totpUri, verifyTotpCode } from './admin-mfa.js';

const RETENTION_DAYS = 7;
const backupDir = () => process.env.ADMIN_BACKUP_DIR || '/var/lib/agendai/backups';
const rootEmails = () =>
  (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
const hashSql = () => createHash('sha256');

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminService.name);
  private running = false;
  private poller?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.poller = setInterval(() => void this.processNextBackup(), 5000);
    this.poller.unref();
    this.cleanupTimer = setInterval(() => void this.cleanupExpiredBackups(), 60 * 60_000);
    this.cleanupTimer.unref();
    this.recoveryTimer = setInterval(() => void this.recoverStalledBackups(), 5 * 60_000);
    this.recoveryTimer.unref();
    void this.processNextBackup();
    void this.cleanupExpiredBackups();
    void this.recoverStalledBackups();
  }

  onModuleDestroy() {
    if (this.poller) clearInterval(this.poller);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
  }

  async summary() {
    const [users, activeUsers, activeUsersLast30Days, schools, activeSchools, members, backups, latestBackup, trend] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
        this.prisma.school.count(),
        this.prisma.school.count({ where: { isActive: true } }),
        this.prisma.schoolMembership.count(),
        this.prisma.adminBackup.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
        this.prisma.adminBackup.findFirst({
          where: { status: 'READY' },
          orderBy: { finishedAt: 'desc' },
          select: {
            id: true,
            sizeBytes: true,
            checksum: true,
            createdAt: true,
            finishedAt: true,
            expiresAt: true,
          },
        }),
        this.prisma.$queryRaw<{ day: string; users: number; schools: number }[]>`
          WITH days AS (
            SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
          )
          SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
            COUNT(DISTINCT u.id)::int AS users,
            COUNT(DISTINCT s.id)::int AS schools
          FROM days
          LEFT JOIN "User" u ON u."createdAt" >= days.day AND u."createdAt" < days.day + INTERVAL '1 day'
          LEFT JOIN "School" s ON s."createdAt" >= days.day AND s."createdAt" < days.day + INTERVAL '1 day'
          GROUP BY days.day ORDER BY days.day
        `,
      ]);
    return {
      users,
      activeUsers,
      activeUsersLast30Days,
      schools,
      activeSchools,
      members,
      activeBackups: backups,
      latestBackup: latestBackup
        ? { ...latestBackup, sizeBytes: latestBackup.sizeBytes?.toString() || null }
        : null,
      trend,
    };
  }

  async listUsers(query: AdminListQueryDto) {
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 30));
    const where: Prisma.UserWhereInput = {
      ...(query.active ? { isActive: query.active === 'true' } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.user.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isSuperAdmin: true,
        platformAdminRole: true,
        adminMfaEnabled: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { memberships: true } },
        memberships: {
          select: { role: true, school: { select: { id: true, name: true, isActive: true } } },
        },
      },
    });
    const hasMore = rows.length > limit;
    const results = rows.slice(0, limit);
    const admins = new Set(rootEmails());
    return {
      items: results.map((user) => ({
        ...user,
        isConfiguredRoot: admins.has(user.email.toLowerCase()),
        isSuperAdmin: user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN' || admins.has(user.email.toLowerCase()),
        platformAdminRole: admins.has(user.email.toLowerCase()) || user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN'
          ? 'SUPER_ADMIN'
          : user.platformAdminRole,
        adminMfaEnabled: user.adminMfaEnabled,
      })),
      nextCursor: hasMore ? results.at(-1)?.id : null,
    };
  }

  async userDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: { include: { school: { select: { id: true, name: true, isActive: true, createdAt: true } } } },
        _count: { select: { sessions: true, auditEvents: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    const [activeSessions, recentActions] = await Promise.all([
      this.prisma.refreshSession.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.prisma.adminAuditEvent.findMany({ where: { targetId: id }, orderBy: { createdAt: 'desc' }, take: 20, include: { actor: { select: { name: true, email: true } } } }),
    ]);
    const admins = new Set(rootEmails());
    const isRoot = admins.has(user.email.toLowerCase()) || user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN';
    return {
      id: user.id, name: user.name, email: user.email, phone: user.phone, isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
      platformAdminRole: isRoot ? 'SUPER_ADMIN' : user.platformAdminRole,
      adminMfaEnabled: user.adminMfaEnabled, activeSessions, sessionCount: user._count.sessions,
      memberships: user.memberships.map(({ role, createdAt, school }) => ({ role, createdAt, school })),
      recentActions,
    };
  }

  async schoolDetail(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, students: true, classes: true, dashboardRecords: true } },
        memberships: { include: { user: { select: { id: true, name: true, email: true, isActive: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true } } }, orderBy: { createdAt: 'asc' } },
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 30, include: { actor: { select: { name: true, email: true } } } },
      },
    });
    if (!school) throw new NotFoundException('Escola não encontrada');
    const { auditEvents, ...details } = school;
    return { ...details, auditEvents };
  }

  async listSchools(query: AdminListQueryDto) {
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 30));
    const where: Prisma.SchoolWhereInput = {
      ...(query.active ? { isActive: query.active === 'true' } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { address: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.school.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        address: true,
        academicYear: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { memberships: true, students: true, classes: true } },
      },
    });
    const hasMore = rows.length > limit;
    const results = rows.slice(0, limit);
    return { items: results, nextCursor: hasMore ? results.at(-1)?.id : null };
  }

  async listAudit(query: AdminListQueryDto) {
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const rows = await this.prisma.adminAuditEvent.findMany({
      where: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.entity ? { entity: query.entity } : {}),
        ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        actor: { select: { id: true, name: true, email: true } },
        target: { select: { id: true, name: true, email: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return { items, nextCursor: hasMore ? items.at(-1)?.id : null };
  }

  private async writeAudit(input: {
    actorId: string;
    targetId?: string;
    action: string;
    entity: string;
    recordId?: string;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.adminAuditEvent.create({
      data: { ...input, details: input.details as Prisma.InputJsonObject | undefined },
    });
  }

  private async countActiveAdmins(tx: Prisma.TransactionClient) {
    const emails = rootEmails();
    const admins = await tx.user.findMany({
      where: {
        isActive: true,
        OR: [
          { isSuperAdmin: true },
          { platformAdminRole: 'SUPER_ADMIN' },
          ...(emails.length ? [{ email: { in: emails } }] : []),
        ],
      },
      select: { id: true },
    });
    return admins.length;
  }

  async setUserStatus(actorId: string, userId: string, input: AdminStatusDto) {
    if (actorId === userId && !input.active)
      throw new ForbiddenException('Não pode desativar a própria conta');
    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, isActive: true, isSuperAdmin: true, platformAdminRole: true },
        });
        if (!target) throw new NotFoundException('Utilizador não encontrado');
        if (target.isActive === input.active)
          throw new ConflictException('A conta já tem esse estado');
        const isRoot = rootEmails().includes(target.email.toLowerCase());
        if (!input.active && isRoot)
          throw new ForbiddenException(
            'Esta conta está protegida pela configuração SUPER_ADMIN_EMAILS',
          );
        if (
          !input.active &&
          (target.isSuperAdmin || target.platformAdminRole === 'SUPER_ADMIN' || isRoot) &&
          (await this.countActiveAdmins(tx)) <= 1
        )
          throw new ForbiddenException('Não pode desativar o último super administrador ativo');
        await tx.user.update({
          where: { id: userId },
          data: { isActive: input.active, tokenVersion: { increment: 1 } },
        });
        if (!input.active) {
          await tx.refreshSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.sharedPlanLink.updateMany({
            where: { createdById: userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        await tx.adminAuditEvent.create({
          data: {
            actorId,
            targetId: userId,
            action: input.active ? 'ACTIVATE' : 'DEACTIVATE',
            entity: 'USER',
            recordId: userId,
            details: {
              reason: input.reason.trim(),
              wasActive: target.isActive,
              isActive: input.active,
            },
          },
        });
        return { id: userId, isActive: input.active };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async setSchoolStatus(actorId: string, schoolId: string, input: AdminStatusDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, isActive: true },
    });
    if (!school) throw new NotFoundException('Escola não encontrada');
    if (school.isActive === input.active)
      throw new ConflictException('A escola já tem esse estado');
    await this.prisma.$transaction(async (tx) => {
      await tx.school.update({ where: { id: schoolId }, data: { isActive: input.active } });
      await tx.adminAuditEvent.create({
        data: {
          actorId,
          action: input.active ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'SCHOOL',
          recordId: schoolId,
          details: {
            schoolName: school.name,
            reason: input.reason.trim(),
            wasActive: school.isActive,
            isActive: input.active,
          },
        },
      });
    });
    return { id: schoolId, isActive: input.active };
  }

  async setPlatformRole(actorId: string, userId: string, input: PlatformRoleDto) {
    if (actorId === userId && input.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Não pode remover ou reduzir a própria função administrativa');
    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            isActive: true,
            isSuperAdmin: true,
            platformAdminRole: true,
            emailVerifiedAt: true,
          },
        });
        if (!target) throw new NotFoundException('Utilizador não encontrado');
        const isRoot = rootEmails().includes(target.email.toLowerCase());
        const currentRole = isRoot || target.isSuperAdmin ? 'SUPER_ADMIN' : target.platformAdminRole;
        if (currentRole === input.role) throw new ConflictException('O utilizador já tem essa função');
        if (isRoot && input.role !== 'SUPER_ADMIN')
          throw new ForbiddenException('Esta conta está protegida pela configuração SUPER_ADMIN_EMAILS');
        if (input.role === 'SUPER_ADMIN' && (!target.isActive || !target.emailVerifiedAt))
          throw new BadRequestException('Só pode promover uma conta ativa com email confirmado');
        if (currentRole === 'SUPER_ADMIN' && input.role !== 'SUPER_ADMIN' && target.isActive && (await this.countActiveAdmins(tx)) <= 1)
          throw new ForbiddenException('Não pode remover o último super administrador ativo');
        await tx.user.update({
          where: { id: userId },
          data: {
            isSuperAdmin: input.role === 'SUPER_ADMIN',
            platformAdminRole: input.role,
            tokenVersion: { increment: 1 },
          },
        });
        await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.adminAuditEvent.create({
          data: {
            actorId,
            targetId: userId,
            action: 'CHANGE_PLATFORM_ROLE',
            entity: 'USER',
            recordId: userId,
            details: { reason: input.reason.trim(), previousRole: currentRole, role: input.role },
          },
        });
        return { id: userId, role: input.role };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async setSuperAdmin(actorId: string, userId: string, input: AdminRoleDto) {
    return this.setPlatformRole(actorId, userId, {
      role: input.superAdmin ? 'SUPER_ADMIN' : 'NONE',
      reason: input.reason,
    });
  }

  async revokeUserSessions(actorId: string, userId: string, reason: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new NotFoundException('Utilizador não encontrado');
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const [sessions] = await Promise.all([
        tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
        tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
      ]);
      await tx.adminAuditEvent.create({ data: { actorId, targetId: userId, action: 'REVOKE_SESSIONS', entity: 'USER', recordId: userId, details: { reason: reason.trim(), revokedSessions: sessions.count } } });
      return sessions.count;
    });
    return { id: userId, revokedSessions: result };
  }

  async auditSupportAction(actorId: string, userId: string, action: string, reason: string) {
    await this.prisma.adminAuditEvent.create({
      data: { actorId, targetId: userId, action, entity: 'USER', recordId: userId, details: { reason: reason.trim() } },
    });
  }

  async adminMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { adminMfaEnabled: true, platformAdminRole: true, isSuperAdmin: true, email: true } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    const root = user.isSuperAdmin || user.platformAdminRole === 'SUPER_ADMIN' || rootEmails().includes(user.email.toLowerCase());
    return { enabled: user.adminMfaEnabled, required: isAdminMfaRequired(), role: root ? 'SUPER_ADMIN' : user.platformAdminRole };
  }

  async setupAdminMfa(userId: string) {
    if (!isAdminMfaRequired()) throw new ConflictException('A MFA está desativada pela configuração do servidor');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, adminMfaEnabled: true } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    if (user.adminMfaEnabled) throw new ConflictException('A autenticação de dois fatores já está ativa');
    const secret = createTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { adminMfaSecret: encryptTotpSecret(secret) } });
    await this.auditSupportAction(userId, userId, 'SETUP_ADMIN_MFA', 'Início da configuração MFA');
    return { secret, otpauthUri: totpUri(user.email, secret) };
  }

  async enableAdminMfa(userId: string, code: string) {
    if (!isAdminMfaRequired()) throw new ConflictException('A MFA está desativada pela configuração do servidor');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { adminMfaSecret: true, adminMfaEnabled: true } });
    if (!user?.adminMfaSecret) throw new BadRequestException('Inicie primeiro a configuração MFA');
    if (user.adminMfaEnabled) throw new ConflictException('A autenticação de dois fatores já está ativa');
    if (!verifyTotpCode(decryptTotpSecret(user.adminMfaSecret), code)) throw new BadRequestException('Código MFA inválido ou expirado');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { adminMfaEnabled: true, tokenVersion: { increment: 1 } } });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuditEvent.create({ data: { actorId: userId, targetId: userId, action: 'ENABLE_ADMIN_MFA', entity: 'USER', recordId: userId } });
    });
    return { success: true, reauthenticate: true };
  }

  async disableAdminMfa(userId: string, code: string, reason: string) {
    if (!isAdminMfaRequired()) throw new ConflictException('A MFA está desativada pela configuração do servidor');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { adminMfaSecret: true, adminMfaEnabled: true } });
    if (!user?.adminMfaEnabled || !user.adminMfaSecret) throw new ConflictException('A autenticação de dois fatores não está ativa');
    if (!verifyTotpCode(decryptTotpSecret(user.adminMfaSecret), code)) throw new BadRequestException('Código MFA inválido ou expirado');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { adminMfaEnabled: false, adminMfaSecret: null, tokenVersion: { increment: 1 } } });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuditEvent.create({ data: { actorId: userId, targetId: userId, action: 'DISABLE_ADMIN_MFA', entity: 'USER', recordId: userId, details: { reason: reason.trim() } } });
    });
    return { success: true, reauthenticate: true };
  }

  async listBackups() {
    const rows = await this.prisma.adminBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { requester: { select: { id: true, name: true, email: true } } },
    });
    return rows.map(({ error, ...item }) => ({
      ...item,
      sizeBytes: item.sizeBytes?.toString() || null,
      error: error || null,
    }));
  }

  async verifyBackup(actorId: string, id: string) {
    const backup = await this.prisma.adminBackup.findUnique({ where: { id } });
    if (!backup || backup.status !== 'READY' || backup.expiresAt <= new Date())
      throw new NotFoundException('Backup não encontrado, expirado ou indisponível');
    const checksum = hashSql();
    let sizeBytes = 0;
    let valid = false;
    try {
      const inspect = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          sizeBytes += chunk.length;
          checksum.update(chunk);
          callback(null, chunk);
        },
      });
      await pipeline(
        createReadStream(path.join(backupDir(), `${id}.agbk`)),
        new BackupDecryptTransform(),
        createGunzip(),
        inspect,
        new Transform({ transform(_chunk, _encoding, callback) { callback(); } }),
      );
      valid = Boolean(
        backup.checksum &&
        backup.sizeBytes !== null &&
        sizeBytes === Number(backup.sizeBytes) &&
        checksum.digest('hex') === backup.checksum,
      );
    } catch {
      valid = false;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.adminBackup.update({ where: { id }, data: { integrityStatus: valid ? 'VALID' : 'INVALID', verifiedAt: new Date() } });
      await tx.adminAuditEvent.create({ data: { actorId, action: 'VERIFY_BACKUP', entity: 'BACKUP', recordId: id, details: { valid, sizeBytes } } });
    });
    return { id, valid, integrityStatus: valid ? 'VALID' : 'INVALID', verifiedAt: new Date().toISOString() };
  }

  async requestBackup(actorId: string) {
    if (!/^[a-f\d]{64}$/i.test(process.env.ADMIN_BACKUP_ENCRYPTION_KEY || ''))
      throw new BadRequestException('A cifragem dos backups não está configurada');
    const backup = await this.prisma.$transaction(
      async (tx) => {
        const openJobs = await tx.adminBackup.count({
          where: { status: { in: ['QUEUED', 'RUNNING'] } },
        });
        if (openJobs) throw new ConflictException('Já existe um backup em preparação');
        const recent = await tx.adminBackup.count({
          where: { requesterId: actorId, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
        });
        if (recent) throw new ConflictException('Aguarde uma hora antes de pedir outro backup');
        const created = await tx.adminBackup.create({
          data: {
            requesterId: actorId,
            expiresAt: new Date(Date.now() + RETENTION_DAYS * 86400_000),
          },
        });
        await tx.adminAuditEvent.create({
          data: {
            actorId,
            action: 'REQUEST_BACKUP',
            entity: 'BACKUP',
            recordId: created.id,
            details: { retentionDays: RETENTION_DAYS },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void this.processNextBackup();
    return backup;
  }

  private async processNextBackup() {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        const next = await this.prisma.adminBackup.findFirst({
          where: { status: 'QUEUED' },
          orderBy: { createdAt: 'asc' },
        });
        if (!next) break;
        const claimed = await this.prisma.adminBackup.updateMany({
          where: { id: next.id, status: 'QUEUED' },
          data: { status: 'RUNNING', startedAt: new Date() },
        });
        if (!claimed.count) continue;
        await this.createBackupFile(next.id);
      }
    } catch (error) {
      this.logger.error(
        `Backup worker failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async createBackupFile(id: string) {
    const filename = path.join(backupDir(), `${id}.agbk`);
    const tempFilename = `${filename}.tmp`;
    const sqlHash = hashSql();
    let sqlSize = 0;
    let errorText = '';
    const database = new URL(process.env.DATABASE_URL!);
    const dbName = decodeURIComponent(database.pathname.replace(/^\//, ''));
    const env = {
      ...process.env,
      PGHOST: database.hostname,
      PGPORT: String(Number(database.port || 5432)),
      PGUSER: decodeURIComponent(database.username),
      PGPASSWORD: decodeURIComponent(database.password),
      PGDATABASE: dbName,
      PGSSLMODE: database.searchParams.get('sslmode') || process.env.PGSSLMODE || 'prefer',
    };
    const child = spawn(
      'pg_dump',
      ['--no-password', '--no-owner', '--no-privileges', '--format=plain', '--encoding=UTF8'],
      { env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    child.stderr.on('data', (chunk: Buffer) => {
      if (errorText.length < 4000)
        errorText += chunk.toString('utf8').slice(0, 4000 - errorText.length);
    });
    const hashTransform = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        sqlSize += chunk.length;
        sqlHash.update(chunk);
        callback(null, chunk);
      },
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 30 * 60_000);
    timeout.unref();
    try {
      await mkdir(backupDir(), { recursive: true, mode: 0o700 });
      await chmod(backupDir(), 0o700);
      const done = new Promise<void>((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(errorText || `pg_dump exited with code ${code}`)),
        );
      });
      await Promise.all([
        pipeline(
          child.stdout!,
          hashTransform,
          createGzip({ level: 9 }),
          new BackupEncryptTransform(),
          createWriteStream(tempFilename, { mode: 0o600, flags: 'wx' }),
        ),
        done,
      ]);
      await chmod(tempFilename, 0o600);
      const { rename } = await import('node:fs/promises');
      await rename(tempFilename, filename);
      await this.prisma.adminBackup.update({
        where: { id },
        data: {
          status: 'READY',
          finishedAt: new Date(),
          sizeBytes: BigInt(sqlSize),
          checksum: sqlHash.digest('hex'),
          error: null,
        },
      });
    } catch (error) {
      child.kill('SIGKILL');
      await rm(tempFilename, { force: true }).catch(() => undefined);
      const sanitized = (error instanceof Error ? error.message : 'Falha ao gerar o backup')
        .replace(env.PGPASSWORD, '[redacted]')
        .slice(0, 500);
      await this.prisma.adminBackup.update({
        where: { id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: sanitized || 'Falha ao gerar o backup',
        },
      });
      this.logger.error(`Backup ${id} falhou: ${sanitized}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async downloadBackup(id: string, requesterId: string) {
    const backup = await this.prisma.adminBackup.findUnique({ where: { id } });
    if (!backup || backup.status !== 'READY' || backup.expiresAt <= new Date())
      throw new NotFoundException('Backup não encontrado, expirado ou indisponível');
    const filename = path.join(backupDir(), `${backup.id}.agbk`);
    await this.writeAudit({
      actorId: requesterId,
      action: 'DOWNLOAD_BACKUP',
      entity: 'BACKUP',
      recordId: backup.id,
      details: { checksum: backup.checksum, sizeBytes: backup.sizeBytes?.toString() },
    });
    return {
      backup,
      source: createReadStream(filename),
      decrypt: new BackupDecryptTransform(),
      gunzip: createGunzip(),
    };
  }

  async deleteBackup(actorId: string, id: string) {
    const backup = await this.prisma.adminBackup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup não encontrado');
    if (backup.status === 'QUEUED' || backup.status === 'RUNNING') throw new ConflictException('Não é possível eliminar um backup ainda em preparação');
    await this.prisma.$transaction(async (tx) => {
      await tx.adminBackup.delete({ where: { id } });
      await tx.adminAuditEvent.create({
        data: {
          actorId,
          action: 'DELETE_BACKUP',
          entity: 'BACKUP',
          recordId: id,
          details: { status: backup.status, checksum: backup.checksum },
        },
      });
    });
    await rm(path.join(backupDir(), `${backup.id}.agbk`), { force: true });
    return { success: true };
  }

  private async cleanupExpiredBackups() {
    try {
      const expired = await this.prisma.adminBackup.findMany({
        where: { expiresAt: { lt: new Date() } },
        select: { id: true },
      });
      for (const { id } of expired)
        await rm(path.join(backupDir(), `${id}.agbk`), { force: true }).catch(() => undefined);
      if (expired.length)
        await this.prisma.adminBackup.deleteMany({
          where: { id: { in: expired.map(({ id }) => id) }, expiresAt: { lt: new Date() } },
        });
    } catch (error) {
      this.logger.warn(
        `Backup cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async recoverStalledBackups() {
    try {
      const threshold = new Date(Date.now() - 45 * 60_000);
      const stale = await this.prisma.adminBackup.findMany({ where: { status: 'RUNNING', startedAt: { lt: threshold } }, select: { id: true } });
      if (!stale.length) return;
      await this.prisma.adminBackup.updateMany({ where: { id: { in: stale.map(({ id }) => id) }, status: 'RUNNING', startedAt: { lt: threshold } }, data: { status: 'FAILED', finishedAt: new Date(), error: 'O processo de backup foi interrompido. Pode solicitar um novo backup.' } });
      for (const { id } of stale) {
        await rm(path.join(backupDir(), `${id}.agbk`), { force: true }).catch(() => undefined);
        await rm(path.join(backupDir(), `${id}.agbk.tmp`), { force: true }).catch(() => undefined);
      }
    } catch (error) { this.logger.warn(`Backup recovery failed: ${error instanceof Error ? error.message : 'unknown error'}`); }
  }

}
