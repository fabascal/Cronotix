import { IsString, IsOptional, IsEnum, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DocumentType } from '../../database/entities/document.entity';

export class IngestDocumentDto {
  @ApiProperty({ description: 'External document ID from Portal B' })
  @IsString()
  @MaxLength(255)
  externalId: string;

  @ApiProperty({
    description: 'Publicly accessible URL of the document (Portal B provides this)',
    example: 'https://portal-b.example.com/docs/abc123.pdf',
  })
  @IsUrl()
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'Document category for agent routing',
    enum: ['legal', 'medical', 'financial', 'other'],
    default: 'other',
  })
  @IsEnum(['legal', 'medical', 'financial', 'other'])
  @IsOptional()
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'Webhook URL to notify when processing is complete' })
  @IsUrl()
  @IsOptional()
  callbackUrl?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata to attach to the document' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
