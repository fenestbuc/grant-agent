
import { IsString, IsOptional, IsObject } from 'class-validator';

export class PaginationDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() per_page?: string;
  @IsOptional() @IsString() search?: string;
}

export class ApplicationDto {
  @IsOptional() @IsString() id?: string;
  @IsString() grantId: string;
  @IsObject() answers: Record<string, string>;
  @IsOptional() @IsString() status?: string;
}

export class GenerateAnswerDto {
  @IsString() grantId: string;
  @IsString() questionId: string;
}
