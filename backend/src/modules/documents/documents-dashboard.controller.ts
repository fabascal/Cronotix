import {
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

@ApiTags('Documents (Dashboard)')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/dashboard/documents')
export class DocumentsDashboardController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos del tenant autenticado' })
  async findAll(@CurrentUser() user: JwtUserPayload) {
    return this.documentsService.findAllByTenant(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un documento' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const doc = await this.documentsService.getStatus(id, user.tenantId);
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PDF_SIZE_BYTES } }),
  )
  @ApiOperation({ summary: 'Subir un PDF desde el dashboard' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fileName', 'description'],
      properties: {
        file: { type: 'string', format: 'binary' },
        fileName: { type: 'string' },
        description: { type: 'string' },
        documentType: {
          type: 'string',
          enum: ['legal', 'medical', 'financial', 'other'],
          default: 'other',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Documento aceptado' })
  async upload(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { fileName: string; description: string; documentType?: string },
  ) {
    let tenant = await this.documentsService.getTenantById(user.tenantId);
    if (!tenant) {
      tenant = await this.documentsService.getFirstTenant();
    }
    if (!tenant) throw new BadRequestException('No hay tenant disponible para asociar el documento.');

    const result = await this.documentsService.upload(tenant, file, {
      fileName: body.fileName,
      description: body.description,
      seeboxPath: 'dashboard-upload',
      documentType: (body.documentType as 'legal' | 'medical' | 'financial' | 'other') ?? 'other',
    });
    return { status: 'accepted', ...result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar documento y sus chunks' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const deleted = await this.documentsService.removeDocument(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Documento no encontrado');
  }
}
