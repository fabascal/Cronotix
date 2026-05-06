import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export type LlmProviderId = 'openai' | 'ollama' | 'gemini';

@Entity('llm_provider_configs')
@Unique(['tenantId', 'provider'])
export class LlmProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  provider: LlmProviderId;

  /**
   * Stores either a real tenant UUID or a user's own UUID (for superadmin
   * without a dedicated tenant). No FK constraint so both cases are valid.
   */
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ default: true })
  enabled: boolean;

  /** Base URL (Ollama obligatorio; OpenAI opcional p. ej. proxy/Azure-compatible) */
  @Column({ type: 'varchar', length: 512, nullable: true })
  baseUrl: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  apiKeyEncrypted: string | null;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
