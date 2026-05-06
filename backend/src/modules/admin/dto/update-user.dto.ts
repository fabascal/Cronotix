import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole } from '../../../database/entities/user.entity';

const USER_ROLES: UserRole[] = ['superadmin', 'admin', 'user'];

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  /** Provide to change password; omit to keep current */
  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsIn(USER_ROLES)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ type: String })
  @IsUUID()
  @IsOptional()
  roleId?: string | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
