import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
