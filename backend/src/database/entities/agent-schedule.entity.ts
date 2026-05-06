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
import { Agent } from './agent.entity';
import { AgentFunction } from './agent-function.entity';
import { ContactList } from './contact-list.entity';
import { SmtpConfig } from './smtp-config.entity';
import { WhatsappConfig } from './whatsapp-config.entity';
import { TelegramConfig } from './telegram-config.entity';
import { ScheduleExecution } from './schedule-execution.entity';

export type RecurrenceType = 'interval' | 'daily' | 'weekly' | 'monthly' | 'once';
export type DeliveryType = 'none' | 'email' | 'whatsapp' | 'telegram';

@Entity('agent_schedules')
export class AgentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (a) => a.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => AgentFunction, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'function_id' })
  function: AgentFunction | null;

  @Column({ type: 'uuid', name: 'function_id', nullable: true })
  functionId: string | null;

  /** Fixed params sent to the webhook on each execution */
  @Column({ type: 'jsonb', default: {} })
  staticParams: Record<string, unknown>;

  /** Optional: user instructions to turn webhook JSON into natural language via the agent LLM + skills */
  @Column({ type: 'text', nullable: true })
  processingPrompt: string | null;

  @Column({ type: 'varchar', length: 16, default: 'daily' })
  recurrenceType: RecurrenceType;

  /** User-facing config — translated to cronExpression server-side */
  @Column({ type: 'jsonb', default: {} })
  recurrenceConfig: Record<string, unknown>;

  /** Derived cron string used by Bull; null for one-time schedules */
  @Column({ type: 'varchar', length: 64, nullable: true })
  cronExpression: string | null;

  @Column({ type: 'varchar', length: 16, default: 'none' })
  deliveryType: DeliveryType;

  @ManyToOne(() => ContactList, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_list_id' })
  contactList: ContactList | null;

  @Column({ type: 'uuid', name: 'contact_list_id', nullable: true })
  contactListId: string | null;

  @ManyToOne(() => SmtpConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'smtp_config_id' })
  smtpConfig: SmtpConfig | null;

  @Column({ type: 'uuid', name: 'smtp_config_id', nullable: true })
  smtpConfigId: string | null;

  @ManyToOne(() => WhatsappConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'whatsapp_config_id' })
  whatsappConfig: WhatsappConfig | null;

  @Column({ type: 'uuid', name: 'whatsapp_config_id', nullable: true })
  whatsappConfigId: string | null;

  @ManyToOne(() => TelegramConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'telegram_config_id' })
  telegramConfig: TelegramConfig | null;

  @Column({ type: 'uuid', name: 'telegram_config_id', nullable: true })
  telegramConfigId: string | null;

  @Column({ default: true })
  isActive: boolean;

  /** Bull job id to allow removal/update */
  @Column({ type: 'varchar', length: 128, nullable: true })
  bullJobId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @OneToMany(() => ScheduleExecution, (e) => e.schedule, { eager: false })
  executions: ScheduleExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
