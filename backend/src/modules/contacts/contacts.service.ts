import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { ContactList } from '../../database/entities/contact-list.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { CreateContactListDto } from './dto/create-list.dto';
import { AddContactEntryDto } from './dto/add-entry.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactList)
    private readonly listRepo: Repository<ContactList>,
    @InjectRepository(ContactEntry)
    private readonly entryRepo: Repository<ContactEntry>,
  ) {}

  async findAll(tenantId: string | null) {
    const lists = await this.listRepo.find({
      where: tenantId ? { tenantId } : {},
      order: { createdAt: 'DESC' },
    });

    if (lists.length === 0) return [];

    const counts = await this.entryRepo
      .createQueryBuilder('e')
      .select('e.list_id', 'listId')
      .addSelect('COUNT(*)', 'count')
      .where('e.list_id IN (:...ids)', { ids: lists.map((l) => l.id) })
      .groupBy('e.list_id')
      .getRawMany<{ listId: string; count: string }>();

    const countMap = new Map(counts.map((c) => [c.listId, Number(c.count)]));
    return lists.map((l) => ({ ...l, entryCount: countMap.get(l.id) ?? 0 }));
  }

  async findOne(id: string, tenantId: string | null) {
    const list = await this.listRepo.findOne({
      where: tenantId ? { id, tenantId } : { id },
      relations: ['entries'],
    });
    if (!list) throw new NotFoundException('Lista de contacto no encontrada');
    return list;
  }

  async create(tenantId: string | null, dto: CreateContactListDto) {
    const list = this.listRepo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.listRepo.save(list);
  }

  async update(id: string, tenantId: string | null, dto: Partial<CreateContactListDto>) {
    const list = await this.findOne(id, tenantId);
    Object.assign(list, dto);
    return this.listRepo.save(list);
  }

  async remove(id: string, tenantId: string | null) {
    const list = await this.findOne(id, tenantId);
    await this.listRepo.remove(list);
    return true;
  }

  async addEntry(listId: string, tenantId: string | null, dto: AddContactEntryDto) {
    await this.findOne(listId, tenantId);
    const entry = this.entryRepo.create({
      listId,
      name: dto.name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      telegramId: dto.telegramId ?? null,
    });
    return this.entryRepo.save(entry);
  }

  async removeEntry(listId: string, entryId: string, tenantId: string | null) {
    await this.findOne(listId, tenantId);
    const result = await this.entryRepo.delete({ id: entryId, listId });
    if (result.affected === 0) {
      throw new NotFoundException('Contacto no encontrado');
    }
    return true;
  }

  async importCsv(listId: string, tenantId: string | null, buffer: Buffer) {
    await this.findOne(listId, tenantId);

    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];

    const entries: Partial<ContactEntry>[] = [];
    for (const row of records) {
      const name = row.name || row.nombre || row.Name || '';
      if (!name) continue;
      entries.push({
        listId,
        name,
        email: row.email || row.correo || row.Email || null,
        phone: row.phone || row.telefono || row.Phone || row.tel || null,
        telegramId: row.telegramId || row.telegram_id || row.telegram || null,
      });
    }

    if (entries.length === 0) return { imported: 0 };

    await this.entryRepo
      .createQueryBuilder()
      .insert()
      .into(ContactEntry)
      .values(entries)
      .execute();

    return { imported: entries.length };
  }
}
