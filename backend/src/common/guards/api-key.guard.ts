import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import type { JwtUserPayload } from '../decorators/current-user.decorator';

/** Augment Express request to carry the resolved tenant */
declare module 'express' {
  interface Request {
    tenant?: Tenant;
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const rawKey =
      (req.headers['x-api-key'] as string | undefined) ??
      req.headers['authorization']?.replace(/^apikey\s+/i, '');

    if (!rawKey) {
      throw new UnauthorizedException('API key is required (header: x-api-key)');
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // 1) Try legacy tenant-level key
    const tenant = await this.tenantRepo.findOne({
      where: { apiKeyHash: keyHash, isActive: true },
    });

    if (tenant) {
      req.tenant = tenant;
      (req as Request & { user: JwtUserPayload }).user = {
        sub: tenant.id,
        email: '',
        name: tenant.name,
        role: 'api',
        tenantId: tenant.id,
      };
      return true;
    }

    // 2) Try fine-grained api_keys table
    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.isActive = false;
      await this.apiKeyRepo.save(apiKey);
      throw new UnauthorizedException('API key has expired');
    }

    const keyTenant = await this.tenantRepo.findOne({
      where: { id: apiKey.tenantId, isActive: true },
    });

    if (!keyTenant) {
      throw new UnauthorizedException('Tenant not found or inactive');
    }

    apiKey.lastUsedAt = new Date();
    await this.apiKeyRepo.save(apiKey);

    req.tenant = keyTenant;
    (req as Request & { user: JwtUserPayload }).user = {
      sub: keyTenant.id,
      email: '',
      name: `API: ${apiKey.name}`,
      role: 'api',
      tenantId: keyTenant.id,
    };
    return true;
  }
}
