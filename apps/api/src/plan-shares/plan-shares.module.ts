import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { PlanSharesController } from './plan-shares.controller.js';
import { PlanSharesService } from './plan-shares.service.js';

@Module({
  imports: [AuthModule, SchoolsModule],
  controllers: [PlanSharesController],
  providers: [PlanSharesService],
})
export class PlanSharesModule {}
