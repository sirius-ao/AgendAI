import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { TeachingModule } from '../teaching/teaching.module.js';

@Module({ imports: [AuthModule, SchoolsModule, TeachingModule], controllers: [FilesController], providers: [FilesService] })
export class FilesModule {}
