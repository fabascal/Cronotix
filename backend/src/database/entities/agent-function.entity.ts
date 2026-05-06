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

@Entity('agent_functions')
export class AgentFunction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (a) => a.functions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  /** Function name exposed to the LLM (snake_case). */
  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** JSON Schema describing the function parameters. */
  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, unknown>;

  @Column({ type: 'varchar', length: 512 })
  webhookUrl: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  webhookMethod: string;

  /** AES-256-GCM encrypted JSON string of headers. */
  @Column({ type: 'text', nullable: true })
  webhookHeaders: string | null;

  @Column({ type: 'int', default: 10000 })
  timeoutMs: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
