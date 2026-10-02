import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatório');
  if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_EMAIL_CONFIG !== 'false' && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.CONTACT_EMAIL)) {
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
