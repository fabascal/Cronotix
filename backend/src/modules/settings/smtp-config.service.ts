import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SmtpConfig } from '../../database/entities/smtp-config.entity';
import { encryptSecret, decryptSecret } from '../../common/crypto/aes-gcm';

@Injectable()
export class SmtpConfigService {
  constructor(
    @InjectRepository(SmtpConfig)
    private readonly repo: Repository<SmtpConfig>,
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
    if (!config) throw new NotFoundException('Configuración SMTP no encontrada');
    return config;
  }

  async create(tenantId: string | null, dto: {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    fromAddress: string;
    isDefault?: boolean;
  }) {
    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    const config = this.repo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      host: dto.host,
      port: dto.port,
      username: dto.username,
      password: encryptSecret(dto.password),
      fromAddress: dto.fromAddress,
      isDefault: dto.isDefault ?? false,
    });

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async update(id: string, tenantId: string | null, dto: {
    name?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    fromAddress?: string;
    isDefault?: boolean;
  }) {
    const config = await this.findOne(id, tenantId);

    if (dto.isDefault && tenantId) {
      await this.repo.update({ tenantId, isDefault: true }, { isDefault: false });
    }

    if (dto.name !== undefined) config.name = dto.name;
    if (dto.host !== undefined) config.host = dto.host;
    if (dto.port !== undefined) config.port = dto.port;
    if (dto.username !== undefined) config.username = dto.username;
    if (dto.password) config.password = encryptSecret(dto.password);
    if (dto.fromAddress !== undefined) config.fromAddress = dto.fromAddress;
    if (dto.isDefault !== undefined) config.isDefault = dto.isDefault;

    const saved = await this.repo.save(config);
    return this.sanitize(saved);
  }

  async remove(id: string, tenantId: string | null) {
    const config = await this.findOne(id, tenantId);
    await this.repo.remove(config);
    return true;
  }

  async testConnection(id: string, tenantId: string | null) {
    const config = await this.findOne(id, tenantId);
    const password = decryptSecret(config.password);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.username, pass: password },
    });

    await transporter.verify();
    return { success: true, message: 'Conexión SMTP verificada correctamente' };
  }

  async testSend(id: string, tenantId: string | null, to: string) {
    const config = await this.findOne(id, tenantId);
    const password = decryptSecret(config.password);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.username, pass: password },
    });

    await transporter.sendMail({
      from: config.fromAddress,
      to,
      subject: 'Cronotix — Correo de prueba',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="background: #1a1a2e; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #c9a84c; margin: 0; font-size: 18px;">Cronotix</h1>
          </div>
          <div style="border: 1px solid #e2e8f0; border-top: 0; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 8px; font-size: 15px; color: #1a1a2e;">Tu integración de email funciona correctamente.</p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">Cuenta: ${config.username}</p>
          </div>
        </div>
      `,
    });

    return { success: true, message: `Correo de prueba enviado a ${to}` };
  }

  /** Returns decrypted SMTP config for use by DeliveryService */
  async getDecryptedConfig(id: string): Promise<{
    host: string;
    port: number;
    username: string;
    password: string;
    fromAddress: string;
  }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Configuración SMTP no encontrada');
    return {
      host: config.host,
      port: config.port,
      username: config.username,
      password: decryptSecret(config.password),
      fromAddress: config.fromAddress,
    };
  }

  private sanitize(config: SmtpConfig) {
    const { password: _, ...rest } = config;
    return { ...rest, hasPassword: true };
  }
}
