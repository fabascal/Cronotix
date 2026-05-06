import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TelegramConfig } from './telegram-config.entity';
import { Agent } from './agent.entity';

@Entity('telegram_channels')
export class TelegramChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @ManyToOne(() => TelegramConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'telegram_config_id' })
  telegramConfig: TelegramConfig | null;

  @Column({ type: 'uuid', name: 'telegram_config_id', nullable: true })
  telegramConfigId: string | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  @Column({ type: 'uuid', name: 'agent_id', nullable: true })
  agentId: string | null;

  /** Random secret sent by Telegram in X-Telegram-Bot-Api-Secret-Token header */
  @Column({ type: 'varchar', length: 128 })
  secretToken: string;

  /** If true, only Telegram chat IDs in whitelistChatIds can interact */
  @Column({ default: false })
  whitelistEnabled: boolean;

  /** Allowed Telegram chat IDs (numeric strings) */
  @Column({ type: 'simple-array', name: 'whitelist_chat_ids', default: '' })
  whitelistChatIds: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
