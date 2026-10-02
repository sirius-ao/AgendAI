import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { TeachingModule } from '../teaching/teaching.module.js';
import { DashboardDataController } from './dashboard-data.controller.js';
import { DashboardDataService } from './dashboard-data.service.js';
@Module({ imports: [AuthModule, SchoolsModule, TeachingModule], controllers: [DashboardDataController], providers: [DashboardDataService] })
export class DashboardDataModule {}
