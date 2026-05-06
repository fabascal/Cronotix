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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('Agent Schedules')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/agents/:agentId/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar schedules del agente' })
  findAll(
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.findAll(agentId, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un schedule para el agente' })
  create(
    @Param('agentId') agentId: string,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.create(agentId, user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un schedule por ID' })
  findOne(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.findOne(agentId, id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un schedule' })
  update(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.update(agentId, id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un schedule' })
  remove(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.remove(agentId, id, user.tenantId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar / desactivar un schedule' })
  toggle(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.toggle(agentId, id, user.tenantId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Historial de ejecuciones del schedule' })
  getExecutions(
    @Param('agentId') agentId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.schedulesService.getExecutions(agentId, id, user.tenantId);
  }
}
