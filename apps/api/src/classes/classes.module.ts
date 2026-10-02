import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
@Module({ imports: [SchoolsModule], controllers: [ClassesController], providers: [ClassesService] })
export class ClassesModule {}
