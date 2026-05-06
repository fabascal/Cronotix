import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDescriptionDto {
  @ApiProperty({
    example: 'resumir',
    description: 'Tarea principal del agente (resumir, extraer, clasificar, responder, otro)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  purpose: string;

  @ApiProperty({
    example: 'legal',
    description: 'Dominio o industria (legal, médico, financiero, recursos_humanos, general)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  domain: string;

  @ApiPropertyOptional({
    example: 'Contratos de arrendamiento y escrituras notariales',
    description: 'Descripción libre de los documentos o acciones específicas',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  capabilities?: string;

  @ApiProperty({
    example: 'formal',
    description: 'Tono del agente (formal, técnico, amigable, neutro)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tone: string;
}
