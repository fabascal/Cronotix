import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AgentSchedule } from './agent-schedule.entity';

export type ExecutionStatus = 'success' | 'failed' | 'pending';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped';

@Entity('schedule_executions')
export class ScheduleExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgentSchedule, (s) => s.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: AgentSchedule;

  @Column({ type: 'uuid', name: 'schedule_id' })
  scheduleId: string;

  @CreateDateColumn()
  executedAt: Date;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  functionRequest: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  functionResponse: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 16, default: 'skipped' })
  deliveryStatus: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
