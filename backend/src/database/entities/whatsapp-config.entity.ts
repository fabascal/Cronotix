import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('whatsapp_configs')
export class WhatsappConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** Meta WhatsApp Business Phone Number ID */
  @Column({ type: 'varchar', length: 64 })
  phoneNumberId: string;

  /** AES-256-GCM encrypted Meta permanent access token */
  @Column({ type: 'text' })
  accessToken: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
