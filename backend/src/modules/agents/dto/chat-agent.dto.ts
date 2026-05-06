import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'tool'] })
  @IsIn(['user', 'assistant', 'tool'])
  role: 'user' | 'assistant' | 'tool';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'ID de la tool_call que originó este mensaje (role=tool)' })
  @IsString()
  @IsOptional()
  toolCallId?: string;
}

export class ChatAgentDto {
  @ApiProperty({ description: 'Último mensaje del usuario' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32_000)
  message: string;

  @ApiPropertyOptional({ type: [ChatMessageDto], description: 'Historial de la conversación' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  history?: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'Override temporal del system prompt (playground)' })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 128_000 })
  @IsNumber()
  @Min(1)
  @Max(128_000)
  @IsOptional()
  maxTokens?: number;
}
