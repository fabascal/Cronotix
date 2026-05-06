import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Tenant } from '../../database/entities/tenant.entity';

/** Extracts the resolved tenant from request (set by ApiKeyGuard) */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Tenant => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenant!;
  },
);
