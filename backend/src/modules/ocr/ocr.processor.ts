import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { Document } from '../../database/entities/document.entity';
import { BillingService } from '../billing/billing.service';
import { OCR_QUEUE, OcrJobData } from '../ingest/ingest.service';

/** Google Document AI provider identifier — matches provider_pricing table */
const GOOGLE_DOC_AI_PROVIDER = 'google_doc_ai';
const GOOGLE_DOC_AI_MODEL = 'document-ai-ocr';

@Injectable()
@Processor(OCR_QUEUE)
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly billingService: BillingService,
  ) {}

  @Process('process')
  async handleOcr(job: Job<OcrJobData>): Promise<void> {
    const { documentId, tenantId, documentUrl } = job.data;

    this.logger.log(`Starting OCR for document ${documentId} (tenant: ${tenantId})`);

    // Mark as processing
    await this.documentRepo.update(documentId, { status: 'ocr_processing' });

    try {
      // ── Google Document AI integration point ────────────────────────────────
      // TODO (Fase 0): Replace this stub with actual Google Document AI client:
      //
      //   const client = new DocumentProcessorServiceClient();
      //   const [result] = await client.processDocument({
      //     name: `projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}`,
      //     rawDocument: { content: pdfBuffer, mimeType: 'application/pdf' },
      //   });
      //   const pages = result.document?.pages ?? [];
      //
      // For now: simulate OCR output with a placeholder per page.
      const simulatedPagesText = await this.simulateOcrExtraction(documentUrl);
      const pageCount = Object.keys(simulatedPagesText).length;

      // ── Save extracted text ─────────────────────────────────────────────────
      // Original PDF is NOT stored — only text per page (per CONTEXT.md).
      await this.documentRepo.update(documentId, {
        pagesText: simulatedPagesText,
        pageCount,
        status: 'ai_processing',
      });

      // ── Deduct credits for OCR operation ────────────────────────────────────
      // Tokens here represent "character units" normalised for billing purposes.
      const promptTokens = pageCount * 500; // ~500 tokens per page estimate
      await this.billingService.deductCredits({
        tenantId,
        documentId,
        provider: GOOGLE_DOC_AI_PROVIDER,
        modelId: GOOGLE_DOC_AI_MODEL,
        operationType: 'ocr',
        promptTokens,
        completionTokens: 0,
      });

      // ── Mark as done ─────────────────────────────────────────────────────────
      await this.documentRepo.update(documentId, { status: 'done' });

      this.logger.log(
        `OCR completed for document ${documentId}: ${pageCount} pages extracted`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR failed for document ${documentId}: ${message}`);

      await this.documentRepo.update(documentId, {
        status: 'error',
        errorMessage: message,
      });

      throw error; // re-throw so BullMQ retries (up to attempts limit)
    }
  }

  /**
   * Stub: simulates OCR page extraction.
   * Replace with actual Google Document AI call in production.
   */
  private async simulateOcrExtraction(
    documentUrl: string,
  ): Promise<Record<string, string>> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      '1': `[OCR STUB] Content extracted from page 1 of document at: ${documentUrl}`,
      '2': '[OCR STUB] Content extracted from page 2. Replace this with Google Document AI integration.',
      '3': '[OCR STUB] Content extracted from page 3.',
    };
  }
}
