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
import { ApiProperty, ApiPropertyOptional, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser, type JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { TelegramConfigService } from './telegram-config.service';

class CreateTelegramConfigDto {
  @ApiProperty({ example: 'Bot Soporte' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: 'Telegram Bot Token de BotFather' })
  @IsString() @IsNotEmpty()
  botToken: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  isDefault?: boolean;
}

class UpdateTelegramConfigDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(128) name?: string;
  @ApiPropertyOptional({ description: 'Dejar vacío para no cambiar' }) @IsString() @IsOptional() botToken?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isDefault?: boolean;
}

class TestSendTelegramDto {
  @ApiProperty({ example: '123456789', description: 'Telegram Chat ID del destinatario' })
  @IsString() @IsNotEmpty()
  chatId: string;
}

@ApiTags('Telegram Config')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/settings/telegram')
export class TelegramConfigController {
  constructor(private readonly telegramService: TelegramConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configuraciones de bot Telegram' })
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.telegramService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear configuración de bot Telegram' })
  create(@Body() dto: CreateTelegramConfigDto, @CurrentUser() user: JwtUserPayload) {
    return this.telegramService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar configuración de bot Telegram' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTelegramConfigDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.telegramService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración de bot Telegram' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.telegramService.remove(id, user.tenantId);
  }

  @Post(':id/test-send')
  @ApiOperation({ summary: 'Enviar mensaje de prueba por Telegram' })
  testSend(
    @Param('id') id: string,
    @Body() dto: TestSendTelegramDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.telegramService.testSend(id, user.tenantId, dto.chatId);
  }
}
