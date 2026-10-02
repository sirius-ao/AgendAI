import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
export class InviteMemberDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['ADMIN', 'COORDINATOR', 'TEACHER']) role!: 'ADMIN' | 'COORDINATOR' | 'TEACHER';
}
export class ChangeMemberRoleDto { @IsIn(['ADMIN', 'COORDINATOR', 'TEACHER']) role!: 'ADMIN' | 'COORDINATOR' | 'TEACHER'; }
export class AcceptInvitationDto { @IsString() @MinLength(40) @MaxLength(100) token!: string; }
