import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'Formato Legal', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Responde con estructura de cláusulas y lenguaje jurídico' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Siempre responde con estructura de cláusulas, cita artículos de ley…' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({ example: 'formato', maxLength: 64 })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Solo superadmin puede crear skills globales', default: false })
  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;
}
