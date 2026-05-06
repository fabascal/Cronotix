import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { TelegramChannel } from './telegram-channel.entity';

export interface TelegramConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

@Entity('telegram_conversations')
@Unique(['channelId', 'chatId'])
export class TelegramConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TelegramChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: TelegramChannel;

  @Column({ type: 'uuid', name: 'channel_id' })
  channelId: string;

  /** Telegram chat ID (numeric, stored as string) */
  @Column({ type: 'varchar', length: 32 })
  chatId: string;

  /** Last N conversation turns (max 40 entries = 20 exchange pairs) */
  @Column({ type: 'jsonb', default: [] })
  history: TelegramConversationTurn[];

  @UpdateDateColumn()
  updatedAt: Date;
}
