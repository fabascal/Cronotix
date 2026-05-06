import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFunctionDto {
  @ApiProperty({ example: 'buscar_cliente', description: 'Nombre de la función (snake_case)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'El nombre debe ser snake_case: letras minúsculas, números y guiones bajos',
  })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la función para el LLM' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'JSON Schema de los parámetros de la función', type: Object })
  @IsObject()
  parameters: Record<string, unknown>;

  @ApiProperty({ example: 'https://api.example.com/search', description: 'URL del webhook' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  webhookUrl: string;

  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT', 'PATCH'], default: 'POST' })
  @IsString()
  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH'])
  webhookMethod?: string;

  @ApiPropertyOptional({ description: 'Headers HTTP (se encriptan con AES-256)', type: Object })
  @IsObject()
  @IsOptional()
  webhookHeaders?: Record<string, string>;

  @ApiPropertyOptional({ default: 10000, description: 'Timeout en ms' })
  @IsInt()
  @IsOptional()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;
}
