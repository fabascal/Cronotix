import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AgentSchedule } from '../../database/entities/agent-schedule.entity';
import { ScheduleExecution } from '../../database/entities/schedule-execution.entity';
import { AgentFunction } from '../../database/entities/agent-function.entity';
import { Agent } from '../../database/entities/agent.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { SchedulesService, SCHEDULE_QUEUE } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { ScheduleProcessor } from './schedule.processor';
import { DeliveryService } from './delivery.service';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { AgentsModule } from '../agents/agents.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentSchedule,
      ScheduleExecution,
      AgentFunction,
      Agent,
      ContactEntry,
      Tenant,
      ApiKey,
    ]),
    BullModule.registerQueue({ name: SCHEDULE_QUEUE }),
    AuthModule,
    SettingsModule,
    AgentsModule,
  ],
  providers: [SchedulesService, ScheduleProcessor, DeliveryService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [SchedulesController],
  exports: [SchedulesService],
})
export class SchedulesModule implements OnModuleInit {
  constructor(private readonly schedulesService: SchedulesService) {}

  async onModuleInit() {
    await this.schedulesService.syncAllJobs();
  }
}
