import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../../database/entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsCrudService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  /**
   * Returns skills available to a given tenant:
   *   - Global skills (isGlobal = true, isActive = true)
   *   - Tenant-scoped skills (tenantId matches, isActive = true)
   */
  async findAvailable(tenantId: string | null) {
    const qb = this.skillRepo
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .orderBy('s.isGlobal', 'DESC')
      .addOrderBy('s.name', 'ASC');

    if (tenantId) {
      qb.andWhere('(s.isGlobal = true OR s.tenantId = :tid)', { tid: tenantId });
    } else {
      qb.andWhere('s.isGlobal = true');
    }

    return qb.getMany();
  }

  /** List all skills owned by this tenant (for management page). */
  async findByTenant(tenantId: string | null, includeGlobal: boolean) {
    const qb = this.skillRepo
      .createQueryBuilder('s')
      .orderBy('s.isGlobal', 'DESC')
      .addOrderBy('s.createdAt', 'DESC');

    if (includeGlobal && tenantId) {
      qb.where('(s.tenantId = :tid OR s.isGlobal = true)', { tid: tenantId });
    } else if (tenantId) {
      qb.where('s.tenantId = :tid', { tid: tenantId });
    } else {
      qb.where('s.isGlobal = true');
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    return this.skillRepo.findOne({ where: { id } });
  }

  async create(
    dto: CreateSkillDto,
    tenantId: string | null,
    isSuperadmin: boolean,
  ) {
    const isGlobal = dto.isGlobal === true;
    if (isGlobal && !isSuperadmin) {
      throw new ForbiddenException('Solo un superadmin puede crear skills globales.');
    }

    const skill = this.skillRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      prompt: dto.prompt,
      category: dto.category ?? null,
      isGlobal,
      tenantId: isGlobal ? null : tenantId,
    });

    return this.skillRepo.save(skill);
  }

  async update(
    id: string,
    dto: UpdateSkillDto,
    tenantId: string | null,
    isSuperadmin: boolean,
  ) {
    const skill = await this.findOne(id);
    if (!skill) throw new NotFoundException('Skill no encontrado');

    if (skill.isGlobal && !isSuperadmin) {
      throw new ForbiddenException('Solo un superadmin puede editar skills globales.');
    }
    if (!skill.isGlobal && skill.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes permisos para editar este skill.');
    }

    if (dto.isGlobal !== undefined && dto.isGlobal !== skill.isGlobal && !isSuperadmin) {
      throw new ForbiddenException('Solo un superadmin puede cambiar la visibilidad global.');
    }

    Object.assign(skill, dto);
    if (dto.isGlobal === true) {
      skill.tenantId = null;
    } else if (dto.isGlobal === false && !skill.tenantId) {
      skill.tenantId = tenantId;
    }

    return this.skillRepo.save(skill);
  }

  async remove(id: string, tenantId: string | null, isSuperadmin: boolean) {
    const skill = await this.findOne(id);
    if (!skill) throw new NotFoundException('Skill no encontrado');

    if (skill.isGlobal && !isSuperadmin) {
      throw new ForbiddenException('Solo un superadmin puede eliminar skills globales.');
    }
    if (!skill.isGlobal && skill.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes permisos para eliminar este skill.');
    }

    await this.skillRepo.remove(skill);
    return true;
  }
}
