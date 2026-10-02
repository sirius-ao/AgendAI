import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { SchoolsModule } from './schools/schools.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { MembersModule } from './members/members.module.js';
import { DashboardDataModule } from './dashboard-data/dashboard-data.module.js';
import { AuditModule } from './audit/audit.module.js';
import { TeachingModule } from './teaching/teaching.module.js';
import { FilesModule } from './files/files.module.js';
import { MarketingModule } from './marketing/marketing.module.js';

@Module({ imports: [PrismaModule, AuthModule, SchoolsModule, ClassesModule, MembersModule, DashboardDataModule, AuditModule, TeachingModule, FilesModule, MarketingModule], controllers: [HealthController] })
export class AppModule {}
