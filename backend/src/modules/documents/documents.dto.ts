import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DocumentType } from '../../database/entities/document.entity';

/**
 * Payload multipart/form-data para subir un PDF.
 * El archivo propiamente viene via @UploadedFile('file') en el controller.
 */
export class UploadDocumentDto {
  @ApiProperty({
    description: 'Nombre original del archivo (sin ruta)',
    example: 'escritura_1965.pdf',
  })
  @IsString()
  @MaxLength(500)
  fileName: string;

  @ApiProperty({
    description: 'Descripción del contenido del documento',
    example: 'Escritura pública de compraventa firmada en 1965',
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Ruta completa donde el archivo fue almacenado en Seebox',
    example: '/seebox/storage/2026/04/escritura_1965.pdf',
  })
  @IsString()
  @MaxLength(1000)
  seeboxPath: string;

  @ApiPropertyOptional({
    description: 'ID externo de referencia (opcional)',
    example: 'SEEBOX-000123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  externalId?: string;

  @ApiPropertyOptional({
    description: 'Categoría del documento',
    enum: ['legal', 'medical', 'financial', 'other'],
    default: 'other',
  })
  @IsEnum(['legal', 'medical', 'financial', 'other'])
  @IsOptional()
  documentType?: DocumentType;
}
