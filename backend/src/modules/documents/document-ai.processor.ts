import { Process, Processor } from '@nestjs/bull';
import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Job } from 'bull';
import { DocumentProcessorServiceClient, protos } from '@google-cloud/documentai';

type DocAiPage = protos.google.cloud.documentai.v1.Document.IPage;
import { Document } from '../../database/entities/document.entity';
import { BillingService } from '../billing/billing.service';
import { DOCUMENT_AI_QUEUE, DocumentAiJobData } from './documents.service';

/** Identificadores usados contra provider_pricing para el billing. */
const GOOGLE_DOC_AI_PROVIDER = 'google_doc_ai';
const GOOGLE_DOC_AI_MODEL = 'document-ai-ocr';
const GEMINI_PROVIDER = 'gemini';
const GEMINI_EMBED_MODEL = 'gemini-embedding-001';

/** Dimensiones del vector (gemini-embedding-001 truncado via outputDimensionality). */
const EMBEDDING_DIMENSIONS = 768;

/** Parámetros de chunking en "palabras" (aprox. tokens para texto en español). */
const CHUNK_SIZE_WORDS = 512;
const CHUNK_OVERLAP_WORDS = 100;

@Injectable()
@Processor(DOCUMENT_AI_QUEUE)
export class DocumentAiProcessor implements OnModuleInit {
  private readonly logger = new Logger(DocumentAiProcessor.name);
  private docAiClient: DocumentProcessorServiceClient | null = null;
  private readonly processorName: string;
  private readonly geminiApiKey: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly billingService: BillingService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    const projectId = this.config.get<string>('GOOGLE_PROJECT_ID') ?? '';
    const location = this.config.get<string>('GOOGLE_LOCATION', 'us');
    const processorId = this.config.get<string>('GOOGLE_PROCESSOR_ID') ?? '';
    this.processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
  }

  /**
   * Asegura la extensión pgvector, la columna `embedding` y un índice ivfflat
   * sobre `document_chunks`. Se ejecuta una vez al arrancar el módulo.
   *
   * TypeORM no puede declarar la columna vector(768) porque no conoce ese tipo,
   * por eso la administramos aquí con SQL raw.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.dataSource.query(
        `ALTER TABLE document_chunks
           ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMENSIONS})`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
           ON document_chunks USING hnsw (embedding vector_cosine_ops)`,
      );
      this.logger.log(
        `pgvector listo: extensión + columna embedding(${EMBEDDING_DIMENSIONS}) + índice hnsw`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo inicializar pgvector: ${msg}`);
    }
  }

  @Process('process')
  async handle(job: Job<DocumentAiJobData>): Promise<void> {
    const { documentId, tenantId, pdfBase64 } = job.data;
    this.logger.log(
      `Procesando documento ${documentId} con Document AI (tenant: ${tenantId})`,
    );

    await this.documentRepo.update(documentId, { status: 'ocr_processing' });

    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // ── 1. OCR con Google Document AI ────────────────────────────────────
      const pagesText = await this.runDocumentAi(pdfBuffer);
      const pageCount = Object.keys(pagesText).length;

      await this.documentRepo.update(documentId, {
        pagesText,
        pageCount,
        status: 'embedding',
      });

      // ── 2. Chunking ───────────────────────────────────────────────────────
      const chunks = this.chunkPages(pagesText);
      this.logger.log(
        `Documento ${documentId}: ${pageCount} páginas → ${chunks.length} chunks`,
      );

      // ── 3. Embeddings + inserción en pgvector ────────────────────────────
      let totalPromptTokens = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.embedText(chunk.content);
        totalPromptTokens += this.approxTokenCount(chunk.content);

        await this.insertChunk({
          documentId,
          tenantId,
          chunkIndex: i,
          content: chunk.content,
          pageNumbers: chunk.pageNumbers,
          embedding,
        });
      }

      // ── 4. Billing: OCR (por páginas) + embeddings (por tokens) ──────────
      await this.billingService.deductCredits({
        tenantId,
        documentId,
        provider: GOOGLE_DOC_AI_PROVIDER,
        modelId: GOOGLE_DOC_AI_MODEL,
        operationType: 'ocr',
        promptTokens: pageCount * 500,
        completionTokens: 0,
      });

      if (totalPromptTokens > 0) {
        await this.billingService.deductCredits({
          tenantId,
          documentId,
          provider: GEMINI_PROVIDER,
          modelId: GEMINI_EMBED_MODEL,
          operationType: 'embedding',
          promptTokens: totalPromptTokens,
          completionTokens: 0,
        });
      }

      await this.documentRepo.update(documentId, { status: 'done' });
      this.logger.log(
        `Documento ${documentId} listo: ${pageCount} pág, ${chunks.length} chunks vectorizados`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fallo procesando documento ${documentId}: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.documentRepo.update(documentId, {
        status: 'error',
        errorMessage: msg,
      });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Google Document AI
  // ─────────────────────────────────────────────────────────────────────────

  private getDocAiClient(): DocumentProcessorServiceClient {
    if (!this.docAiClient) {
      this.docAiClient = new DocumentProcessorServiceClient();
    }
    return this.docAiClient;
  }

  private async runDocumentAi(pdfBuffer: Buffer): Promise<Record<string, string>> {
    if (!this.processorName.includes('/processors/') || this.processorName.endsWith('/')) {
      throw new InternalServerErrorException(
        'Document AI no está configurado: revisa GOOGLE_PROJECT_ID / GOOGLE_LOCATION / GOOGLE_PROCESSOR_ID.',
      );
    }

    const client = this.getDocAiClient();
    const [result] = await client.processDocument({
      name: this.processorName,
      rawDocument: {
        content: pdfBuffer,
        mimeType: 'application/pdf',
      },
      imagelessMode: true,
    });

    const doc = result.document;
    if (!doc) {
      throw new InternalServerErrorException('Document AI no devolvió un documento.');
    }

    const fullText = doc.text ?? '';
    const pages = doc.pages ?? [];
    const output: Record<string, string> = {};

    if (pages.length === 0) {
      // Fallback: sin paginación, todo como página 1
      output['1'] = fullText.trim();
      return output;
    }

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageText = this.extractPageText(page, fullText);
      output[String(i + 1)] = pageText.trim();
    }

    return output;
  }

  /**
   * Document AI devuelve el texto completo en `document.text` y cada página
   * referencia offsets en ese string vía `layout.textAnchor.textSegments`.
   */
  private extractPageText(page: DocAiPage, fullText: string): string {
    const segments = page.layout?.textAnchor?.textSegments;
    if (!segments || segments.length === 0) return '';

    let text = '';
    for (const seg of segments) {
      const start = Number(seg.startIndex ?? 0);
      const end = Number(seg.endIndex ?? 0);
      if (end > start) {
        text += fullText.substring(start, end);
      }
    }
    return text;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chunking
  // ─────────────────────────────────────────────────────────────────────────

  private chunkPages(
    pagesText: Record<string, string>,
  ): Array<{ content: string; pageNumbers: string[] }> {
    // Construimos una secuencia de "tokens" (palabras) con su página de origen,
    // así podemos saber a qué páginas pertenece cada chunk resultante.
    type TokenWithPage = { word: string; page: string };
    const tokens: TokenWithPage[] = [];

    const sortedPages = Object.keys(pagesText).sort(
      (a, b) => Number(a) - Number(b),
    );
    for (const page of sortedPages) {
      const words = pagesText[page].split(/\s+/).filter(Boolean);
      for (const w of words) tokens.push({ word: w, page });
    }

    if (tokens.length === 0) return [];

    const chunks: Array<{ content: string; pageNumbers: string[] }> = [];
    const step = Math.max(1, CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS);

    for (let start = 0; start < tokens.length; start += step) {
      const end = Math.min(start + CHUNK_SIZE_WORDS, tokens.length);
      const slice = tokens.slice(start, end);
      const content = slice.map((t) => t.word).join(' ').trim();
      if (!content) continue;

      const pageSet = new Set<string>();
      for (const t of slice) pageSet.add(t.page);
      chunks.push({
        content,
        pageNumbers: Array.from(pageSet).sort((a, b) => Number(a) - Number(b)),
      });

      if (end >= tokens.length) break;
    }

    return chunks;
  }

  private approxTokenCount(text: string): number {
    // Aproximación simple: 1 token ≈ 0.75 palabras para castellano/inglés
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.ceil(words / 0.75);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Gemini embeddings
  // ─────────────────────────────────────────────────────────────────────────

  private async embedText(text: string): Promise<number[]> {
    if (!this.geminiApiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY no configurada; no se pueden generar embeddings.',
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(this.geminiApiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new InternalServerErrorException(
        `Gemini embedContent falló (${res.status}): ${body.slice(0, 300)}`,
      );
    }

    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    const values = json.embedding?.values;
    if (!values || values.length !== EMBEDDING_DIMENSIONS) {
      throw new InternalServerErrorException(
        `Gemini devolvió un embedding inválido (dims=${values?.length ?? 0}, esperadas=${EMBEDDING_DIMENSIONS}).`,
      );
    }
    return values;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pgvector insert
  // ─────────────────────────────────────────────────────────────────────────

  private async insertChunk(params: {
    documentId: string;
    tenantId: string;
    chunkIndex: number;
    content: string;
    pageNumbers: string[];
    embedding: number[];
  }): Promise<void> {
    // pgvector acepta strings con formato '[0.1,0.2,...]' casteados a vector.
    const vectorLiteral = `[${params.embedding.join(',')}]`;
    const pagesLiteral = params.pageNumbers.join(','); // simple-array

    await this.dataSource.query(
      `INSERT INTO document_chunks
         (id, document_id, tenant_id, chunk_index, content, page_numbers, embedding, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, NOW())`,
      [
        params.documentId,
        params.tenantId,
        params.chunkIndex,
        params.content,
        pagesLiteral,
        vectorLiteral,
      ],
    );
  }
}
