import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelegramChannelService } from './telegram-channel.service';

interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: {
      id?: number;
      is_bot?: boolean;
      username?: string;
      first_name?: string;
    };
    chat?: { id?: number };
    text?: string;
  };
}

@ApiTags('Telegram Webhook')
@Controller('v1/webhook/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private readonly channelService: TelegramChannelService) {}

  @Post(':channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción de updates de Telegram' })
  async receive(
    @Param('channelId') channelId: string,
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string | undefined,
    @Body() body: TelegramUpdate,
  ) {
    try {
      const channel = await this.channelService.findOneById(channelId);

      if (!channel || !channel.isActive) {
        return { ok: true };
      }

      // Validate secret token
      if (channel.secretToken && secretHeader !== channel.secretToken) {
        this.logger.warn(`Invalid secret token for channel ${channelId}`);
        return { ok: true };
      }

      const msg = body?.message;
      if (!msg || msg.from?.is_bot || !msg.text || !msg.from?.id) {
        return { ok: true };
      }

      const chatId = String(msg.chat?.id ?? msg.from.id);
      const username = msg.from.username;
      const text = msg.text;

      // Process asynchronously — respond 200 immediately
      this.channelService
        .handleInbound(channelId, chatId, username, text)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error handling Telegram inbound: ${message}`);
        });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error parsing Telegram webhook body: ${message}`);
    }

    return { ok: true };
  }
}
