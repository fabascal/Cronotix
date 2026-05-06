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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { SkillsCrudService } from './skills-crud.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@ApiTags('Skills (Dashboard)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/skills')
export class SkillsDashboardController {
  constructor(private readonly skillsService: SkillsCrudService) {}

  private effectiveTenant(user: JwtUserPayload): string | null {
    if (user.tenantId) return user.tenantId;
    if (user.role === 'superadmin') return user.sub;
    return null;
  }

  @Get()
  @ApiOperation({ summary: 'Listar skills disponibles (globales + tenant)' })
  async findAll(@CurrentUser() user: JwtUserPayload) {
    return this.skillsService.findByTenant(this.effectiveTenant(user), true);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo skill' })
  async create(
    @Body() dto: CreateSkillDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.skillsService.create(
      dto,
      this.effectiveTenant(user),
      user.role === 'superadmin',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener skill por ID' })
  async findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar skill' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.skillsService.update(
      id,
      dto,
      this.effectiveTenant(user),
      user.role === 'superadmin',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar skill' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    await this.skillsService.remove(
      id,
      this.effectiveTenant(user),
      user.role === 'superadmin',
    );
  }
}
