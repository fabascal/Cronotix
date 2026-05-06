import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole } from '../../../database/entities/user.entity';

const USER_ROLES: UserRole[] = ['superadmin', 'admin', 'user'];

export class CreateUserDto {
  @ApiProperty({ example: 'Ana López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'ana@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: USER_ROLES, default: 'user' })
  @IsIn(USER_ROLES)
  @IsOptional()
  role?: UserRole;

  /** RBAC role id — null usa solo el campo legacy `role` */
  @ApiPropertyOptional({ type: String })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ type: String })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
