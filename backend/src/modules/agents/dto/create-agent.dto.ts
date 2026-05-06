import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AgentType, AgentStatus } from '../../../database/entities/agent.entity';

const AGENT_TYPES: AgentType[] = ['conversacional', 'extractor', 'ocr', 'clasificador'];
const AGENT_STATUSES: AgentStatus[] = ['activo', 'inactivo'];

export class CreateAgentDto {
  @ApiProperty({ example: 'Extractor de contratos', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Extrae cláusulas clave de contratos legales' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AGENT_TYPES, example: 'extractor' })
  @IsIn(AGENT_TYPES)
  type: AgentType;

  @ApiProperty({
    example: 'CO-000',
    description:
      'Acrónimo del template de modelo (p. ej. CO-000, CG-001, CL-002) o modelo legacy.',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  llmModel: string;

  @ApiPropertyOptional({ enum: AGENT_STATUSES, example: 'inactivo' })
  @IsIn(AGENT_STATUSES)
  @IsOptional()
  status?: AgentStatus;

  @ApiPropertyOptional({ type: Object, description: 'Configuración adicional (system prompt, temperatura, etc.)' })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
