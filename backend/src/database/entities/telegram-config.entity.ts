import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('telegram_configs')
export class TelegramConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** AES-256-GCM encrypted Telegram Bot Token */
  @Column({ type: 'text' })
  botToken: string;

  /** Bot username (e.g. "@MyBot") — fetched from Telegram on creation */
  @Column({ type: 'varchar', length: 128, nullable: true })
  botUsername: string | null;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
