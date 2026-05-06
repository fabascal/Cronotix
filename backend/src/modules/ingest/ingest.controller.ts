import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Tenant } from '../../database/entities/tenant.entity';
import { IngestService } from './ingest.service';
import { IngestDocumentDto } from './ingest.dto';

@ApiTags('Ingest')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller({ path: 'ingest', version: '1' })
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ingest a document from Portal B',
    description:
      'Validates API key, checks tenant credits (returns 402 if insufficient), ' +
      'creates a document record and enqueues it for OCR processing.',
  })
  @ApiResponse({ status: 202, description: 'Document accepted and queued for processing' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  async ingest(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: IngestDocumentDto,
  ) {
    const result = await this.ingestService.ingest(tenant, dto);
    return {
      status: 'accepted',
      message: 'Document queued for OCR processing',
      ...result,
    };
  }

  @Get(':documentId/status')
  @ApiOperation({ summary: 'Get document processing status' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  async getStatus(
    @CurrentTenant() tenant: Tenant,
    @Param('documentId') documentId: string,
  ) {
    const doc = await this.ingestService.getStatus(documentId, tenant.id);
    if (!doc) {
      return { error: 'Document not found or does not belong to this tenant' };
    }
    return doc;
  }
}
