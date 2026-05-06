import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Tenant } from './tenant.entity';
import type { AgentDocument } from './agent-document.entity';

export type DocumentStatus =
  | 'pending'
  | 'ocr_processing'
  | 'ai_processing'
  | 'embedding'
  | 'done'
  | 'error';
export type DocumentType = 'legal' | 'medical' | 'financial' | 'other';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** External reference from Portal B */
  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'External document ID from Portal B' })
  externalId: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: DocumentStatus;

  @Column({ type: 'varchar', length: 32, default: 'other' })
  documentType: DocumentType;

  /** Cronotix does NOT store the original PDF — only extracted OCR text per page */
  @Column({ type: 'jsonb', nullable: true, comment: 'OCR text per page: { "1": "...", "2": "..." }' })
  pagesText: Record<string, string> | null;

  @Column({ type: 'int', default: 0 })
  pageCount: number;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Extracted structured fields by the AI agent' })
  extractedFields: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  webhookPayload: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true, comment: 'Ruta en sistema Seebox' })
  seeboxPath: string | null;

  @ManyToOne('Tenant', 'documents', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @OneToMany('AgentDocument', 'document', { eager: false })
  agentDocuments: AgentDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
