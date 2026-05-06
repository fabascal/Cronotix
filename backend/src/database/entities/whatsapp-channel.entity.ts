import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WhatsappConfig } from './whatsapp-config.entity';
import { Agent } from './agent.entity';

@Entity('whatsapp_channels')
export class WhatsappChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @ManyToOne(() => WhatsappConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'whatsapp_config_id' })
  whatsappConfig: WhatsappConfig | null;

  @Column({ type: 'uuid', name: 'whatsapp_config_id', nullable: true })
  whatsappConfigId: string | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  @Column({ type: 'uuid', name: 'agent_id', nullable: true })
  agentId: string | null;

  /** Random token used for Meta webhook verification */
  @Column({ type: 'varchar', length: 128 })
  verifyToken: string;

  /** If true, only phones from the selected contact lists are allowed to chat */
  @Column({ default: false })
  whitelistEnabled: boolean;

  /** UUIDs of ContactList records used as the whitelist source */
  @Column({ type: 'simple-array', name: 'whitelist_contact_list_ids', default: '' })
  whitelistContactListIds: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
