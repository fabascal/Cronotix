import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappConfig } from '../../database/entities/whatsapp-config.entity';
import { encryptSecret, decryptSecret } from '../../common/crypto/aes-gcm';

@Injectable()
export class WhatsappConfigService {
  private readonly logger = new Logger(WhatsappConfigService.name);

  constructor(
    @InjectRepository(WhatsappConfig)
    private readonly repo: Repository<WhatsappConfig>,
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
    if (!config) throw new NotFoundException('Configuración WhatsApp no encontrada');
    return config;
  }

  async create(tenantId: string | null, dto: {
    name: string;
    phoneNumberId: string;
    accessToken: string;
    isDefault?: boolean;
  }) {
    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    const config = this.repo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      phoneNumberId: dto.phoneNumberId,
      accessToken: encryptSecret(dto.accessToken),
      isDefault: dto.isDefault ?? false,
    });

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async update(id: string, tenantId: string | null, dto: {
    name?: string;
    phoneNumberId?: string;
    accessToken?: string;
    isDefault?: boolean;
  }) {
    const config = await this.findOne(id, tenantId);

    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    if (dto.name !== undefined) config.name = dto.name;
    if (dto.phoneNumberId !== undefined) config.phoneNumberId = dto.phoneNumberId;
    if (dto.accessToken) config.accessToken = encryptSecret(dto.accessToken);
    if (dto.isDefault !== undefined) config.isDefault = dto.isDefault;

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async remove(id: string, tenantId: string | null) {
    const config = await this.findOne(id, tenantId);
    await this.repo.remove(config);
    return true;
  }

  async testSend(id: string, tenantId: string | null, to: string) {
    const normalizedTo = to.replace(/\D/g, '');
    if (!normalizedTo) throw new BadRequestException('Número de teléfono inválido');
    const config = await this.findOne(id, tenantId);
    const token = decryptSecret(config.accessToken);
    const url = `https://graph.facebook.com/v25.0/${config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' },
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`WhatsApp test-send error ${res.status}: ${errText.slice(0, 500)}`);
      throw new BadRequestException(`WhatsApp API ${res.status}: ${errText.slice(0, 300)}`);
    }
    return { success: true, message: `Mensaje de prueba enviado a ${normalizedTo}` };
  }

  /** Returns decrypted WhatsApp config for use by DeliveryService */
  async getDecryptedConfig(id: string): Promise<{
    phoneNumberId: string;
    accessToken: string;
  }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Configuración WhatsApp no encontrada');
    return {
      phoneNumberId: config.phoneNumberId,
      accessToken: decryptSecret(config.accessToken),
    };
  }

  /** Send a text message via Meta Cloud API */
  async sendMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<void> {
    const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text.slice(0, 4096) },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`WhatsApp API error ${res.status}: ${errText.slice(0, 500)}`);
      throw new BadRequestException(`WhatsApp API ${res.status}: ${errText.slice(0, 300)}`);
    }
  }

  private sanitize(config: WhatsappConfig) {
    const { accessToken: _, ...rest } = config;
    return { ...rest, hasToken: true };
  }
}
