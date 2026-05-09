
import { IsString, IsOptional, IsObject, IsBoolean, IsArray, IsNumber, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() per_page?: string;
  @IsOptional() @IsString() search?: string;
}

export class CreateApplicationDto {
  @IsString() grantId: string;
  @IsObject() answers: Record<string, string>;
  @IsOptional() @IsString() status?: string;
}

export class UpdateApplicationDto {
  @IsString() id: string;
  @IsOptional() @IsString() grantId?: string;
  @IsOptional() @IsObject() answers?: Record<string, string>;
  @IsOptional() @IsString() status?: string;
}

export class GenerateAnswerDto {
  @IsString() grantId: string;
  @IsString() questionId: string;
  @IsOptional() @IsNumber() maxLength?: number;
}

export class UploadKbDto {
  // File handled by interceptor, add metadata if needed
  @IsOptional() @IsString() description?: string;
}

export class GrantFilterDto extends PaginationDto {
  @IsOptional() @IsString() minAmount?: string;
  @IsOptional() @IsString() maxAmount?: string;
  @IsOptional() @IsArray() sector?: string[];
  @IsOptional() @IsArray() stage?: string[];
}
