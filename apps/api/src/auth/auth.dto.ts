import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) schoolName?: string;
  @IsOptional() @IsString() @MinLength(40) @MaxLength(100) invitationToken?: string;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}

export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(72) password!: string;
  @IsOptional() @IsString() @Matches(/^\d{6}$/) mfaCode?: string;
}

export class GoogleAuthDto {
  @IsString() @MinLength(100) @MaxLength(5000) credential!: string;
  @IsString() @Matches(/^(LOGIN|REGISTER)$/) mode!: 'LOGIN' | 'REGISTER';
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) schoolName?: string;
  @IsOptional() @IsString() @MinLength(40) @MaxLength(100) invitationToken?: string;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
  @IsOptional() @IsString() @Matches(/^\d{6}$/) mfaCode?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}
export class ForgotPasswordDto {
  @IsEmail() @MaxLength(254) email!: string;
}
export class ResetPasswordDto {
  @IsString() @MinLength(40) @MaxLength(100) token!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
}
export class VerifyEmailDto {
  @IsString() @MinLength(40) @MaxLength(100) token!: string;
}
export class ResendVerificationDto {
  @IsEmail() @MaxLength(254) email!: string;
}
export class MobileRefreshDto {
  @IsString() @MinLength(40) @MaxLength(100) refreshToken!: string;
}
