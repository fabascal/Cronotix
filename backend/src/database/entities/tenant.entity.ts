import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Document } from './document.entity';
import type { TokenUsage } from './token-usage.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 64, comment: 'SHA-256 hash of the raw API key' })
  apiKeyHash: string;

  /** Human-readable identifier for logging (not the raw key) */
  @Column({ type: 'varchar', length: 64, comment: 'Last 8 chars of the raw API key for identification' })
  apiKeyPrefix: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  credits: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany('Document', 'tenant')
  documents: Document[];

  @OneToMany('TokenUsage', 'tenant')
  tokenUsages: TokenUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
