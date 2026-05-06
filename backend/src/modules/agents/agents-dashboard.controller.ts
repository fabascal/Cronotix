import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { AgentsCrudService } from './agents-crud.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { ChatAgentDto } from './dto/chat-agent.dto';
import { AssignSkillsDto } from './dto/assign-skills.dto';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';
import { AssignDocumentsDto } from './dto/assign-documents.dto';

@ApiTags('Agents (Dashboard)')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/agents')
export class AgentsDashboardController {
  constructor(private readonly crudService: AgentsCrudService) {}

  /**
   * Returns the effective workspace key for a user.
   * Regular users use their tenantId; superadmins without tenant use their own userId.
   */
  private effectiveTenant(user: JwtUserPayload): string | null {
    if (user.tenantId) return user.tenantId;
    if (user.role === 'superadmin') return user.sub;
    return null;
  }

  @Get()
  @ApiOperation({ summary: 'Listar agentes del tenant autenticado' })
  async findAll(@CurrentUser() user: JwtUserPayload) {
    return this.crudService.findAll(user.tenantId);
  }

  @Post('generate-description')
  @ApiOperation({ summary: 'Genera una descripción de agente usando Ollama' })
  async generateDescription(
    @Body() dto: GenerateDescriptionDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.generateDescription(dto, this.effectiveTenant(user));
  }

  @Post('generate-system-prompt')
  @ApiOperation({ summary: 'Genera instrucciones del sistema para un agente usando Ollama' })
  async generateSystemPrompt(
    @Body() dto: GenerateDescriptionDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.generateSystemPrompt(dto, this.effectiveTenant(user));
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo agente' })
  async create(
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.create(dto, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener agente por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    const agent = await this.crudService.findOne(id, user.tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar agente' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const agent = await this.crudService.update(id, dto, user.tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar agente' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    const deleted = await this.crudService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Agente no encontrado');
  }

  @Get(':id/skills')
  @ApiOperation({ summary: 'Obtener skills asignados al agente' })
  async getSkills(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.crudService.getAgentSkills(id, user.tenantId);
  }

  @Put(':id/skills')
  @ApiOperation({ summary: 'Asignar skills al agente (reemplaza todos)' })
  async assignSkills(
    @Param('id') id: string,
    @Body() dto: AssignSkillsDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.assignSkills(id, dto.skillIds, user.tenantId);
  }

  // ─── Agent Documents ─────────────────────────────────────────────────────

  @Get(':id/documents')
  @ApiOperation({ summary: 'Listar documentos asignados al agente' })
  async getDocuments(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.crudService.getAgentDocuments(id, user.tenantId);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Asignar documentos al agente (reemplaza todos)' })
  async assignDocuments(
    @Param('id') id: string,
    @Body() dto: AssignDocumentsDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.assignDocuments(id, dto.documentIds, user.tenantId);
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desasignar un documento del agente' })
  async removeDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const removed = await this.crudService.removeDocument(id, docId, user.tenantId);
    if (!removed) throw new NotFoundException('Documento no encontrado');
  }

  // ─── Agent Functions ─────────────────────────────────────────────────────

  @Get(':id/functions')
  @ApiOperation({ summary: 'Listar funciones del agente' })
  async getFunctions(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.crudService.getAgentFunctions(id, user.tenantId);
  }

  @Post(':id/functions')
  @ApiOperation({ summary: 'Crear una función para el agente' })
  async createFunction(
    @Param('id') id: string,
    @Body() dto: CreateFunctionDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.createFunction(id, dto, user.tenantId);
  }

  @Patch(':id/functions/:fnId')
  @ApiOperation({ summary: 'Actualizar función del agente' })
  async updateFunction(
    @Param('id') id: string,
    @Param('fnId') fnId: string,
    @Body() dto: UpdateFunctionDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.updateFunction(id, fnId, dto, user.tenantId);
  }

  @Delete(':id/functions/:fnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar función del agente' })
  async removeFunction(
    @Param('id') id: string,
    @Param('fnId') fnId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.crudService.removeFunction(id, fnId, user.tenantId);
  }

  // ─── Chat ───────────────────────────────────────────────────────────────

  @Post(':id/chat')
  @ApiOperation({ summary: 'Enviar un mensaje al agente (Playground)' })
  async chat(
    @Param('id') id: string,
    @Body() dto: ChatAgentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.chat(id, dto, user.tenantId, this.effectiveTenant(user));
  }

  @Post(':id/chat/stream')
  @ApiOperation({ summary: 'Chat con el agente en modo streaming (SSE)' })
  async chatStream(
    @Param('id') id: string,
    @Body() dto: ChatAgentDto,
    @CurrentUser() user: JwtUserPayload,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = this.crudService.chatStream(
        id,
        dto,
        user.tenantId,
        this.effectiveTenant(user),
      );
      for await (const chunk of stream) {
        // Tool events come as JSON strings with toolCall/toolResult keys
        if (chunk.startsWith('{')) {
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.toolCall) {
              res.write(`event: tool_call\ndata: ${chunk}\n\n`);
              continue;
            }
            if (parsed.toolResult) {
              res.write(`event: tool_result\ndata: ${chunk}\n\n`);
              continue;
            }
          } catch { /* not JSON, treat as text */ }
        }
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
