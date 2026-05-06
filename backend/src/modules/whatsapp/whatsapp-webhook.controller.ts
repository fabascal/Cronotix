import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsappChannelService } from './whatsapp-channel.service';

interface MetaWebhookBody {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

@ApiTags('WhatsApp Webhook')
@Controller('v1/webhook/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly channelService: WhatsappChannelService) {}

  /**
   * Meta webhook verification — GET request with hub.* query params.
   * Must respond with hub.challenge as plain text if hub.verify_token matches.
   */
  @Get(':channelId')
  @ApiOperation({ summary: 'Verificación de webhook Meta WhatsApp' })
  async verify(
    @Param('channelId') channelId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const channel = await this.channelService.findOneById(channelId);

    if (!channel || mode !== 'subscribe' || channel.verifyToken !== verifyToken) {
      this.logger.warn(`Webhook verification failed for channel ${channelId}`);
      return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
    }

    this.logger.log(`Webhook verified for channel ${channelId}`);
    return res.status(HttpStatus.OK).send(challenge);
  }

  /**
   * Inbound WhatsApp messages from Meta.
   * Always responds 200 immediately; processing is async.
   */
  @Post(':channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción de mensajes WhatsApp entrantes' })
  async receive(
    @Param('channelId') channelId: string,
    @Body() body: MetaWebhookBody,
  ) {
    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const messages = change?.value?.messages;

      if (!messages || messages.length === 0) {
        return { status: 'ok' };
      }

      for (const msg of messages) {
        if (msg.type !== 'text' || !msg.from || !msg.text?.body) continue;
        // Process asynchronously — do not await so Meta gets 200 immediately
        this.channelService
          .handleInbound(channelId, msg.from, msg.text.body)
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error handling inbound message: ${message}`);
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error parsing webhook body: ${message}`);
    }

    return { status: 'ok' };
  }
}
