import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';

@ApiTags('API Keys (Settings)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/settings/api-keys')
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  private requireTenant(user: JwtUserPayload): string {
    if (!user.tenantId) {
      throw new BadRequestException('Tu usuario no tiene un tenant asignado');
    }
    return user.tenantId;
  }

  @Post()
  @ApiOperation({ summary: 'Generar nueva API Key para el tenant' })
  async create(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: { name: string; scopes?: string[] },
  ) {
    const tenantId = this.requireTenant(user);
    const { apiKey, rawKey } = await this.service.generate(
      tenantId,
      body.name,
      body.scopes,
    );
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      key: rawKey,
      createdAt: apiKey.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar API Keys del tenant (sin valor completo)' })
  async findAll(@CurrentUser() user: JwtUserPayload) {
    const tenantId = this.requireTenant(user);
    const keys = await this.service.findAllByTenant(tenantId);
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar una API Key' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const tenantId = this.requireTenant(user);
    await this.service.revoke(id, tenantId);
  }
}
