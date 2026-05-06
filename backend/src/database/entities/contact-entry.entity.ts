import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContactList } from './contact-list.entity';

@Entity('contact_entries')
export class ContactEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ContactList, (l) => l.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list: ContactList;

  @Column({ type: 'uuid', name: 'list_id' })
  listId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'telegram_id' })
  telegramId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
