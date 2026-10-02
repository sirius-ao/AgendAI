import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { TeachingController } from './teaching.controller.js';
import { TeachingService } from './teaching.service.js';
@Module({ imports: [AuthModule, AuditModule, SchoolsModule], controllers: [TeachingController], providers: [TeachingService], exports: [TeachingService] })
export class TeachingModule {}
