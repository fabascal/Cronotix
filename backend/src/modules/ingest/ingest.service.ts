import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Document } from '../../database/entities/document.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { BillingService } from '../billing/billing.service';
import type { IngestDocumentDto } from './ingest.dto';

export const OCR_QUEUE = 'ocr';

export interface OcrJobData {
  documentId: string;
  tenantId: string;
  documentUrl: string;
  callbackUrl?: string;
}

/** Estimated pages for pre-flight credit check before OCR */
const ESTIMATED_PAGES_FOR_CHECK = 10;
/** Estimated credits per page of OCR processing */
const CREDITS_PER_PAGE_ESTIMATE = 0.5;

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectQueue(OCR_QUEUE)
    private readonly ocrQueue: Queue<OcrJobData>,
    private readonly billingService: BillingService,
  ) {}

  async ingest(tenant: Tenant, dto: IngestDocumentDto): Promise<{ jobId: string; documentId: string }> {
    // ─── 1. Pre-flight credit check (CRITICAL FLOW) ─────────────────────────
    // Must happen BEFORE creating any DB record or consuming resources.
    const estimatedCredits = ESTIMATED_PAGES_FOR_CHECK * CREDITS_PER_PAGE_ESTIMATE;
    await this.billingService.checkCredits(tenant.id, estimatedCredits);

    // ─── 2. Create document record ────────────────────────────────────────────
    const document = this.documentRepo.create({
      tenantId: tenant.id,
      externalId: dto.externalId,
      documentType: dto.documentType ?? 'other',
      status: 'pending',
      webhookPayload: {
        documentUrl: dto.documentUrl,
        callbackUrl: dto.callbackUrl,
        metadata: dto.metadata,
      },
    });
    const saved = await this.documentRepo.save(document);

    // ─── 3. Enqueue OCR job ───────────────────────────────────────────────────
    const job = await this.ocrQueue.add(
      'process',
      {
        documentId: saved.id,
        tenantId: tenant.id,
        documentUrl: dto.documentUrl,
        callbackUrl: dto.callbackUrl,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Document ${saved.id} queued for OCR (job: ${job.id}, tenant: ${tenant.id})`,
    );

    return { jobId: String(job.id), documentId: saved.id };
  }

  async getStatus(documentId: string, tenantId: string) {
    return this.documentRepo.findOne({
      where: { id: documentId, tenantId },
      select: ['id', 'status', 'pageCount', 'documentType', 'createdAt', 'updatedAt'],
    });
  }
}
