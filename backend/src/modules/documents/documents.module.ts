import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { BillingModule } from '../billing/billing.module';
import { DocumentsController } from './documents.controller';
import { DocumentsDashboardController } from './documents-dashboard.controller';
import { DocumentsService, DOCUMENT_AI_QUEUE } from './documents.service';
import { DocumentAiProcessor } from './document-ai.processor';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Document, DocumentChunk, Tenant, ApiKey]),
    BullModule.registerQueue({ name: DOCUMENT_AI_QUEUE }),
    BillingModule,
    AuthModule,
  ],
  controllers: [DocumentsController, DocumentsDashboardController],
  providers: [DocumentsService, DocumentAiProcessor, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
