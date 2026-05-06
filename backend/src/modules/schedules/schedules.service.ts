import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { AgentSchedule } from '../../database/entities/agent-schedule.entity';
import { ScheduleExecution } from '../../database/entities/schedule-execution.entity';
import { AgentFunction } from '../../database/entities/agent-function.entity';
import { Agent } from '../../database/entities/agent.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { buildCronExpression, computeDelay } from './recurrence.helper';

export const SCHEDULE_QUEUE = 'agent-schedules';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(AgentSchedule)
    private readonly scheduleRepo: Repository<AgentSchedule>,
    @InjectRepository(ScheduleExecution)
    private readonly executionRepo: Repository<ScheduleExecution>,
    @InjectRepository(AgentFunction)
    private readonly fnRepo: Repository<AgentFunction>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectQueue(SCHEDULE_QUEUE)
    private readonly scheduleQueue: Queue,
  ) {}

  async findAll(agentId: string, tenantId: string | null) {
    return this.scheduleRepo.find({
      where: { agentId, ...(tenantId ? { tenantId } : {}) },
      relations: ['function', 'contactList', 'smtpConfig', 'whatsappConfig', 'telegramConfig'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(agentId: string, scheduleId: string, tenantId: string | null) {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId, agentId, ...(tenantId ? { tenantId } : {}) },
      relations: ['function', 'contactList', 'smtpConfig', 'whatsappConfig', 'telegramConfig'],
    });
    if (!schedule) throw new NotFoundException('Schedule no encontrado');
    return schedule;
  }

  async create(agentId: string, tenantId: string | null, dto: CreateScheduleDto) {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const fn = await this.fnRepo.findOne({
      where: { id: dto.functionId, agentId },
    });
    if (!fn) {
      throw new BadRequestException(
        'La función no pertenece a este agente o no existe',
      );
    }

    const cronExpression = buildCronExpression(
      dto.recurrenceType,
      dto.recurrenceConfig,
    );

    const schedule = this.scheduleRepo.create({
      agentId,
      tenantId: tenantId ?? agent.tenantId ?? agentId,
      name: dto.name,
      description: dto.description ?? null,
      functionId: dto.functionId,
      staticParams: dto.staticParams ?? {},
      processingPrompt: dto.processingPrompt ?? null,
      recurrenceType: dto.recurrenceType,
      recurrenceConfig: dto.recurrenceConfig,
      cronExpression,
      deliveryType: dto.deliveryType ?? 'none',
      contactListId: dto.contactListId ?? null,
      smtpConfigId: dto.smtpConfigId ?? null,
      whatsappConfigId: dto.whatsappConfigId ?? null,
      telegramConfigId: dto.telegramConfigId ?? null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.scheduleRepo.save(schedule);

    if (saved.isActive) {
      await this.registerBullJob(saved);
    }

    return this.findOne(agentId, saved.id, tenantId);
  }

  async update(
    agentId: string,
    scheduleId: string,
    tenantId: string | null,
    dto: UpdateScheduleDto,
  ) {
    const schedule = await this.findOne(agentId, scheduleId, tenantId);

    if (dto.functionId && dto.functionId !== schedule.functionId) {
      const fn = await this.fnRepo.findOne({
        where: { id: dto.functionId, agentId },
      });
      if (!fn) {
        throw new BadRequestException(
          'La función no pertenece a este agente o no existe',
        );
      }
    }

    const recurrenceType = dto.recurrenceType ?? schedule.recurrenceType;
    const recurrenceConfig = dto.recurrenceConfig ?? schedule.recurrenceConfig;
    const cronExpression = buildCronExpression(recurrenceType, recurrenceConfig);

    Object.assign(schedule, {
      ...dto,
      cronExpression,
      recurrenceType,
      recurrenceConfig,
    });

    await this.removeBullJob(schedule);
    const saved = await this.scheduleRepo.save(schedule);

    if (saved.isActive) {
      await this.registerBullJob(saved);
    }

    return this.findOne(agentId, saved.id, tenantId);
  }

  async remove(agentId: string, scheduleId: string, tenantId: string | null) {
    const schedule = await this.findOne(agentId, scheduleId, tenantId);
    await this.removeBullJob(schedule);
    await this.scheduleRepo.remove(schedule);
    return true;
  }

  async toggle(agentId: string, scheduleId: string, tenantId: string | null) {
    const schedule = await this.findOne(agentId, scheduleId, tenantId);
    schedule.isActive = !schedule.isActive;

    if (schedule.isActive) {
      await this.registerBullJob(schedule);
    } else {
      await this.removeBullJob(schedule);
    }

    return this.scheduleRepo.save(schedule);
  }

  async getExecutions(agentId: string, scheduleId: string, tenantId: string | null) {
    await this.findOne(agentId, scheduleId, tenantId);
    return this.executionRepo.find({
      where: { scheduleId },
      order: { executedAt: 'DESC' },
      take: 50,
    });
  }

  /** Re-registers all active schedules on application startup */
  async syncAllJobs() {
    const schedules = await this.scheduleRepo.find({
      where: { isActive: true },
    });
    this.logger.log(`Syncing ${schedules.length} active schedule(s) to Bull`);
    for (const s of schedules) {
      await this.registerBullJob(s);
    }
  }

  private async registerBullJob(schedule: AgentSchedule) {
    const jobId = `schedule-${schedule.id}`;

    try {
      const existing = await this.scheduleQueue.getJob(jobId);
      if (existing) await existing.remove();
    } catch { /* job doesn't exist */ }

    if (schedule.recurrenceType === 'once') {
      const delay = computeDelay(schedule.recurrenceConfig);
      const job = await this.scheduleQueue.add(
        'execute',
        { scheduleId: schedule.id },
        { jobId, delay, removeOnComplete: true },
      );
      schedule.bullJobId = job.id as string;
    } else if (schedule.cronExpression) {
      const job = await this.scheduleQueue.add(
        'execute',
        { scheduleId: schedule.id },
        { jobId, repeat: { cron: schedule.cronExpression }, removeOnComplete: 100 },
      );
      schedule.bullJobId = job.id as string;
    }

    await this.scheduleRepo.update(schedule.id, {
      bullJobId: schedule.bullJobId,
    });

    this.logger.log(
      `Bull job registered: ${jobId} (cron: ${schedule.cronExpression ?? 'once'})`,
    );
  }

  private async removeBullJob(schedule: AgentSchedule) {
    const jobId = `schedule-${schedule.id}`;
    try {
      const existing = await this.scheduleQueue.getJob(jobId);
      if (existing) await existing.remove();

      const repeatable = await this.scheduleQueue.getRepeatableJobs();
      for (const r of repeatable) {
        if (r.id === jobId) {
          await this.scheduleQueue.removeRepeatableByKey(r.key);
        }
      }
    } catch (err) {
      this.logger.warn(`Could not remove Bull job ${jobId}: ${err}`);
    }

    schedule.bullJobId = null;
    await this.scheduleRepo.update(schedule.id, { bullJobId: null });
  }
}
