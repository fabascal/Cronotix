import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export type McpIntegrationType =
  | 'filesystem'
  | 'postgresql'
  | 'github'
  | 'slack'
  | 'notion'
  | 'http';

@Entity('mcp_integrations')
export class McpIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (a) => a.mcpIntegrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 32 })
  type: McpIntegrationType;

  /** Non-sensitive configuration (paths, hosts, etc.). */
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  /** AES-256-GCM encrypted JSON of sensitive fields (tokens, passwords). */
  @Column({ type: 'text', nullable: true })
  encryptedSecrets: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
