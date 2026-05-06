import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * LLM provider pricing — NEVER hardcode tariffs in code.
 * Always query this table to compute costs.
 */
@Entity('provider_pricing')
export class ProviderPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64, comment: 'Provider name: openai, gemini, google_doc_ai' })
  provider: string;

  @Column({ length: 128, unique: true, comment: 'Model identifier, e.g. gpt-4o, gemini-1.5-pro' })
  modelId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /** Cost per 1 000 input tokens in USD */
  @Column({ type: 'decimal', precision: 12, scale: 8, default: 0 })
  inputPricePer1kTokens: number;

  /** Cost per 1 000 output tokens in USD */
  @Column({ type: 'decimal', precision: 12, scale: 8, default: 0 })
  outputPricePer1kTokens: number;

  /** Credits multiplier: credits = usdCost * creditsPerUsd */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  creditsPerUsd: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
