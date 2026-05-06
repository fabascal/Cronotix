import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappChannel } from '../../database/entities/whatsapp-channel.entity';
import { WhatsappConversation } from '../../database/entities/whatsapp-conversation.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { WhatsappChannelService } from './whatsapp-channel.service';
import { WhatsappChannelController } from './whatsapp-channel.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { SettingsModule } from '../settings/settings.module';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappChannel, WhatsappConversation, ContactEntry, Tenant, ApiKey]),
    SettingsModule,
    AgentsModule,
    AuthModule,
  ],
  providers: [WhatsappChannelService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [WhatsappChannelController, WhatsappWebhookController],
  exports: [WhatsappChannelService],
})
export class WhatsappModule {}
