import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Tenant } from './tenant.entity';
import type { Document } from './document.entity';

export type OperationType = 'ocr' | 'summarize' | 'extract_fields' | 'embedding' | 'chat' | 'other';

@Entity('token_usage')
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, comment: 'Provider name: openai, gemini, google_doc_ai' })
  provider: string;

  @Column({ type: 'varchar', length: 128, comment: 'Model identifier from provider_pricing' })
  modelId: string;

  @Column({ type: 'varchar', length: 32, default: 'other' })
  operationType: OperationType;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0, comment: 'promptTokens + completionTokens' })
  totalTokens: number;

  /** Cost in credits (computed from provider_pricing at time of operation) */
  @Column({ type: 'decimal', precision: 18, scale: 6 })
  creditsConsumed: number;

  /** USD cost for internal tracking */
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  usdCost: number | null;

  @ManyToOne('Tenant', 'tokenUsages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne('Document', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_id' })
  document: Document | null;

  @Column({ type: 'varchar', name: 'document_id', nullable: true })
  documentId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
