import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
@Module({ imports: [AuthModule, SchoolsModule], controllers: [ClassesController], providers: [ClassesService] })
export class ClassesModule {}
