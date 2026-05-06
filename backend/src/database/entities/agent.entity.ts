import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import type { Tenant } from './tenant.entity';
import { Skill } from './skill.entity';
import { AgentFunction } from './agent-function.entity';
import { McpIntegration } from './mcp-integration.entity';
import { AgentDocument } from './agent-document.entity';
import { AgentSchedule } from './agent-schedule.entity';

export type AgentType = 'conversacional' | 'extractor' | 'ocr' | 'clasificador';
export type AgentStatus = 'activo' | 'inactivo';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Agent capability type */
  @Column({ type: 'varchar', length: 32, default: 'conversacional' })
  type: AgentType;

  /** LLM model identifier used by this agent */
  @Column({ type: 'varchar', length: 64, default: 'gpt-4o' })
  llmModel: string;

  @Column({ type: 'varchar', length: 32, default: 'inactivo' })
  status: AgentStatus;

  /** Arbitrary configuration (system prompt, temperature, tools, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @ManyToOne('Tenant', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** null = superadmin-owned agent (not scoped to a specific tenant) */
  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToMany(() => Skill, { eager: false })
  @JoinTable({
    name: 'agent_skills',
    joinColumn: { name: 'agent_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skill_id', referencedColumnName: 'id' },
  })
  skills: Skill[];

  @OneToMany(() => AgentFunction, (fn) => fn.agent, { eager: false })
  functions: AgentFunction[];

  @OneToMany(() => McpIntegration, (mcp) => mcp.agent, { eager: false })
  mcpIntegrations: McpIntegration[];

  @OneToMany(() => AgentDocument, (ad) => ad.agent, { eager: false })
  agentDocuments: AgentDocument[];

  @OneToMany(() => AgentSchedule, (s) => s.agent, { eager: false })
  schedules: AgentSchedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
