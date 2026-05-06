import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { McpIntegrationType } from '../../../database/entities/mcp-integration.entity';

const MCP_TYPES: McpIntegrationType[] = ['filesystem', 'postgresql', 'github', 'slack', 'notion', 'http'];

export class CreateMcpIntegrationDto {
  @ApiProperty({ enum: MCP_TYPES })
  @IsString()
  @IsNotEmpty()
  @IsIn(MCP_TYPES)
  type: McpIntegrationType;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object, description: 'Sensitive fields (tokens, passwords) — encrypted before storage' })
  @IsObject()
  @IsOptional()
  secrets?: Record<string, string>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
