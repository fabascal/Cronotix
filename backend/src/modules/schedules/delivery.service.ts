import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { ContactEntry } from '../../database/entities/contact-entry.entity';
import { SmtpConfigService } from '../settings/smtp-config.service';
import { WhatsappConfigService } from '../settings/whatsapp-config.service';
import { TelegramConfigService } from '../settings/telegram-config.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly transporterCache = new Map<string, Transporter>();

  constructor(
    private readonly smtpConfigService: SmtpConfigService,
    private readonly whatsappConfigService: WhatsappConfigService,
    private readonly telegramConfigService: TelegramConfigService,
  ) {}

  async sendEmail(
    smtpConfigId: string,
    recipients: ContactEntry[],
    subject: string,
    body: string | Record<string, unknown>,
  ): Promise<void> {
    const transporter = await this.getTransporter(smtpConfigId);
    if (!transporter) {
      this.logger.warn('SMTP not configured — skipping email delivery');
      return;
    }

    const emailRecipients = recipients.filter((r) => r.email);
    if (emailRecipients.length === 0) return;

    const config = await this.smtpConfigService.getDecryptedConfig(smtpConfigId);
    const htmlBody = this.buildHtmlBody(subject, body);

    for (const recipient of emailRecipients) {
      try {
        await transporter.sendMail({
          from: config.fromAddress,
          to: recipient.email!,
          subject,
          html: htmlBody,
        });
        this.logger.log(`Email sent to ${recipient.email}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send email to ${recipient.email}: ${msg}`);
        throw err;
      }
    }
  }

  async sendWhatsapp(
    whatsappConfigId: string,
    recipients: ContactEntry[],
    _subject: string,
    body: string | Record<string, unknown>,
  ): Promise<void> {
    const cfg = await this.whatsappConfigService.getDecryptedConfig(whatsappConfigId);
    const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    const phoneRecipients = recipients.filter((r) => r.phone);

    if (phoneRecipients.length === 0) {
      this.logger.warn('No recipients with phone number — skipping WhatsApp delivery');
      return;
    }

    for (const r of phoneRecipients) {
      try {
        await this.whatsappConfigService.sendMessage(
          cfg.phoneNumberId,
          cfg.accessToken,
          r.phone!,
          text,
        );
        this.logger.log(`WhatsApp message sent to ${r.phone}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send WhatsApp to ${r.phone}: ${msg}`);
        throw err;
      }
    }
  }

  async sendTelegram(
    telegramConfigId: string,
    recipients: ContactEntry[],
    _subject: string,
    body: string | Record<string, unknown>,
  ): Promise<void> {
    const { botToken } = await this.telegramConfigService.getDecryptedConfig(telegramConfigId);
    const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    const tgRecipients = recipients.filter((r) => r.telegramId);

    if (tgRecipients.length === 0) {
      this.logger.warn('No recipients with Telegram ID — skipping Telegram delivery');
      return;
    }

    for (const r of tgRecipients) {
      try {
        await this.telegramConfigService.sendMessage(botToken, r.telegramId!, text);
        this.logger.log(`Telegram message sent to ${r.telegramId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send Telegram to ${r.telegramId}: ${msg}`);
        throw err;
      }
    }
  }

  private async getTransporter(smtpConfigId: string): Promise<Transporter | null> {
    if (this.transporterCache.has(smtpConfigId)) {
      return this.transporterCache.get(smtpConfigId)!;
    }

    try {
      const config = await this.smtpConfigService.getDecryptedConfig(smtpConfigId);
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.username, pass: config.password },
      });
      this.transporterCache.set(smtpConfigId, transporter);
      return transporter;
    } catch {
      return null;
    }
  }

  private buildHtmlBody(subject: string, body: string | Record<string, unknown>): string {
    const raw =
      typeof body === 'string'
        ? body
        : JSON.stringify(body, null, 2);
    const content = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const inner =
      typeof body === 'string'
        ? `<p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</p>`
        : `<pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; overflow-x: auto; white-space: pre-wrap;">${content}</pre>`;
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a2e;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #1a1a2e; padding: 20px 24px;">
            <h1 style="color: #c9a84c; margin: 0; font-size: 18px;">Cronotix — Schedule Result</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="font-size: 16px; margin-top: 0;">${subject}</h2>
            ${inner}
          </div>
          <div style="background: #f8fafc; padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
            Enviado automáticamente por Cronotix
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
