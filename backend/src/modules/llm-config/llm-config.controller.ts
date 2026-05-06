import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { LlmConfigService } from './llm-config.service';
import { UpdateLlmSettingsDto } from './dto/update-llm-settings.dto';
import { TestLlmDto } from './dto/test-llm.dto';
import type { LlmProviderId } from '../../database/entities/llm-provider-config.entity';
import { CreateLlmModelDto } from './dto/create-llm-model.dto';

const PROVIDER_PARAM = ['openai', 'ollama', 'gemini'] as const;

@ApiTags('Configuración LLM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/settings/llm')
export class LlmConfigController {
  constructor(private readonly llmConfig: LlmConfigService) {}

  /**
   * Resolve the effective tenantId for LLM config storage.
   * - Regular users: use their real tenantId (may be null → service returns hasTenant: false).
   * - Superadmin without tenant: use their own userId as a personal workspace key.
   */
  private effectiveTenant(user: JwtUserPayload): string | null {
    if (user.tenantId) return user.tenantId;
    if (user.role === 'superadmin') return user.sub;
    return null;
  }

  @Get()
  @ApiOperation({ summary: 'Obtener configuración de modelos (claves enmascaradas)' })
  async get(@CurrentUser() user: JwtUserPayload) {
    return this.llmConfig.getSettings(this.effectiveTenant(user));
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar configuración de proveedores OpenAI, Ollama y Gemini' })
  async put(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateLlmSettingsDto,
  ) {
    return this.llmConfig.updateSettings(this.effectiveTenant(user), dto);
  }

  @Post(':provider/test')
  @ApiOperation({ summary: 'Probar conectividad con un proveedor' })
  async test(
    @CurrentUser() user: JwtUserPayload,
    @Param('provider') provider: string,
    @Body() body: TestLlmDto,
  ) {
    if (!PROVIDER_PARAM.includes(provider as (typeof PROVIDER_PARAM)[number])) {
      throw new BadRequestException('Proveedor inválido');
    }
    return this.llmConfig.testProvider(
      this.effectiveTenant(user),
      provider as LlmProviderId,
      body,
    );
  }

  @Post(':provider/models')
  @ApiOperation({
    summary:
      'Listar modelos disponibles del proveedor (usa credenciales guardadas o enviadas en request)',
  })
  async listProviderModels(
    @CurrentUser() user: JwtUserPayload,
    @Param('provider') provider: string,
    @Body() body: TestLlmDto,
  ) {
    if (!PROVIDER_PARAM.includes(provider as (typeof PROVIDER_PARAM)[number])) {
      throw new BadRequestException('Proveedor inválido');
    }
    return this.llmConfig.listProviderModels(
      this.effectiveTenant(user),
      provider as LlmProviderId,
      body,
    );
  }

  @Get('models')
  @ApiOperation({ summary: 'Listar templates de modelos IA del tenant' })
  async listModels(@CurrentUser() user: JwtUserPayload) {
    return this.llmConfig.listModels(this.effectiveTenant(user));
  }

  @Post('models')
  @ApiOperation({
    summary:
      'Crear template de modelo IA (valida conectividad del proveedor antes de guardar)',
  })
  async createModel(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateLlmModelDto,
  ) {
    return this.llmConfig.createModel(this.effectiveTenant(user), dto);
  }

  @Post('models/:id/set-system-model')
  @ApiOperation({ summary: 'Designar un modelo Ollama como modelo del sistema para generación IA' })
  async setSystemModel(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.llmConfig.setSystemModel(this.effectiveTenant(user), id);
  }
}
