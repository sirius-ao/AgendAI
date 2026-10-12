import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class AdminListQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsUUID() @MaxLength(36) cursor?: string;
  @IsOptional() @IsString() @MaxLength(5) limit?: string;
  @IsOptional() @IsIn(['true', 'false']) active?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @IsOptional() @IsString() @MaxLength(40) entity?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class AdminStatusDto {
  @IsBoolean() active!: boolean;
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}

export class AdminRoleDto {
  @IsBoolean() superAdmin!: boolean;
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}

export class PlatformRoleDto {
  @IsIn(['NONE', 'SUPPORT', 'SUPER_ADMIN']) role!: 'NONE' | 'SUPPORT' | 'SUPER_ADMIN';
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}

export class AdminSupportActionDto {
  @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}

export class AdminMfaCodeDto {
  @IsString() @Matches(/^\d{6}$/) code!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
