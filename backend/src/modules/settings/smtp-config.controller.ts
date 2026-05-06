import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEmail,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { SmtpConfigService } from './smtp-config.service';

class CreateSmtpConfigDto {
  @ApiProperty({ example: 'Gmail corporativo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiProperty({ example: 'smtp.gmail.com' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'noreply@miempresa.com' })
  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

class UpdateSmtpConfigDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(128) name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() host?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() @Min(1) @Max(65535) port?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() username?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() password?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isDefault?: boolean;
}

class TestSendDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to: string;
}

@ApiTags('Settings — SMTP')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/settings/smtp')
export class SmtpConfigController {
  constructor(private readonly smtpService: SmtpConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configuraciones SMTP del tenant' })
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.smtpService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear configuración SMTP' })
  create(
    @Body() dto: CreateSmtpConfigDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.smtpService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar configuración SMTP' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSmtpConfigDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.smtpService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración SMTP' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.smtpService.remove(id, user.tenantId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Probar conexión SMTP' })
  testConnection(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.smtpService.testConnection(id, user.tenantId);
  }

  @Post(':id/test-send')
  @ApiOperation({ summary: 'Enviar correo de prueba' })
  testSend(
    @Param('id') id: string,
    @Body() dto: TestSendDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.smtpService.testSend(id, user.tenantId, dto.to);
  }
}
