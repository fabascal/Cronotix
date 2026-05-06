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
import { WhatsappChannelService } from './whatsapp-channel.service';

class CreateWhatsappChannelDto {
  @ApiProperty({ example: 'Soporte clientes' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  name: string;

  @ApiProperty({ description: 'UUID de la configuración WhatsApp (línea)' })
  @IsUUID()
  whatsappConfigId: string;

  @ApiProperty({ description: 'UUID del agente que responderá' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean() @IsOptional()
  whitelistEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'UUIDs of ContactList records used as whitelist' })
  @IsArray() @IsOptional()
  whitelistContactListIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}

class UpdateWhatsappChannelDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(128) name?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() whatsappConfigId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() agentId?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() whitelistEnabled?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() whitelistContactListIds?: string[];
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

@ApiTags('WhatsApp Channels')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/whatsapp/channels')
export class WhatsappChannelController {
  constructor(private readonly channelService: WhatsappChannelService) {}

  @Get()
  @ApiOperation({ summary: 'Listar canales WhatsApp del tenant' })
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
  @ApiOperation({ summary: 'Crear canal WhatsApp' })
  create(@Body() dto: CreateWhatsappChannelDto, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar canal WhatsApp' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappChannelDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.channelService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar canal WhatsApp' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.remove(id, user.tenantId);
  }

  @Get(':id/conversations')
  @ApiOperation({ summary: 'Listar conversaciones activas del canal' })
  conversations(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.channelService.listConversations(id, user.tenantId);
  }

  @Delete(':id/conversations/:phone')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpiar historial de conversación de un número' })
  clearHistory(
    @Param('id') id: string,
    @Param('phone') phone: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.channelService.clearHistory(id, user.tenantId, phone);
  }
}
