import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/** Fixed menu slugs that can be assigned to a role. */
export const MENU_SLUGS = [
  'dashboard',
  'documents',
  'agents',
  'skills',
  'settings.models',
  'settings.users',
  'settings.roles',
  'mcp',
  'billing',
] as const;

export type MenuSlug = (typeof MENU_SLUGS)[number];

@Entity('roles')
@Unique(['name'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Subset of MENU_SLUGS this role may access. */
  @Column({ type: 'jsonb', default: [] })
  permissions: MenuSlug[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
