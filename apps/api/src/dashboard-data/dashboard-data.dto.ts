import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class SaveDashboardRecordDto {
  @IsString() @MinLength(1) @MaxLength(120) id!: string;
  @IsObject() payload!: Record<string, unknown>;
}
