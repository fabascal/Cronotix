import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** The actual instructions injected into the agent's system prompt. */
  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  /** Global skills are visible to all tenants. */
  @Column({ default: false })
  isGlobal: boolean;

  /**
   * Tenant UUID (or superadmin personal workspace UUID).
   * Stored as plain varchar — no FK constraint — so superadmin workspace IDs
   * (which are user UUIDs, not tenant table rows) are also valid.
   * null for global skills.
   */
  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
