import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Agent } from './agent.entity';
import { Document } from './document.entity';

@Entity('agent_documents')
@Unique('uq_agent_document', ['agentId', 'documentId'])
export class AgentDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (a) => a.agentDocuments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Document, (d) => d.agentDocuments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
