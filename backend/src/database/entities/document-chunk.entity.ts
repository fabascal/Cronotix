import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Chunk de texto extraído de un Document, con su embedding vectorial para
 * búsqueda semántica vía pgvector.
 *
 * La columna `embedding vector(768)` NO se declara aquí porque TypeORM no
 * entiende el tipo nativo de pgvector. Se crea y mantiene mediante SQL raw
 * en `DocumentAiProcessor.onModuleInit()`.
 */
@Entity('document_chunks')
@Index('document_chunks_document_id_idx', ['documentId'])
@Index('document_chunks_tenant_id_idx', ['tenantId'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'page_numbers',
    type: 'simple-array',
    nullable: true,
    comment: 'Páginas de origen de este chunk, ej. ["1","2"]',
  })
  pageNumbers: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
