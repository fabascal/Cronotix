import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { LlmProviderId } from './llm-provider-config.entity';

@Entity('llm_model_templates')
@Unique(['tenantId', 'acronym'])
@Unique(['tenantId', 'provider', 'modelId'])
export class LlmModelTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Tenant UUID (or superadmin user UUID as personal workspace key). */
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 16 })
  provider: LlmProviderId;

  /** Short code used across Cronotix (e.g. CO-000, CG-001, CL-002). */
  @Column({ type: 'varchar', length: 16 })
  acronym: string;

  /** Native provider model id (e.g. gpt-5.4, gemini-1.5-pro, deepseek-r1). */
  @Column({ type: 'varchar', length: 128 })
  modelId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
