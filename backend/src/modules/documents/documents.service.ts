import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Document } from '../../database/entities/document.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { BillingService } from '../billing/billing.service';
import type { UploadDocumentDto } from './documents.dto';

export const DOCUMENT_AI_QUEUE = 'document-ai';

/** Datos del job enviado a BullMQ para procesar un PDF con Document AI. */
export interface DocumentAiJobData {
  documentId: string;
  tenantId: string;
  /** PDF encoded as base64 (BullMQ solo serializa JSON). */
  pdfBase64: string;
}

/** Créditos estimados para el preflight check (se refinan en el processor). */
const ESTIMATED_PAGES_FOR_CHECK = 10;
const CREDITS_PER_PAGE_ESTIMATE = 0.5;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectQueue(DOCUMENT_AI_QUEUE)
    private readonly docAiQueue: Queue<DocumentAiJobData>,
    private readonly billingService: BillingService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Recibe un PDF en memoria, valida créditos, crea el registro en DB y encola
   * el job para procesar con Document AI + embeddings + pgvector.
   */
  async upload(
    tenant: Tenant,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<{ documentId: string; jobId: string }> {
    if (!file) {
      throw new BadRequestException('Archivo PDF es requerido (campo: file).');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        `Tipo de archivo no soportado (${file.mimetype}). Solo se acepta application/pdf.`,
      );
    }
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }

    // ─── Pre-flight credit check ────────────────────────────────────────────
    const estimatedCredits = ESTIMATED_PAGES_FOR_CHECK * CREDITS_PER_PAGE_ESTIMATE;
    await this.billingService.checkCredits(tenant.id, estimatedCredits);

    // ─── Persistir registro Document ────────────────────────────────────────
    const document = this.documentRepo.create({
      tenantId: tenant.id,
      externalId: dto.externalId ?? null,
      documentType: dto.documentType ?? 'other',
      status: 'pending',
      fileName: dto.fileName,
      description: dto.description,
      seeboxPath: dto.seeboxPath,
      webhookPayload: {
        source: 'seebox',
        seeboxPath: dto.seeboxPath,
        originalFileName: file.originalname,
        sizeBytes: file.size,
      },
    });
    const saved = await this.documentRepo.save(document);

    // ─── Encolar job con el PDF en base64 ───────────────────────────────────
    const job = await this.docAiQueue.add(
      'process',
      {
        documentId: saved.id,
        tenantId: tenant.id,
        pdfBase64: file.buffer.toString('base64'),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Documento ${saved.id} encolado para Document AI (job: ${job.id}, tenant: ${tenant.id}, size: ${file.size} bytes)`,
    );

    return { documentId: saved.id, jobId: String(job.id) };
  }

  async getStatus(documentId: string, tenantId: string | null) {
    return this.documentRepo.findOne({
      where: tenantId ? { id: documentId, tenantId } : { id: documentId },
      select: [
        'id',
        'status',
        'pageCount',
        'documentType',
        'fileName',
        'description',
        'seeboxPath',
        'errorMessage',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findAllByTenant(tenantId: string | null) {
    return this.documentRepo.find({
      where: tenantId ? { tenantId } : {},
      select: [
        'id',
        'status',
        'pageCount',
        'documentType',
        'fileName',
        'description',
        'errorMessage',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async removeDocument(documentId: string, tenantId: string | null): Promise<boolean> {
    const doc = await this.documentRepo.findOne({
      where: tenantId ? { id: documentId, tenantId } : { id: documentId },
    });
    if (!doc) return false;

    await this.dataSource.query(
      'DELETE FROM document_chunks WHERE document_id = $1',
      [documentId],
    );
    await this.dataSource.query(
      'DELETE FROM agent_documents WHERE document_id = $1',
      [documentId],
    );
    await this.documentRepo.remove(doc);
    return true;
  }

  async getTenantById(tenantId: string | null): Promise<Tenant | null> {
    if (!tenantId) return null;
    return this.tenantRepo.findOne({ where: { id: tenantId } });
  }

  async getFirstTenant(): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
  }
}
