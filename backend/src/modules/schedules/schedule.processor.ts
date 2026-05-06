import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { AgentSchedule } from '../../database/entities/agent-schedule.entity';
import { AgentFunction } from '../../database/entities/agent-function.entity';
import { ScheduleExecution } from '../../database/entities/schedule-execution.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { DeliveryService } from './delivery.service';
import { SCHEDULE_QUEUE } from './schedules.service';
import { AgentsCrudService } from '../agents/agents-crud.service';

interface ScheduleJobData {
  scheduleId: string;
}

@Injectable()
@Processor(SCHEDULE_QUEUE)
export class ScheduleProcessor {
  private readonly logger = new Logger(ScheduleProcessor.name);

  constructor(
    @InjectRepository(AgentSchedule)
    private readonly scheduleRepo: Repository<AgentSchedule>,
    @InjectRepository(AgentFunction)
    private readonly fnRepo: Repository<AgentFunction>,
    @InjectRepository(ScheduleExecution)
    private readonly executionRepo: Repository<ScheduleExecution>,
    @InjectRepository(ContactEntry)
    private readonly entryRepo: Repository<ContactEntry>,
    private readonly deliveryService: DeliveryService,
    private readonly agentsCrudService: AgentsCrudService,
  ) {}

  @Process('execute')
  async handleExecution(job: Job<ScheduleJobData>): Promise<void> {
    const { scheduleId } = job.data;
    this.logger.log(`Executing schedule ${scheduleId}`);

    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['function'],
    });

    if (!schedule || !schedule.isActive) {
      this.logger.warn(`Schedule ${scheduleId} not found or inactive — skipping`);
      return;
    }

    const execution = this.executionRepo.create({
      scheduleId,
      status: 'pending',
      deliveryStatus: 'skipped',
    });
    await this.executionRepo.save(execution);

    try {
      const fn = schedule.function ?? (
        schedule.functionId
          ? await this.fnRepo.findOne({ where: { id: schedule.functionId } })
          : null
      );

      if (!fn) {
        throw new Error(`Function ${schedule.functionId} not found`);
      }

      const params = { ...schedule.staticParams };
      execution.functionRequest = params;

      const response = await this.callWebhook(fn, params);
      execution.functionResponse = response;
      execution.status = 'success';

      let deliveryPayload: string | Record<string, unknown> = response;
      const prompt = schedule.processingPrompt?.trim();
      if (prompt) {
        const userMessage = `${prompt}\n\nDatos:\n${JSON.stringify(response, null, 2)}`;
        deliveryPayload = await this.agentsCrudService.processWithLlm(
          schedule.agentId,
          schedule.tenantId,
          userMessage,
        );
      }

      if (schedule.deliveryType !== 'none' && schedule.contactListId) {
        try {
          await this.deliver(schedule, deliveryPayload);
          execution.deliveryStatus = 'sent';
        } catch (deliveryErr) {
          execution.deliveryStatus = 'failed';
          const msg = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr);
          execution.errorMessage = `Delivery failed: ${msg}`;
          this.logger.error(`Delivery failed for schedule ${scheduleId}: ${msg}`);
        }
      }
    } catch (err) {
      execution.status = 'failed';
      execution.errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Schedule ${scheduleId} execution failed: ${execution.errorMessage}`,
      );
    }

    await this.executionRepo.save(execution);

    await this.scheduleRepo.update(scheduleId, {
      lastRunAt: new Date(),
    });

    if (schedule.recurrenceType === 'once') {
      await this.scheduleRepo.update(scheduleId, { isActive: false });
    }
  }

  private async callWebhook(
    fn: AgentFunction,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const method = (fn.webhookMethod ?? 'POST').toUpperCase();
    const isGet = method === 'GET';

    // Replace {{key}} path-param placeholders; remaining params go to query/body
    const usedKeys = new Set<string>();
    let url = fn.webhookUrl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (key in params) {
        usedKeys.add(key);
        return encodeURIComponent(String(params[key]));
      }
      return `{{${key}}}`;
    });

    const remainingParams = Object.fromEntries(
      Object.entries(params).filter(([k]) => !usedKeys.has(k)),
    );

    if (isGet && Object.keys(remainingParams).length) {
      const qs = new URLSearchParams(
        Object.entries(remainingParams).map(([k, v]) => [k, String(v)]),
      ).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fn.timeoutMs ?? 10000);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(!isGet && Object.keys(remainingParams).length ? { body: JSON.stringify(remainingParams) } : {}),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
      }

      return typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : { result: data };
    } finally {
      clearTimeout(timer);
    }
  }

  private async deliver(
    schedule: AgentSchedule,
    result: string | Record<string, unknown>,
  ): Promise<void> {
    const entries = await this.entryRepo.find({
      where: { listId: schedule.contactListId! },
    });

    if (entries.length === 0) {
      this.logger.warn(`No entries in contact list ${schedule.contactListId}`);
      return;
    }

    const subject = `Schedule: ${schedule.name}`;

    switch (schedule.deliveryType) {
      case 'email':
        if (!schedule.smtpConfigId) {
          throw new Error('No SMTP config assigned to this schedule');
        }
        await this.deliveryService.sendEmail(schedule.smtpConfigId, entries, subject, result);
        break;
      case 'whatsapp':
        if (!schedule.whatsappConfigId) {
          throw new Error('No WhatsApp config assigned to this schedule');
        }
        await this.deliveryService.sendWhatsapp(schedule.whatsappConfigId, entries, subject, result);
        break;
      case 'telegram':
        if (!schedule.telegramConfigId) {
          throw new Error('No Telegram config assigned to this schedule');
        }
        await this.deliveryService.sendTelegram(schedule.telegramConfigId, entries, subject, result);
        break;
      default:
        break;
    }
  }
}
