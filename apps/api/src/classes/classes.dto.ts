import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateClassDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(20) year!: string;
  @IsOptional() @IsString() @MaxLength(80) level?: string;
  @IsOptional() @IsString() @MaxLength(80) room?: string;
  @IsOptional() @IsString() @MaxLength(40) shift?: string;
  @IsOptional() @IsString() @MaxLength(120) director?: string;
}
export class UpdateClassDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) year?: string;
  @IsOptional() @IsString() @MaxLength(80) level?: string;
  @IsOptional() @IsString() @MaxLength(80) room?: string;
  @IsOptional() @IsString() @MaxLength(40) shift?: string;
  @IsOptional() @IsString() @MaxLength(120) director?: string;
}
export class CreateStudentDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) contact?: string;
  @IsOptional() @IsIn(['ACTIVE', 'TRANSFERRED']) status?: 'ACTIVE' | 'TRANSFERRED';
}
