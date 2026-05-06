import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  IsUUID,
  IsBoolean,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RecurrenceType, DeliveryType } from '../../../database/entities/agent-schedule.entity';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Reporte diario de ventas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'UUID de la función del agente a ejecutar' })
  @IsUUID()
  functionId: string;

  @ApiPropertyOptional({ description: 'Parámetros estáticos para el webhook', type: Object })
  @IsObject()
  @IsOptional()
  staticParams?: Record<string, unknown>;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Instrucciones para el LLM del agente: transforma el JSON del webhook en texto natural (skills del agente aplican).',
    maxLength: 2000,
  })
  @ValidateIf((_, v: unknown) => v != null)
  @IsString()
  @MaxLength(2000)
  processingPrompt?: string | null;

  @ApiProperty({ enum: ['interval', 'daily', 'weekly', 'monthly', 'once'] })
  @IsString()
  @IsIn(['interval', 'daily', 'weekly', 'monthly', 'once'])
  recurrenceType: RecurrenceType;

  @ApiProperty({ description: 'Configuración user-friendly de la recurrencia', type: Object })
  @IsObject()
  recurrenceConfig: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['none', 'email', 'whatsapp', 'telegram'], default: 'none' })
  @IsString()
  @IsOptional()
  @IsIn(['none', 'email', 'whatsapp', 'telegram'])
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ description: 'UUID de la lista de contacto' })
  @IsUUID()
  @IsOptional()
  contactListId?: string;

  @ApiPropertyOptional({ description: 'UUID de la configuración SMTP' })
  @IsUUID()
  @IsOptional()
  smtpConfigId?: string;

  @ApiPropertyOptional({ description: 'UUID de la configuración WhatsApp' })
  @IsUUID()
  @IsOptional()
  whatsappConfigId?: string;

  @ApiPropertyOptional({ description: 'UUID de la configuración Telegram' })
  @IsUUID()
  @IsOptional()
  telegramConfigId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
