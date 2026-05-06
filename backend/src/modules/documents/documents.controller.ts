import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Tenant } from '../../database/entities/tenant.entity';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './documents.dto';

/** Límite de tamaño del PDF: 25 MB (Document AI acepta hasta 20 MB sync). */
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

@ApiTags('Documents')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PDF_SIZE_BYTES },
    }),
  )
  @ApiOperation({
    summary: 'Sube un PDF para procesamiento con Document AI + embeddings',
    description:
      'Valida API key, revisa créditos del tenant, crea un Document en estado pending ' +
      'y encola un job para OCR con Google Document AI, generación de embeddings con ' +
      'Gemini text-embedding-004 y almacenamiento en pgvector.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fileName', 'description', 'seeboxPath'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Archivo PDF' },
        fileName: { type: 'string', example: 'escritura_1965.pdf' },
        description: { type: 'string', example: 'Escritura pública 1965' },
        seeboxPath: { type: 'string', example: '/seebox/storage/2026/04/escritura.pdf' },
        externalId: { type: 'string', example: 'SEEBOX-000123' },
        documentType: {
          type: 'string',
          enum: ['legal', 'medical', 'financial', 'other'],
          default: 'other',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Documento aceptado y encolado' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o faltante' })
  @ApiResponse({ status: 401, description: 'API key inválida o ausente' })
  @ApiResponse({ status: 402, description: 'Créditos insuficientes' })
  async upload(
    @CurrentTenant() tenant: Tenant,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    const result = await this.documentsService.upload(tenant, file, dto);
    return {
      status: 'accepted',
      message: 'Documento aceptado, procesándose con Document AI',
      ...result,
    };
  }

  @Get(':documentId/status')
  @ApiOperation({ summary: 'Consulta el estado de procesamiento de un documento' })
  @ApiParam({ name: 'documentId', description: 'UUID del documento' })
  async getStatus(
    @CurrentTenant() tenant: Tenant,
    @Param('documentId') documentId: string,
  ) {
    const doc = await this.documentsService.getStatus(documentId, tenant.id);
    if (!doc) {
      throw new NotFoundException(
        'Documento no encontrado o no pertenece a este tenant.',
      );
    }
    return doc;
  }
}
