import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Tenant } from '../../database/entities/tenant.entity';
import { AgentsService } from './agents.service';

@ApiTags('Agents')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('documents/:documentId/summarize')
  @ApiOperation({ summary: '[Fase 1] Summarize a processed document' })
  @ApiResponse({ status: 501, description: 'Not yet implemented — coming in Fase 1' })
  async summarize(
    @CurrentTenant() tenant: Tenant,
    @Param('documentId') documentId: string,
  ) {
    return this.agentsService.summarize(documentId, tenant.id);
  }

  @Post('documents/:documentId/extract-fields')
  @ApiOperation({ summary: '[Fase 2] Extract structured fields from a document' })
  @ApiResponse({ status: 501, description: 'Not yet implemented — coming in Fase 2' })
  async extractFields(
    @CurrentTenant() tenant: Tenant,
    @Param('documentId') documentId: string,
  ) {
    return this.agentsService.extractFields(documentId, tenant.id);
  }
}
