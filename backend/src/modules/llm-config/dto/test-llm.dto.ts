import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestLlmDto {
  @ApiPropertyOptional({ description: 'Clave API (si aún no guardada en servidor)' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string;
}
