import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Document } from '../../database/entities/document.entity';
import { BillingModule } from '../billing/billing.module';
import { OcrProcessor } from './ocr.processor';
import { OCR_QUEUE } from '../ingest/ingest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    BullModule.registerQueue({ name: OCR_QUEUE }),
    BillingModule,
  ],
  providers: [OcrProcessor],
})
export class OcrModule {}
