import { IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class OpenAiDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'URL base opcional (OpenAI-compatible / proxy)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string;

  /**
   * Nueva clave API. Omitir para no cambiar.
   * Cadena vacía o null = borrar clave almacenada.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;
}

class OllamaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'http://127.0.0.1:11434' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string;
}

class GeminiDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class UpdateLlmSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenAiDto)
  openai?: OpenAiDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OllamaDto)
  ollama?: OllamaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GeminiDto)
  gemini?: GeminiDto;
}
