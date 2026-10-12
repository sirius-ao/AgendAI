import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module.js';

function requireHttpsOrLocalhost(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} é obrigatório em produção`);
  const parsed = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !local) throw new Error(`${name} deve usar HTTPS em produção`);
}

async function bootstrap() {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatório');
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ADMIN_MFA_REQUIRED !== undefined && !['true', 'false'].includes(process.env.ADMIN_MFA_REQUIRED.trim().toLowerCase())) {
      throw new Error('ADMIN_MFA_REQUIRED deve ser true ou false');
    }
    const databasePassword = new URL(process.env.DATABASE_URL).password;
    if (databasePassword.length < 32) throw new Error('A palavra-passe da base de dados deve ter pelo menos 32 caracteres aleatórios');
    requireHttpsOrLocalhost(process.env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL');
    requireHttpsOrLocalhost(process.env.S3_PUBLIC_ENDPOINT, 'S3_PUBLIC_ENDPOINT');
    if (!process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY.length < 16 || !process.env.S3_SECRET_KEY || process.env.S3_SECRET_KEY.length < 32) {
      throw new Error('S3_ACCESS_KEY e S3_SECRET_KEY devem ser segredos únicos e fortes em produção');
    }
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_HOSTNAMES?.split(',').some((host) => host.trim())) {
      throw new Error('TURNSTILE_SECRET_KEY e TURNSTILE_HOSTNAMES são obrigatórios em produção');
    }
    if (!process.env.SUPER_ADMIN_EMAILS?.split(',').some((email) => email.trim()) || !/^[a-f\d]{64}$/i.test(process.env.ADMIN_BACKUP_ENCRYPTION_KEY || '') || !/^[a-f\d]{64}$/i.test(process.env.ADMIN_MFA_ENCRYPTION_KEY || '')) {
      throw new Error('SUPER_ADMIN_EMAILS, ADMIN_BACKUP_ENCRYPTION_KEY e ADMIN_MFA_ENCRYPTION_KEY são obrigatórios em produção');
    }
  }
  if (process.env.NODE_ENV === 'production' && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.CONTACT_EMAIL)) {
    throw new Error('RESEND_API_KEY, EMAIL_FROM e CONTACT_EMAIL são obrigatórios em produção');
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: webOrigin.split(',').map((origin) => origin.trim()), credentials: true });
  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
