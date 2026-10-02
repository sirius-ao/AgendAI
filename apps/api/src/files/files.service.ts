import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { DashboardCollection } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchoolsService } from '../schools/schools.service.js';
import { TeachingService } from '../teaching/teaching.service.js';
import type { CreatePlanUploadDto } from './files.dto.js';

const allowed = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png', 'image/jpeg', 'image/webp']);
const safeName = (name: string) => name.normalize('NFKC').replace(/[\\/\0-\x1f\x7f]/g, '_').trim().slice(0, 255) || 'ficheiro';
const hmac = (key: Buffer | string, value: string, encoding?: 'hex') => createHmac('sha256', key).update(value).digest(encoding);
const awsEncode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService, private readonly schools: SchoolsService, private readonly teaching: TeachingService) {}

  private config() {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const access = process.env.S3_ACCESS_KEY;
    const secret = process.env.S3_SECRET_KEY;
    if (!endpoint || !bucket || !access || !secret) throw new ServiceUnavailableException('O armazenamento de ficheiros não está configurado');
    return { endpoint: endpoint.replace(/\/$/, ''), publicEndpoint: (process.env.S3_PUBLIC_ENDPOINT || endpoint).replace(/\/$/, ''), bucket, access, secret, region: process.env.S3_REGION || 'us-east-1' };
  }

  private signedUrl(endpoint: string, key: string, method: string, expires: number) {
    const c = this.config(); const base = new URL(endpoint);
    const path = `${base.pathname.replace(/\/$/, '')}/${awsEncode(c.bucket)}/${key.split('/').map(awsEncode).join('/')}`;
    const now = new Date();
    const stamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const day = stamp.slice(0, 8); const scope = `${day}/${c.region}/s3/aws4_request`;
    const params: Record<string, string> = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${c.access}/${scope}`, 'X-Amz-Date': stamp, 'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': 'host' };
    const query = Object.entries(params).map(([k, v]) => [awsEncode(k), awsEncode(v)] as const).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
    const canonical = `${method}\n${path}\n${query}\nhost:${base.host}\n\nhost\nUNSIGNED-PAYLOAD`;
    const toSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${createHash('sha256').update(canonical).digest('hex')}`;
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${c.secret}`, day), c.region), 's3'), 'aws4_request');
    const finalSig = hmac(signingKey, toSign, 'hex');
    return `${base.origin}${path}?${query}&X-Amz-Signature=${finalSig}`;
  }

  private async authorize(userId: string, schoolId: string, planId: string, mutate = false) {
    const membership = await this.schools.assertMembership(userId, schoolId);
    const row = await this.prisma.dashboardRecord.findUnique({ where: { schoolId_collection_recordId: { schoolId, collection: DashboardCollection.PLANS, recordId: planId } } });
    if (!row) throw new NotFoundException('Plano não encontrado');
    const plan = row.payload as { subjectId?: unknown; teacherId?: unknown; visibility?: unknown };
    if (membership.role === 'TEACHER') {
      if (mutate && plan.teacherId !== userId) throw new ForbiddenException('Só pode gerir anexos dos seus próprios planos');
      if (typeof plan.subjectId !== 'string' && plan.teacherId !== userId) throw new ForbiddenException('Este plano não está associado ao seu perfil');
      if (typeof plan.subjectId === 'string') {
        const assigned = await this.teaching.subjectsForTeacher(userId, schoolId);
        if (!assigned.subjectIds.includes(plan.subjectId)) throw new ForbiddenException('Este plano não pertence às disciplinas associadas ao seu perfil');
      }
      if (!mutate && plan.teacherId !== userId && plan.visibility === 'Apenas eu') throw new ForbiddenException('Este plano é privado');
    }
    return membership;
  }

  async createUpload(userId: string, schoolId: string, planId: string, dto: CreatePlanUploadDto) {
    await this.authorize(userId, schoolId, planId, true);
    if (!allowed.has(dto.contentType.toLowerCase())) throw new BadRequestException('Tipo de ficheiro não permitido');
    const filename = safeName(dto.name);
    const id = randomUUID(); const key = `${schoolId}/plans/${planId}/${id}`;
    const item = await this.prisma.fileAttachment.create({ data: { id, schoolId, userId, collection: DashboardCollection.PLANS, recordId: planId, objectKey: key, originalName: filename, contentType: dto.contentType.toLowerCase(), size: dto.size } });
    return { id: item.id, uploadUrl: this.signedUrl(this.config().publicEndpoint, key, 'PUT', 600), method: 'PUT', headers: { 'Content-Type': item.contentType }, expiresIn: 600 };
  }

  async complete(userId: string, schoolId: string, planId: string, id: string) {
    await this.authorize(userId, schoolId, planId, true);
    const item = await this.prisma.fileAttachment.findFirst({ where: { id, schoolId, recordId: planId, collection: DashboardCollection.PLANS, userId } });
    if (!item) throw new NotFoundException('Anexo pendente não encontrado');
    const response = await fetch(this.signedUrl(this.config().endpoint, item.objectKey, 'HEAD', 60), { method: 'HEAD' });
    if (!response.ok) throw new BadRequestException('O ficheiro ainda não foi enviado para o armazenamento');
    const size = Number(response.headers.get('content-length'));
    if (size !== item.size || size > 10 * 1024 * 1024) {
      await fetch(this.signedUrl(this.config().endpoint, item.objectKey, 'DELETE', 60), { method: 'DELETE' }).catch(() => undefined);
      await this.prisma.fileAttachment.delete({ where: { id } });
      throw new BadRequestException('O tamanho do ficheiro enviado não corresponde ao declarado');
    }
    const completed = await this.prisma.fileAttachment.update({ where: { id }, data: { uploadedAt: new Date() } });
    return { id: completed.id, name: completed.originalName, contentType: completed.contentType, size: completed.size, createdAt: completed.createdAt };
  }

  async list(userId: string, schoolId: string, planId: string) {
    await this.authorize(userId, schoolId, planId);
    return this.prisma.fileAttachment.findMany({ where: { schoolId, recordId: planId, collection: DashboardCollection.PLANS, uploadedAt: { not: null } }, orderBy: { createdAt: 'asc' }, select: { id: true, originalName: true, contentType: true, size: true, createdAt: true } });
  }

  async download(userId: string, schoolId: string, planId: string, id: string) {
    await this.authorize(userId, schoolId, planId);
    const item = await this.prisma.fileAttachment.findFirst({ where: { id, schoolId, recordId: planId, collection: DashboardCollection.PLANS, uploadedAt: { not: null } } });
    if (!item) throw new NotFoundException('Anexo não encontrado');
    return { url: this.signedUrl(this.config().publicEndpoint, item.objectKey, 'GET', 300), expiresIn: 300, name: item.originalName };
  }

  async remove(userId: string, schoolId: string, planId: string, id: string) {
    const membership = await this.authorize(userId, schoolId, planId, true);
    const item = await this.prisma.fileAttachment.findFirst({ where: { id, schoolId, recordId: planId, collection: DashboardCollection.PLANS, ...(membership.role === 'TEACHER' ? { userId } : {}) } });
    if (!item) throw new NotFoundException('Anexo não encontrado');
    const response = await fetch(this.signedUrl(this.config().endpoint, item.objectKey, 'DELETE', 60), { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new BadRequestException('Não foi possível remover o ficheiro do armazenamento');
    await this.prisma.fileAttachment.delete({ where: { id } });
    return { success: true };
  }
}
