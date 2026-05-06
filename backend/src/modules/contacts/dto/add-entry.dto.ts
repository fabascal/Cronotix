import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddContactEntryDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+52 55 1234 5678' })
  @Matches(/^\+?[\d\s\-().]{6,20}$/, { message: 'El teléfono no es válido' })
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Telegram Chat ID numérico' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  telegramId?: string;
}
