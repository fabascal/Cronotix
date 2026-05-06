import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { BillingService } from '../billing/billing.service';

/**
 * AgentsService — Fase 1 stub.
 *
 * Will be implemented with:
 * - LangChain ChatOpenAI / ChatGoogleGenerativeAI
 * - LangGraph for multi-step agent orchestration
 * - Redis cache (TTL 24h) to avoid reprocessing identical documents
 * - pgvector embeddings for semantic search
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly billingService: BillingService,
  ) {}

  async summarize(_documentId: string, _tenantId: string): Promise<string> {
    // TODO (Fase 1): Implement with LangChain LLM Router
    // 1. billingService.checkCredits(tenantId, estimatedTokens)
    // 2. Check Redis cache for existing summary
    // 3. Call LLM (GPT-4o or Gemini via router)
    // 4. billingService.deductCredits(...)
    // 5. Store in documents.summary
    throw new NotImplementedException('Summarization coming in Fase 1');
  }

  async extractFields(_documentId: string, _tenantId: string): Promise<Record<string, unknown>> {
    // TODO (Fase 1): Implement extract_fields Skill
    throw new NotImplementedException('Field extraction coming in Fase 2');
  }
}
