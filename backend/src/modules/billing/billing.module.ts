import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { TokenUsage } from '../../database/entities/token-usage.entity';
import { ProviderPricing } from '../../database/entities/provider-pricing.entity';
import { BillingService } from './billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TokenUsage, ProviderPricing])],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
