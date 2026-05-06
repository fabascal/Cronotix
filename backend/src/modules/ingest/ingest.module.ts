import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Document } from '../../database/entities/document.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { BillingModule } from '../billing/billing.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { OCR_QUEUE } from './ingest.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Tenant, ApiKey]),
    BullModule.registerQueue({ name: OCR_QUEUE }),
    BillingModule,
  ],
  controllers: [IngestController],
  providers: [IngestService, ApiKeyGuard],
  exports: [IngestService],
})
export class IngestModule {}
