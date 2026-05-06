import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { IngestModule } from './modules/ingest/ingest.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BillingModule } from './modules/billing/billing.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AuthModule } from './modules/auth/auth.module';
import { Tenant } from './database/entities/tenant.entity';
import { Document } from './database/entities/document.entity';
import { DocumentChunk } from './database/entities/document-chunk.entity';
import { TokenUsage } from './database/entities/token-usage.entity';
import { ProviderPricing } from './database/entities/provider-pricing.entity';
import { User } from './database/entities/user.entity';
import { Agent } from './database/entities/agent.entity';
import { LlmProviderConfig } from './database/entities/llm-provider-config.entity';
import { Role } from './database/entities/role.entity';
import { LlmConfigModule } from './modules/llm-config/llm-config.module';
import { AdminModule } from './modules/admin/admin.module';
import { SkillsModule } from './modules/skills/skills.module';
import { McpModule } from './modules/mcp/mcp.module';
import { LlmModelTemplate } from './database/entities/llm-model-template.entity';
import { Skill } from './database/entities/skill.entity';
import { AgentFunction } from './database/entities/agent-function.entity';
import { McpIntegration } from './database/entities/mcp-integration.entity';
import { AgentDocument } from './database/entities/agent-document.entity';
import { ApiKey } from './database/entities/api-key.entity';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AgentSchedule } from './database/entities/agent-schedule.entity';
import { ScheduleExecution } from './database/entities/schedule-execution.entity';
import { ContactList } from './database/entities/contact-list.entity';
import { ContactEntry } from './database/entities/contact-entry.entity';
import { SmtpConfig } from './database/entities/smtp-config.entity';
import { WhatsappConfig } from './database/entities/whatsapp-config.entity';
import { WhatsappChannel } from './database/entities/whatsapp-channel.entity';
import { WhatsappConversation } from './database/entities/whatsapp-conversation.entity';
import { TelegramConfig } from './database/entities/telegram-config.entity';
import { TelegramChannel } from './database/entities/telegram-channel.entity';
import { TelegramConversation } from './database/entities/telegram-conversation.entity';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'cronotix'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB', 'cronotix'),
        entities: [
          Tenant,
          Document,
          DocumentChunk,
          TokenUsage,
          ProviderPricing,
          User,
          Agent,
          Skill,
          LlmProviderConfig,
          LlmModelTemplate,
          Role,
          AgentFunction,
          McpIntegration,
          AgentDocument,
          ApiKey,
          AgentSchedule,
          ScheduleExecution,
          ContactList,
          ContactEntry,
          SmtpConfig,
          WhatsappConfig,
          WhatsappChannel,
          WhatsappConversation,
          TelegramConfig,
          TelegramChannel,
          TelegramConversation,
        ],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisPassword = config.get<string>('REDIS_PASSWORD');
        return {
          redis: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            ...(redisPassword ? { password: redisPassword } : {}),
          },
        };
      },
    }),

    AuthModule,
    IngestModule,
    OcrModule,
    DocumentsModule,
    BillingModule,
    AgentsModule,
    SkillsModule,
    McpModule,
    LlmConfigModule,
    AdminModule,
    ApiKeysModule,
    ContactsModule,
    SettingsModule,
    SchedulesModule,
    WhatsappModule,
    TelegramModule,
  ],
})
export class AppModule {}
