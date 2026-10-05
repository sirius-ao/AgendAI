import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsModule } from '../schools/schools.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
@Module({ imports: [AuthModule, SchoolsModule], controllers: [MembersController], providers: [MembersService] })
export class MembersModule {}
