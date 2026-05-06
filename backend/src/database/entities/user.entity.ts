import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Tenant } from './tenant.entity';
import type { Role } from './role.entity';

export type UserRole = 'superadmin' | 'admin' | 'user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  /** Legacy role string — used for superadmin bypass. */
  @Column({ type: 'varchar', length: 32, default: 'admin' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  /** null = superadmin sin tenant específico */
  @ManyToOne('Tenant', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ type: 'varchar', name: 'tenant_id', nullable: true })
  tenantId: string | null;

  /** RBAC role — null = legacy/superadmin */
  @ManyToOne('Role', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  rbacRole: Role | null;

  @Column({ type: 'uuid', name: 'role_id', nullable: true })
  roleId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
