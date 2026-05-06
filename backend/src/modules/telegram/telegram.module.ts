import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramChannel } from '../../database/entities/telegram-channel.entity';
import { TelegramConversation } from '../../database/entities/telegram-conversation.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramChannelController } from './telegram-channel.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { SettingsModule } from '../settings/settings.module';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramChannel, TelegramConversation, Tenant, ApiKey]),
    SettingsModule,
    AgentsModule,
    AuthModule,
  ],
  providers: [TelegramChannelService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [TelegramChannelController, TelegramWebhookController],
  exports: [TelegramChannelService],
})
export class TelegramModule {}
