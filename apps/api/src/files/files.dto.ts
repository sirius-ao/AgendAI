import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePlanUploadDto {
  @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @IsString() @MinLength(1) @MaxLength(120) contentType!: string;
  @IsInt() @Min(1) @Max(10 * 1024 * 1024) size!: number;
}
