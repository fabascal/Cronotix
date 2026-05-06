import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { TelegramChannel } from '../../database/entities/telegram-channel.entity';
import { TelegramConversation, type TelegramConversationTurn } from '../../database/entities/telegram-conversation.entity';
import { TelegramConfigService } from '../settings/telegram-config.service';
import { AgentsCrudService } from '../agents/agents-crud.service';

const MAX_HISTORY_ENTRIES = 40;

@Injectable()
export class TelegramChannelService {
  private readonly logger = new Logger(TelegramChannelService.name);

  constructor(
    @InjectRepository(TelegramChannel)
    private readonly channelRepo: Repository<TelegramChannel>,
    @InjectRepository(TelegramConversation)
    private readonly convRepo: Repository<TelegramConversation>,
    private readonly telegramConfigService: TelegramConfigService,
    private readonly agentsCrudService: AgentsCrudService,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string | null, agentId?: string) {
    const where: Record<string, unknown> = tenantId ? { tenantId } : {};
    if (agentId) where['agentId'] = agentId;
    return this.channelRepo.find({
      where,
      relations: ['telegramConfig', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const channel = await this.channelRepo.findOne({
      where: tenantId ? { id, tenantId } : { id },
      relations: ['telegramConfig', 'agent'],
    });
    if (!channel) throw new NotFoundException('Canal Telegram no encontrado');
    return channel;
  }

  async findOneById(id: string) {
    return this.channelRepo.findOne({ where: { id } });
  }

  async create(tenantId: string | null, dto: {
    name: string;
    telegramConfigId: string;
    agentId: string;
    whitelistEnabled?: boolean;
    whitelistChatIds?: string[];
    isActive?: boolean;
  }) {
    const secretToken = randomBytes(24).toString('hex');
    const channel = this.channelRepo.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      telegramConfigId: dto.telegramConfigId,
      agentId: dto.agentId,
      secretToken,
      whitelistEnabled: dto.whitelistEnabled ?? false,
      whitelistChatIds: dto.whitelistChatIds ?? [],
      isActive: dto.isActive ?? true,
    });
    const saved = await this.channelRepo.save(channel);
    return this.findOne(saved.id, tenantId);
  }

  async update(id: string, tenantId: string | null, dto: {
    name?: string;
    telegramConfigId?: string;
    agentId?: string;
    whitelistEnabled?: boolean;
    whitelistChatIds?: string[];
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

  // ─── Webhook registration ─────────────────────────────────────────────────

  async registerWebhook(id: string, tenantId: string | null, baseUrl: string) {
    const channel = await this.findOne(id, tenantId);
    if (!channel.telegramConfigId) {
      throw new NotFoundException('Canal sin configuración de bot asignada');
    }

    const { botToken } = await this.telegramConfigService.getDecryptedConfig(channel.telegramConfigId);
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/webhook/telegram/${channel.id}`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: channel.secretToken,
        allowed_updates: ['message'],
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram setWebhook failed: ${data.description ?? 'unknown error'}`);
    }

    this.logger.log(`Webhook registered for channel ${id}: ${webhookUrl}`);
    return { ok: true, webhookUrl };
  }

  // ─── Inbound message handling ─────────────────────────────────────────────

  async handleInbound(channelId: string, chatId: string, username: string | undefined, text: string): Promise<void> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, isActive: true },
    });

    if (!channel) {
      this.logger.warn(`Inbound message for unknown/inactive channel ${channelId}`);
      return;
    }

    if (!channel.agentId || !channel.telegramConfigId) {
      this.logger.warn(`Channel ${channelId} missing agentId or telegramConfigId`);
      return;
    }

    // 1. Whitelist check
    if (channel.whitelistEnabled) {
      const allowedIds = (channel.whitelistChatIds ?? []).filter(Boolean);
      const allowed =
        allowedIds.includes(chatId) ||
        (username ? allowedIds.includes(username) || allowedIds.includes(`@${username}`) : false);

      if (!allowed) {
        this.logger.log(`Blocked inbound from chatId ${chatId} (not in whitelist for channel ${channelId})`);
        return;
      }
    }

    // 2. Load or create conversation history
    const conv = await this.getOrCreateConversation(channelId, chatId);

    // 3. Call the agent
    this.logger.log(`Routing message from chatId ${chatId} to agent ${channel.agentId}`);
    const response = await this.agentsCrudService.chat(
      channel.agentId,
      { message: text, history: conv.history as any[] },
      channel.tenantId,
    );

    // 4. Update history
    const newHistory: TelegramConversationTurn[] = [
      ...conv.history,
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: response.message },
    ].slice(-MAX_HISTORY_ENTRIES);

    conv.history = newHistory;
    await this.convRepo.save(conv);

    // 5. Send reply
    const { botToken } = await this.telegramConfigService.getDecryptedConfig(channel.telegramConfigId);
    await this.telegramConfigService.sendMessage(botToken, chatId, response.message);

    this.logger.log(`Reply sent to chatId ${chatId} via channel ${channelId}`);
  }

  private async getOrCreateConversation(channelId: string, chatId: string): Promise<TelegramConversation> {
    let conv = await this.convRepo.findOne({ where: { channelId, chatId } });
    if (!conv) {
      conv = this.convRepo.create({ channelId, chatId, history: [] });
      conv = await this.convRepo.save(conv);
    }
    return conv;
  }

  async listConversations(channelId: string, tenantId: string | null) {
    await this.findOne(channelId, tenantId);
    return this.convRepo.find({
      where: { channelId },
      order: { updatedAt: 'DESC' },
    });
  }

  async clearHistory(channelId: string, tenantId: string | null, chatId: string) {
    await this.findOne(channelId, tenantId);
    await this.convRepo.delete({ channelId, chatId });
    return true;
  }
}
