import { PartialType } from '@nestjs/swagger';
import { CreateMcpIntegrationDto } from './create-mcp-integration.dto';

export class UpdateMcpIntegrationDto extends PartialType(CreateMcpIntegrationDto) {}
