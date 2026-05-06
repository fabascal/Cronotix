import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WhatsappChannel } from '../../database/entities/whatsapp-channel.entity';
import { WhatsappConversation, type ConversationTurn } from '../../database/entities/whatsapp-conversation.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { WhatsappConfigService } from '../settings/whatsapp-config.service';
import { AgentsCrudService } from '../agents/agents-crud.service';

const MAX_HISTORY_ENTRIES = 40; // 20 user + 20 assistant turns

@Injectable()
export class WhatsappChannelService {
  private readonly logger = new Logger(WhatsappChannelService.name);

  constructor(
    @InjectRepository(WhatsappChannel)
    private readonly channelRepo: Repository<WhatsappChannel>,
    @InjectRepository(WhatsappConversation)
    private readonly convRepo: Repository<WhatsappConversation>,
    @InjectRepository(ContactEntry)
    private readonly contactEntryRepo: Repository<ContactEntry>,
    private readonly whatsappConfigService: WhatsappConfigService,
    private readonly agentsCrudService: AgentsCrudService,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string | null, agentId?: string) {
    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (agentId) where['agentId'] = agentId;
    return this.channelRepo.find({
      where,
      relations: ['whatsappConfig', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const channel = await this.channelRepo.findOne({
      where: tenantId ? { id, tenantId } : { id },
      relations: ['whatsappConfig', 'agent'],
    });
    if (!channel) throw new NotFoundException('Canal WhatsApp no encontrado');
    return channel;
  }

  async findOneById(id: string) {
    return this.channelRepo.findOne({ where: { id } });
  }

  async create(tenantId: string | null, dto: {
    name: string;
    whatsappConfigId: string;
    agentId: string;
    whitelistEnabled?: boolean;
    whitelistContactListIds?: string[];
    isActive?: boolean;
  }) {
    const verifyToken = randomBytes(24).toString('hex');
    const channel = this.channelRepo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      whatsappConfigId: dto.whatsappConfigId,
      agentId: dto.agentId,
      verifyToken,
      whitelistEnabled: dto.whitelistEnabled ?? false,
      whitelistContactListIds: dto.whitelistContactListIds ?? [],
      isActive: dto.isActive ?? true,
    });
    const saved = await this.channelRepo.save(channel);
    return this.findOne(saved.id, tenantId);
  }

  async update(id: string, tenantId: string | null, dto: {
    name?: string;
    whatsappConfigId?: string;
    agentId?: string;
    whitelistEnabled?: boolean;
    whitelistContactListIds?: string[];
    isActive?: boolean;
  }) {
    const channel = await this.findOne(id, tenantId);
    Object.assign(channel, dto);
    const saved = await this.channelRepo.save(channel);
    return this.findOne(saved.id, tenantId);
  }

  async remove(id: string, tenantId: string | null) {
    const channel = await this.findOne(id, tenantId);
    await this.channelRepo.remove(channel);
    return true;
  }

  // ─── Inbound message handling ────────────────────────────────────────────────

  async handleInbound(channelId: string, from: string, text: string): Promise<void> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, isActive: true },
    });

    if (!channel) {
      this.logger.warn(`Inbound message for unknown/inactive channel ${channelId}`);
      return;
    }

    if (!channel.agentId || !channel.whatsappConfigId) {
      this.logger.warn(`Channel ${channelId} is missing agentId or whatsappConfigId`);
      return;
    }

    // 1. Whitelist check — resolve phones from contact lists
    if (channel.whitelistEnabled) {
      const normalizedFrom = from.replace(/\D/g, '');
      let allowed = false;

      const listIds = (channel.whitelistContactListIds ?? []).filter(Boolean);
      if (listIds.length > 0) {
        const entries = await this.contactEntryRepo.find({
          where: { listId: In(listIds) },
          select: ['phone'],
        });
        allowed = entries.some(
          (e) => e.phone && e.phone.replace(/\D/g, '') === normalizedFrom,
        );
      }

      if (!allowed) {
        this.logger.log(`Blocked inbound from ${from} (not in whitelist for channel ${channelId})`);
        return;
      }
    }

    // 2. Load or create conversation history
    const conv = await this.getOrCreateConversation(channelId, from);

    // 3. Call the agent
    this.logger.log(`Routing message from ${from} to agent ${channel.agentId}`);
    const response = await this.agentsCrudService.chat(
      channel.agentId,
      {
        message: text,
        history: conv.history as any[],
      },
      channel.tenantId,
    );

    // 4. Update history (keep last MAX_HISTORY_ENTRIES entries)
    const newHistory: ConversationTurn[] = [
      ...conv.history,
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: response.message },
    ].slice(-MAX_HISTORY_ENTRIES);

    conv.history = newHistory;
    await this.convRepo.save(conv);

    // 5. Send reply via WhatsApp
    const cfg = await this.whatsappConfigService.getDecryptedConfig(channel.whatsappConfigId);
    await this.whatsappConfigService.sendMessage(
      cfg.phoneNumberId,
      cfg.accessToken,
      from,
      response.message,
    );

    this.logger.log(`Reply sent to ${from} via channel ${channelId}`);
  }

  private async getOrCreateConversation(
    channelId: string,
    phone: string,
  ): Promise<WhatsappConversation> {
    let conv = await this.convRepo.findOne({ where: { channelId, phone } });
    if (!conv) {
      conv = this.convRepo.create({ channelId, phone, history: [] });
      conv = await this.convRepo.save(conv);
    }
    return conv;
  }

  /** Clear conversation history for a given phone in a channel */
  async clearHistory(channelId: string, tenantId: string | null, phone: string) {
    await this.findOne(channelId, tenantId);
    await this.convRepo.delete({ channelId, phone });
    return true;
  }

  /** List active conversations for a channel */
  async listConversations(channelId: string, tenantId: string | null) {
    await this.findOne(channelId, tenantId);
    return this.convRepo.find({
      where: { channelId },
      order: { updatedAt: 'DESC' },
    });
  }
}
