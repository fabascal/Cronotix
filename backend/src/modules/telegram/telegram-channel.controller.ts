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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser, type JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { TelegramChannelService } from './telegram-channel.service';

class CreateTelegramChannelDto {
  @ApiProperty({ example: 'Bot Soporte' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: 'UUID de la configuración del bot Telegram' })
  @IsUUID()
  telegramConfigId: string;

  @ApiProperty({ description: 'UUID del agente que responderá' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  whitelistEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['123456789'] })
  @IsArray() @IsOptional()
  whitelistChatIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}

class UpdateTelegramChannelDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(128) name?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() telegramConfigId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() agentId?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() whitelistEnabled?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() whitelistChatIds?: string[];
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

class RegisterWebhookDto {
  @ApiProperty({ example: 'https://mi-servidor.com', description: 'URL base pública del servidor' })
  @IsString() @IsNotEmpty()
  baseUrl: string;
}

@ApiTags('Telegram Channels')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/telegram/channels')
export class TelegramChannelController {
  constructor(private readonly channelService: TelegramChannelService) {}

  @Get()
  @ApiOperation({ summary: 'Listar canales Telegram' })
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Query('agentId') agentId?: string,
  ) {
    return this.channelService.findAll(user.tenantId, agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener canal por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.findOne(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear canal Telegram' })
  create(@Body() dto: CreateTelegramChannelDto, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar canal Telegram' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTelegramChannelDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.channelService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar canal Telegram' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.remove(id, user.tenantId);
  }

  @Get(':id/conversations')
  @ApiOperation({ summary: 'Listar conversaciones del canal' })
  conversations(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.listConversations(id, user.tenantId);
  }

  @Delete(':id/conversations/:chatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpiar historial de conversación' })
  clearHistory(
    @Param('id') id: string,
    @Param('chatId') chatId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.channelService.clearHistory(id, user.tenantId, chatId);
  }

  @Post(':id/register-webhook')
  @ApiOperation({ summary: 'Registrar webhook en Telegram para este canal' })
  registerWebhook(
    @Param('id') id: string,
    @Body() dto: RegisterWebhookDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.channelService.registerWebhook(id, user.tenantId, dto.baseUrl);
  }
}
