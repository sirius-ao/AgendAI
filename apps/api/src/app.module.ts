import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { SchoolsModule } from './schools/schools.module.js';
import { ClassesModule } from './classes/classes.module.js';

@Module({ imports: [PrismaModule, AuthModule, SchoolsModule, ClassesModule], controllers: [HealthController] })
export class AppModule {}
