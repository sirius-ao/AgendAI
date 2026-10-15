import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ReplaceTeacherSubjectsDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsString({ each: true }) subjectIds!: string[];
}
export class CreateSubjectRequestDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(500) details?: string;
}
export class ResolveSubjectRequestDto {
  @IsIn(['APPROVED', 'REJECTED']) status!: 'APPROVED' | 'REJECTED';
}
export class GenerateLessonPlanDto {
  @IsString() @MinLength(2) @MaxLength(160) theme!: string;
  @IsString() @MinLength(2) @MaxLength(120) subject!: string;
  @IsString() @MaxLength(100) className!: string;
  @IsInt() @Min(10) @Max(480) duration!: number;
  @IsOptional() @IsString() @MaxLength(2000) objectives?: string;
  @IsOptional() @IsString() @MaxLength(3000) content?: string;
  @IsOptional() @IsString() @MaxLength(100) lessonType?: string;
  @IsOptional() @IsString() @MaxLength(100) modality?: string;
  @IsOptional() @IsString() @MaxLength(2000) materials?: string;
}
