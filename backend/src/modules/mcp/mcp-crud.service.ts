import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../database/entities/agent.entity';
import { McpIntegration } from '../../database/entities/mcp-integration.entity';
import { encryptSecret, decryptSecret, maskSecret } from '../../common/crypto/aes-gcm';
import { CreateMcpIntegrationDto } from './dto/create-mcp-integration.dto';
import { UpdateMcpIntegrationDto } from './dto/update-mcp-integration.dto';

@Injectable()
export class McpCrudService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(McpIntegration)
    private readonly mcpRepo: Repository<McpIntegration>,
  ) {}

  private async ensureAgent(agentId: string, tenantId: string | null) {
    const agent = await this.agentRepo.findOne({
      where: tenantId ? { id: agentId, tenantId } : { id: agentId },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent;
  }

  async list(agentId: string, tenantId: string | null) {
    await this.ensureAgent(agentId, tenantId);
    const integrations = await this.mcpRepo.find({
      where: { agentId },
      order: { createdAt: 'ASC' },
    });
    return integrations.map((i) => this.sanitize(i));
  }

  async create(agentId: string, dto: CreateMcpIntegrationDto, tenantId: string | null) {
    await this.ensureAgent(agentId, tenantId);

    const integration = this.mcpRepo.create({
      agentId,
      type: dto.type,
      config: dto.config ?? {},
      encryptedSecrets: dto.secrets
        ? encryptSecret(JSON.stringify(dto.secrets))
        : null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.mcpRepo.save(integration);
    return this.sanitize(saved);
  }

  async update(agentId: string, id: string, dto: UpdateMcpIntegrationDto, tenantId: string | null) {
    await this.ensureAgent(agentId, tenantId);
    const integration = await this.mcpRepo.findOne({ where: { id, agentId } });
    if (!integration) return null;

    if (dto.config !== undefined) integration.config = dto.config;
    if (dto.secrets !== undefined) {
      integration.encryptedSecrets = dto.secrets
        ? encryptSecret(JSON.stringify(dto.secrets))
        : null;
    }
    if (dto.isActive !== undefined) integration.isActive = dto.isActive;

    const saved = await this.mcpRepo.save(integration);
    return this.sanitize(saved);
  }

  async remove(agentId: string, id: string, tenantId: string | null) {
    await this.ensureAgent(agentId, tenantId);
    const integration = await this.mcpRepo.findOne({ where: { id, agentId } });
    if (!integration) return null;
    await this.mcpRepo.remove(integration);
    return true;
  }

  /** Load raw integrations with decrypted secrets (for internal use by tool router). */
  async loadForAgent(agentId: string) {
    const integrations = await this.mcpRepo.find({
      where: { agentId, isActive: true },
    });
    return integrations.map((i) => ({
      type: i.type,
      config: i.config,
      secrets: this.decryptSecrets(i.encryptedSecrets),
      isActive: i.isActive,
    }));
  }

  private decryptSecrets(encrypted: string | null): Record<string, string> {
    if (!encrypted) return {};
    try {
      return JSON.parse(decryptSecret(encrypted));
    } catch {
      return {};
    }
  }

  /** Returns a safe version of the integration without exposing secrets. */
  private sanitize(i: McpIntegration) {
    const secretsMask = i.encryptedSecrets ? maskSecret(i.encryptedSecrets) : { hasValue: false, hint: null };
    return {
      id: i.id,
      agentId: i.agentId,
      type: i.type,
      config: i.config,
      hasSecrets: secretsMask.hasValue,
      isActive: i.isActive,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }
}
