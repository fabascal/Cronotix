import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig } from '../../database/entities/telegram-config.entity';
import { encryptSecret, decryptSecret } from '../../common/crypto/aes-gcm';

@Injectable()
export class TelegramConfigService {
  private readonly logger = new Logger(TelegramConfigService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly repo: Repository<TelegramConfig>,
  ) {}

  async findAll(tenantId: string | null) {
    const configs = await this.repo.find({
      where: tenantId ? { tenantId } : {},
      order: { createdAt: 'DESC' },
    });
    return configs.map((c) => this.sanitize(c));
  }

  async findOne(id: string, tenantId: string | null) {
    const config = await this.repo.findOne({
      where: tenantId ? { id, tenantId } : { id },
    });
    if (!config) throw new NotFoundException('Configuración Telegram no encontrada');
    return config;
  }

  async create(tenantId: string | null, dto: {
    name: string;
    botToken: string;
    isDefault?: boolean;
  }) {
    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    const botUsername = await this.fetchBotUsername(dto.botToken).catch(() => null);

    const config = this.repo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      botToken: encryptSecret(dto.botToken),
      botUsername,
      isDefault: dto.isDefault ?? false,
    });

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async update(id: string, tenantId: string | null, dto: {
    name?: string;
    botToken?: string;
    isDefault?: boolean;
  }) {
    const config = await this.findOne(id, tenantId);

    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    if (dto.name !== undefined) config.name = dto.name;
    if (dto.botToken) {
      config.botToken = encryptSecret(dto.botToken);
      config.botUsername = await this.fetchBotUsername(dto.botToken).catch(() => null);
    }
    if (dto.isDefault !== undefined) config.isDefault = dto.isDefault;

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async remove(id: string, tenantId: string | null) {
    const config = await this.findOne(id, tenantId);
    await this.repo.remove(config);
    return true;
  }

  async testSend(id: string, tenantId: string | null, chatId: string) {
    if (!chatId.trim()) throw new BadRequestException('Chat ID inválido');
    const config = await this.findOne(id, tenantId);
    const token = decryptSecret(config.botToken);
    await this.sendMessage(token, chatId.trim(), 'Cronotix — Mensaje de prueba. Tu integración de Telegram funciona correctamente. 🤖');
    return { success: true, message: `Mensaje de prueba enviado al chat ${chatId.trim()}` };
  }

  /** Returns decrypted config for internal use by channel service */
  async getDecryptedConfig(id: string): Promise<{ botToken: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Configuración Telegram no encontrada');
    return { botToken: decryptSecret(config.botToken) };
  }

  /** Send a text message via Telegram Bot API */
  async sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096),
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Telegram API error ${res.status}: ${errText.slice(0, 500)}`);
      throw new BadRequestException(`Telegram API ${res.status}: ${errText.slice(0, 300)}`);
    }
  }

  /** Fetch bot username via getMe */
  private async fetchBotUsername(botToken: string): Promise<string | null> {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; result?: { username?: string } };
    return data?.result?.username ? `@${data.result.username}` : null;
  }

  private sanitize(config: TelegramConfig) {
    const { botToken: _, ...rest } = config;
    return { ...rest, hasToken: true };
  }
}
