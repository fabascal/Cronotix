import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { LlmProviderId } from '../../../database/entities/llm-provider-config.entity';

const PROVIDERS: LlmProviderId[] = ['openai', 'gemini', 'ollama'];

export class CreateLlmModelDto {
  @ApiProperty({ enum: PROVIDERS, example: 'openai' })
  @IsIn(PROVIDERS)
  provider: LlmProviderId;

  @ApiProperty({ example: 'gpt-5.4', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelId: string;

  @ApiPropertyOptional({ example: 'GPT-5.4 (Razonamiento)', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
