import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { WhatsappChannel } from './whatsapp-channel.entity';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

@Entity('whatsapp_conversations')
@Unique(['channelId', 'phone'])
export class WhatsappConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WhatsappChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: WhatsappChannel;

  @Column({ type: 'uuid', name: 'channel_id' })
  channelId: string;

  /** Sender's phone number (e.g. "521234567890") */
  @Column({ type: 'varchar', length: 32 })
  phone: string;

  /** Last N conversation turns (max 40 entries = 20 exchange pairs) */
  @Column({ type: 'jsonb', default: [] })
  history: ConversationTurn[];

  @UpdateDateColumn()
  updatedAt: Date;
}
