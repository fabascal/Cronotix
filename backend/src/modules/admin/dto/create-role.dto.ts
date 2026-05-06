import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MENU_SLUGS, type MenuSlug } from '../../../database/entities/role.entity';

export class CreateRoleDto {
  @ApiProperty({ example: 'Operador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Acceso a agentes y documentos' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['dashboard', 'agents'], enum: MENU_SLUGS, isArray: true })
  @IsArray()
  @IsIn([...MENU_SLUGS], { each: true })
  permissions: MenuSlug[];
}
