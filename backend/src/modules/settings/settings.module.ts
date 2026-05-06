import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmtpConfig } from '../../database/entities/smtp-config.entity';
import { WhatsappConfig } from '../../database/entities/whatsapp-config.entity';
import { TelegramConfig } from '../../database/entities/telegram-config.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { SmtpConfigService } from './smtp-config.service';
import { SmtpConfigController } from './smtp-config.controller';
import { WhatsappConfigService } from './whatsapp-config.service';
import { WhatsappConfigController } from './whatsapp-config.controller';
import { TelegramConfigService } from './telegram-config.service';
import { TelegramConfigController } from './telegram-config.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmtpConfig, WhatsappConfig, TelegramConfig, Tenant, ApiKey]),
    AuthModule,
  ],
  providers: [SmtpConfigService, WhatsappConfigService, TelegramConfigService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [SmtpConfigController, WhatsappConfigController, TelegramConfigController],
  exports: [SmtpConfigService, WhatsappConfigService, TelegramConfigService],
})
export class SettingsModule {}
