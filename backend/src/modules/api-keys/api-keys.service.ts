import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from '../../database/entities/api-key.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async generate(
    tenantId: string,
    name: string,
    scopes: string[] = ['documents', 'chat'],
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    if (!name?.trim()) {
      throw new BadRequestException('El nombre de la key es obligatorio');
    }

    const rawKey = `tk_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hash(rawKey);
    const prefix = rawKey.slice(0, 11);

    const apiKey = this.repo.create({
      tenantId,
      name: name.trim(),
      keyHash,
      prefix,
      scopes,
    });
    await this.repo.save(apiKey);

    return { apiKey, rawKey };
  }

  async findAllByTenant(tenantId: string): Promise<ApiKey[]> {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, tenantId: string): Promise<void> {
    const key = await this.repo.findOne({
      where: { id, tenantId, isActive: true },
    });
    if (!key) throw new NotFoundException('API Key no encontrada');

    key.isActive = false;
    await this.repo.save(key);
  }

  async validateKey(
    rawKey: string,
  ): Promise<{ tenantId: string; scopes: string[] } | null> {
    const keyHash = this.hash(rawKey);
    const key = await this.repo.findOne({
      where: { keyHash, isActive: true },
    });
    if (!key) return null;

    if (key.expiresAt && key.expiresAt < new Date()) {
      key.isActive = false;
      await this.repo.save(key);
      return null;
    }

    key.lastUsedAt = new Date();
    await this.repo.save(key);

    return { tenantId: key.tenantId, scopes: key.scopes };
  }
}
