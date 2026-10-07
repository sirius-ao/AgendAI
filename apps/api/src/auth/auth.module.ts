import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { EmailService } from './email.service.js';
import { TurnstileService } from './turnstile.service.js';

@Module({ controllers: [AuthController], providers: [AuthService, AuthGuard, AuthRateLimitGuard, EmailService, TurnstileService], exports: [AuthGuard, AuthRateLimitGuard, EmailService, TurnstileService] })
export class AuthModule {}
