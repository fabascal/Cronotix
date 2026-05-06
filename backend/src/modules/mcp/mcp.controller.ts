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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { McpCrudService } from './mcp-crud.service';
import { McpRouterService } from './mcp-router.service';
import { CreateMcpIntegrationDto } from './dto/create-mcp-integration.dto';
import { UpdateMcpIntegrationDto } from './dto/update-mcp-integration.dto';

@ApiTags('MCP Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1')
export class McpController {
  constructor(
    private readonly crudService: McpCrudService,
    private readonly routerService: McpRouterService,
  ) {}

  @Get('mcp/types')
  @ApiOperation({ summary: 'Listar tipos de integración MCP disponibles' })
  getTypes() {
    return this.routerService.getAvailableTypes();
  }

  @Get('agents/:agentId/mcp')
  @ApiOperation({ summary: 'Listar integraciones MCP del agente' })
  async list(
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.list(agentId, user.tenantId);
  }

  @Post('agents/:agentId/mcp')
  @ApiOperation({ summary: 'Agregar integración MCP al agente' })
  async create(
    @Param('agentId') agentId: string,
    @Body() dto: CreateMcpIntegrationDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.crudService.create(agentId, dto, user.tenantId);
  }

  @Patch('agents/:agentId/mcp/:id')
  @ApiOperation({ summary: 'Editar integración MCP' })
  async update(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMcpIntegrationDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.crudService.update(agentId, id, dto, user.tenantId);
    if (!result) throw new NotFoundException('Integración no encontrada');
    return result;
  }

  @Delete('agents/:agentId/mcp/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar integración MCP' })
  async remove(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const deleted = await this.crudService.remove(agentId, id, user.tenantId);
    if (!deleted) throw new NotFoundException('Integración no encontrada');
  }
}
