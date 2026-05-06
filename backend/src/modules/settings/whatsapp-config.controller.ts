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
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { WhatsappConfigService } from './whatsapp-config.service';

class CreateWhatsappConfigDto {
  @ApiProperty({ example: 'Línea principal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiProperty({ example: '123456789012345', description: 'Meta Phone Number ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  phoneNumberId: string;

  @ApiProperty({ description: 'Meta permanent access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

class UpdateWhatsappConfigDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(128) name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(64) phoneNumberId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() accessToken?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isDefault?: boolean;
}

class TestSendDto {
  @ApiProperty({ example: '521234567890', description: 'Country code + number, no +' })
  @IsString()
  @IsNotEmpty()
  to: string;
}

@ApiTags('Settings — WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/settings/whatsapp')
export class WhatsappConfigController {
  constructor(private readonly whatsappService: WhatsappConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configuraciones WhatsApp del tenant' })
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.whatsappService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear configuración WhatsApp' })
  create(
    @Body() dto: CreateWhatsappConfigDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.whatsappService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar configuración WhatsApp' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappConfigDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.whatsappService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración WhatsApp' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.whatsappService.remove(id, user.tenantId);
  }

  @Post(':id/test-send')
  @ApiOperation({ summary: 'Enviar mensaje de prueba por WhatsApp' })
  testSend(
    @Param('id') id: string,
    @Body() dto: TestSendDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.whatsappService.testSend(id, user.tenantId, dto.to);
  }
}
