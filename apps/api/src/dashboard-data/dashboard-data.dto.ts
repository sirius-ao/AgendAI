import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
export class SaveDashboardRecordDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) id!: string;
  @IsObject() payload!: Record<string, unknown>;
}

export class CreateDirectConversationDto {
  @IsUUID() recipientId!: string;
}

export class SetResourceSharingDto {
  @IsIn(['PRIVATE', 'SCHOOL', 'PLATFORM', 'PEOPLE']) mode!: 'PRIVATE' | 'SCHOOL' | 'PLATFORM' | 'PEOPLE';
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsEmail({}, { each: true }) emails?: string[];
}
