import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateSchoolDto {
  @IsString() @MinLength(2) @MaxLength(140) name!: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(20) academicYear?: string;
}
export class SchoolQueryDto { @IsString() @IsIn(['OWNER', 'ADMIN', 'COORDINATOR', 'TEACHER']) role!: string; }
