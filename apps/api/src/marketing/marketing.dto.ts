import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(140) school?: string;
  @IsOptional() @IsString() @MaxLength(40) plan?: string;
  @IsString() @MinLength(10) @MaxLength(4000) message!: string;
}

export class NewsletterSubscribeDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsBoolean() @Equals(true) consent!: boolean;
}

export class NewsletterTokenDto {
  @IsString() @MinLength(40) @MaxLength(100) token!: string;
}
