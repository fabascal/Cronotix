import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { In } from 'typeorm';
import { Agent } from '../../database/entities/agent.entity';
import { Skill } from '../../database/entities/skill.entity';
import { AgentFunction } from '../../database/entities/agent-function.entity';
import { AgentDocument } from '../../database/entities/agent-document.entity';
import { Document } from '../../database/entities/document.entity';
import { LlmModelTemplate } from '../../database/entities/llm-model-template.entity';
import type { LlmProviderId } from '../../database/entities/llm-provider-config.entity';
import { LlmConfigService } from '../llm-config/llm-config.service';
import { encryptSecret, decryptSecret } from '../../common/crypto/aes-gcm';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { ChatAgentDto, ChatMessageDto } from './dto/chat-agent.dto';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';
import { McpRouterService } from '../mcp/mcp-router.service';
import type { McpIntegrationData } from '../mcp/mcp-router.service';
import { McpCrudService } from '../mcp/mcp-crud.service';

const GEMINI_EMBED_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const RAG_TOP_K = 5;
const RAG_MIN_SIMILARITY = 0.3;

const MAX_TOOL_ITERATIONS = 5;

interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolDef {
  type: 'function';
  function: { name: string; description: string | null; parameters: Record<string, unknown> };
}

const LEGACY_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]);

const LEGACY_MODEL_PROVIDER: Record<string, LlmProviderId> = {
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'gemini-1.5-pro': 'gemini',
  'gemini-1.5-flash': 'gemini',
};

const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';

@Injectable()
export class AgentsCrudService {
  private readonly logger = new Logger(AgentsCrudService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(AgentFunction)
    private readonly fnRepo: Repository<AgentFunction>,
    @InjectRepository(AgentDocument)
    private readonly agentDocRepo: Repository<AgentDocument>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(LlmModelTemplate)
    private readonly modelRepo: Repository<LlmModelTemplate>,
    private readonly llmConfigService: LlmConfigService,
    private readonly mcpRouter: McpRouterService,
    private readonly mcpCrud: McpCrudService,
    private readonly dataSource: DataSource,
  ) {}

  findAll(tenantId: string | null) {
    return this.agentRepo.find({
      where: tenantId ? { tenantId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateAgentDto, tenantId: string | null) {
    const llmModel = await this.resolveModelRef(dto.llmModel, tenantId);
    const agent = this.agentRepo.create({
      ...dto,
      llmModel,
      tenantId,
      status: dto.status ?? 'inactivo',
    });
    return this.agentRepo.save(agent);
  }

  findOne(id: string, tenantId: string | null) {
    return this.agentRepo.findOne({
      where: tenantId ? { id, tenantId } : { id },
    });
  }

  async update(id: string, dto: UpdateAgentDto, tenantId: string | null) {
    const agent = await this.findOne(id, tenantId);
    if (!agent) return null;
    Object.assign(agent, dto);
    if (dto.llmModel !== undefined) {
      agent.llmModel = await this.resolveModelRef(dto.llmModel, tenantId);
    }
    return this.agentRepo.save(agent);
  }

  async remove(id: string, tenantId: string | null) {
    const agent = await this.findOne(id, tenantId);
    if (!agent) return null;
    await this.agentRepo.remove(agent);
    return true;
  }

  // ─── Agent Skills ───────────────────────────────────────────────────────────

  async getAgentSkills(agentId: string, tenantId: string | null): Promise<Skill[]> {
    const agent = await this.agentRepo.findOne({
      where: tenantId ? { id: agentId, tenantId } : { id: agentId },
      relations: ['skills'],
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return agent.skills ?? [];
  }

  async assignSkills(agentId: string, skillIds: string[], tenantId: string | null): Promise<Skill[]> {
    const agent = await this.agentRepo.findOne({
      where: tenantId ? { id: agentId, tenantId } : { id: agentId },
      relations: ['skills'],
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');

    if (skillIds.length === 0) {
      agent.skills = [];
    } else {
      const skills = await this.skillRepo.find({ where: { id: In(skillIds) } });
      agent.skills = skills;
    }

    await this.agentRepo.save(agent);
    return agent.skills;
  }

  // ─── Agent Functions (CRUD) ────────────────────────────────────────────────

  async getAgentFunctions(agentId: string, tenantId: string | null): Promise<AgentFunction[]> {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');
    return this.fnRepo.find({ where: { agentId }, order: { createdAt: 'ASC' } });
  }

  async createFunction(agentId: string, dto: CreateFunctionDto, tenantId: string | null) {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const fn = this.fnRepo.create({
      agentId,
      name: dto.name,
      description: dto.description ?? null,
      parameters: dto.parameters,
      webhookUrl: dto.webhookUrl,
      webhookMethod: dto.webhookMethod ?? 'POST',
      webhookHeaders: dto.webhookHeaders
        ? encryptSecret(JSON.stringify(dto.webhookHeaders))
        : null,
      timeoutMs: dto.timeoutMs ?? 10000,
    });
    return this.fnRepo.save(fn);
  }

  async updateFunction(agentId: string, fnId: string, dto: UpdateFunctionDto, tenantId: string | null) {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const fn = await this.fnRepo.findOne({ where: { id: fnId, agentId } });
    if (!fn) throw new NotFoundException('Función no encontrada');

    if (dto.name !== undefined) fn.name = dto.name;
    if (dto.description !== undefined) fn.description = dto.description ?? null;
    if (dto.parameters !== undefined) fn.parameters = dto.parameters;
    if (dto.webhookUrl !== undefined) fn.webhookUrl = dto.webhookUrl;
    if (dto.webhookMethod !== undefined) fn.webhookMethod = dto.webhookMethod;
    if (dto.webhookHeaders !== undefined) {
      fn.webhookHeaders = dto.webhookHeaders
        ? encryptSecret(JSON.stringify(dto.webhookHeaders))
        : null;
    }
    if (dto.timeoutMs !== undefined) fn.timeoutMs = dto.timeoutMs;
    if (dto.isActive !== undefined) fn.isActive = dto.isActive;

    return this.fnRepo.save(fn);
  }

  async removeFunction(agentId: string, fnId: string, tenantId: string | null) {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const fn = await this.fnRepo.findOne({ where: { id: fnId, agentId } });
    if (!fn) throw new NotFoundException('Función no encontrada');
    await this.fnRepo.remove(fn);
    return true;
  }

  // ─── Agent Documents ─────────────────────────────────────────────────────

  async getAgentDocuments(agentId: string, tenantId: string | null): Promise<Document[]> {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const links = await this.agentDocRepo.find({
      where: { agentId },
      relations: ['document'],
      order: { createdAt: 'ASC' },
    });
    return links.map((l) => l.document);
  }

  async assignDocuments(
    agentId: string,
    documentIds: string[],
    tenantId: string | null,
  ): Promise<Document[]> {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    if (documentIds.length === 0) {
      await this.agentDocRepo.delete({ agentId });
      return [];
    }

    const docs = await this.documentRepo.find({
      where: { id: In(documentIds), ...(tenantId ? { tenantId } : {}) },
    });
    if (docs.length !== documentIds.length) {
      throw new BadRequestException('Uno o más documentos no encontrados o no pertenecen a este tenant.');
    }

    await this.agentDocRepo.delete({ agentId });

    const links = documentIds.map((docId) =>
      this.agentDocRepo.create({ agentId, documentId: docId }),
    );
    await this.agentDocRepo.save(links);

    return this.getAgentDocuments(agentId, tenantId);
  }

  async removeDocument(agentId: string, documentId: string, tenantId: string | null): Promise<boolean> {
    const agent = await this.findOne(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const link = await this.agentDocRepo.findOne({ where: { agentId, documentId } });
    if (!link) throw new NotFoundException('Documento no asignado a este agente');

    await this.agentDocRepo.remove(link);
    return true;
  }

  // ─── RAG: Vector Search ─────────────────────────────────────────────────

  private async getAgentDocumentIds(agentId: string): Promise<string[]> {
    const links = await this.agentDocRepo.find({
      where: { agentId },
      select: ['documentId'],
    });
    return links.map((l) => l.documentId);
  }

  private async embedQuery(text: string, tenantId: string): Promise<number[]> {
    const cfg = await this.llmConfigService.getProviderRawConfig(tenantId, 'gemini');
    if (!cfg.enabled || !cfg.apiKey) {
      this.logger.warn('Gemini not configured for embeddings — skipping RAG');
      return [];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(cfg.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { embedding?: { values?: number[] } };
    return json.embedding?.values ?? [];
  }

  private async retrieveContext(
    agentId: string,
    query: string,
    tenantId: string,
  ): Promise<string> {
    const docIds = await this.getAgentDocumentIds(agentId);
    if (docIds.length === 0) return '';

    const embedding = await this.embedQuery(query, tenantId);
    if (embedding.length === 0) return '';

    const vectorLiteral = `[${embedding.join(',')}]`;
    const rows = await this.dataSource.query(
      `SELECT content, 1 - (embedding <=> $1::vector) AS similarity
       FROM document_chunks
       WHERE document_id = ANY($2)
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorLiteral, docIds, RAG_TOP_K],
    ) as Array<{ content: string; similarity: number }>;

    const relevant = rows.filter((r) => r.similarity >= RAG_MIN_SIMILARITY);
    if (relevant.length === 0) return '';

    return (
      '\n\n--- CONTEXTO DE DOCUMENTOS ---\n' +
      relevant.map((r, i) => `[Fragmento ${i + 1}] (similitud: ${r.similarity.toFixed(3)})\n${r.content}`).join('\n\n') +
      '\n--- FIN DEL CONTEXTO ---'
    );
  }

  // ─── Tool Helpers ─────────────────────────────────────────────────────────

  private buildToolsArray(functions: AgentFunction[]): ToolDef[] {
    return (functions ?? [])
      .filter((f) => f.isActive)
      .map((f) => ({
        type: 'function' as const,
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        },
      }));
  }

  private buildGeminiTools(tools: ToolDef[]): Array<{ functionDeclarations: unknown[] }> | undefined {
    if (tools.length === 0) return undefined;
    return [{
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description ?? '',
        parameters: t.function.parameters,
      })),
    }];
  }

  private async executeToolCall(
    name: string,
    args: Record<string, unknown>,
    agentFunctions: AgentFunction[],
    mcpIntegrations?: McpIntegrationData[],
  ): Promise<string> {
    // Route MCP tools to the MCP router
    if (this.mcpRouter.isMcpTool(name) && mcpIntegrations) {
      return this.mcpRouter.execute(name, args, mcpIntegrations);
    }

    const fn = agentFunctions.find((f) => f.name === name && f.isActive);
    if (!fn) return JSON.stringify({ error: `Función "${name}" no encontrada o desactivada` });

    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (fn.webhookHeaders) {
        try {
          const dec = JSON.parse(decryptSecret(fn.webhookHeaders)) as Record<string, string>;
          headers = { ...headers, ...dec };
        } catch {
          this.logger.warn(`Failed to decrypt headers for function ${name}`);
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), fn.timeoutMs);

      let resolvedUrl = fn.webhookUrl;
      const usedInPath = new Set<string>();
      for (const [key, val] of Object.entries(args)) {
        const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        if (pattern.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl.replace(pattern, encodeURIComponent(String(val)));
          usedInPath.add(key);
        }
      }

      const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(fn.webhookMethod);
      const remainingArgs = Object.entries(args).filter(([k]) => !usedInPath.has(k));
      const url = isBodyMethod
        ? resolvedUrl
        : remainingArgs.length > 0
          ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}${new URLSearchParams(
              remainingArgs.map(([k, v]) => [k, String(v)]),
            ).toString()}`
          : resolvedUrl;

      const res = await fetch(url, {
        method: fn.webhookMethod,
        headers,
        ...(isBodyMethod ? { body: JSON.stringify(args) } : {}),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const MAX_TOOL_RESPONSE = 2000;
      const text = await res.text();
      if (!res.ok) {
        return JSON.stringify({ error: `HTTP ${res.status}`, body: text.slice(0, 500) });
      }

      const needsTruncation = text.length > MAX_TOOL_RESPONSE;
      const truncated = needsTruncation ? text.slice(0, MAX_TOOL_RESPONSE) : text;
      try {
        if (!needsTruncation) {
          JSON.parse(truncated);
          return truncated;
        }
        return JSON.stringify({ result: truncated, truncated: true });
      } catch {
        return JSON.stringify({ result: truncated });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg.includes('abort')) {
        return JSON.stringify({ error: `Timeout después de ${fn.timeoutMs}ms` });
      }
      return JSON.stringify({ error: msg });
    }
  }

  // ─── Description / System Prompt Generation ───────────────────────────────

  async generateDescription(
    dto: GenerateDescriptionDto,
    tenantId: string | null,
  ): Promise<{ description: string }> {
    if (!tenantId) {
      throw new BadRequestException(
        'Tu usuario no tiene un espacio de trabajo asignado.',
      );
    }

    const settings = await this.llmConfigService.getSettings(tenantId);
    const ollamaProvider = settings.providers.ollama;

    if (!ollamaProvider.enabled) {
      throw new BadRequestException(
        'Ollama no está habilitado. Ve a Configuración → Modelos IA y actívalo primero.',
      );
    }

    const ollamaModel = await this.resolveOllamaModel(tenantId);

    if (!ollamaModel) {
      throw new BadRequestException(
        'No hay ningún modelo de Ollama registrado. Ve a Configuración → Modelos IA, agrega un modelo Ollama y vuelve a intentarlo.',
      );
    }

    const baseUrl = (ollamaProvider.baseUrl || DEFAULT_OLLAMA)
      .trim()
      .replace(/\/$/, '');

    const purposeMap: Record<string, string> = {
      resumir: 'resumir documentos',
      extraer: 'extraer datos estructurados',
      clasificar: 'clasificar y categorizar documentos',
      responder: 'responder preguntas sobre documentos',
      otro: 'procesar documentos',
    };
    const toneMap: Record<string, string> = {
      formal: 'formal y profesional',
      técnico: 'técnico y preciso',
      amigable: 'amigable y accesible',
      neutro: 'neutro y objetivo',
    };

    const purposeText = purposeMap[dto.purpose] ?? dto.purpose;
    const toneText = toneMap[dto.tone] ?? dto.tone;
    const capabilitiesText = dto.capabilities?.trim()
      ? ` Documentos o acciones específicas: ${dto.capabilities.trim()}.`
      : '';

    const prompt =
      `Genera una descripción concisa (máximo 2 oraciones, en español) para un agente de IA con las siguientes características:\n` +
      `- Tarea principal: ${purposeText}\n` +
      `- Dominio/Industria: ${dto.domain}\n` +
      `- Tono: ${toneText}\n` +
      (capabilitiesText ? `- ${capabilitiesText}\n` : '') +
      `\nResponde ÚNICAMENTE con la descripción, sin prefijos, listas ni explicaciones adicionales.`;

    const generationSystem = await this.loadGenerationSkills(tenantId, 'generacion-descripcion');

    const ollamaRes = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel.modelId,
        prompt,
        ...(generationSystem ? { system: generationSystem } : {}),
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      const txt = await ollamaRes.text();
      this.logger.warn(`Ollama generate error ${ollamaRes.status}: ${txt.slice(0, 200)}`);
      throw new BadRequestException(
        `Ollama respondió con error ${ollamaRes.status}. Verifica que el modelo "${ollamaModel.modelId}" esté descargado.`,
      );
    }

    const data = (await ollamaRes.json()) as { response?: string };
    const description = this.stripThinkTags((data.response ?? '').trim());

    if (!description) {
      throw new BadRequestException(
        'Ollama devolvió una respuesta vacía. Intenta de nuevo.',
      );
    }

    return { description };
  }

  async generateSystemPrompt(
    dto: GenerateDescriptionDto,
    tenantId: string | null,
  ): Promise<{ systemPrompt: string }> {
    if (!tenantId) {
      throw new BadRequestException(
        'Tu usuario no tiene un espacio de trabajo asignado.',
      );
    }

    const settings = await this.llmConfigService.getSettings(tenantId);
    const ollamaProvider = settings.providers.ollama;

    if (!ollamaProvider.enabled) {
      throw new BadRequestException(
        'Ollama no está habilitado. Ve a Configuración → Modelos IA y actívalo primero.',
      );
    }

    const ollamaModel = await this.resolveOllamaModel(tenantId);

    if (!ollamaModel) {
      throw new BadRequestException(
        'No hay ningún modelo de Ollama registrado. Ve a Configuración → Modelos IA, agrega un modelo Ollama y vuelve a intentarlo.',
      );
    }

    const baseUrl = (ollamaProvider.baseUrl || DEFAULT_OLLAMA)
      .trim()
      .replace(/\/$/, '');

    const purposeMap: Record<string, string> = {
      resumir: 'resumir y sintetizar documentos',
      extraer: 'extraer datos estructurados en formato JSON',
      clasificar: 'clasificar y categorizar documentos',
      responder: 'responder preguntas sobre documentos',
      otro: 'procesar documentos de forma personalizada',
    };
    const toneMap: Record<string, string> = {
      formal: 'formal y profesional',
      técnico: 'técnico y preciso',
      amigable: 'amigable y accesible',
      neutro: 'neutro y objetivo',
    };

    const purposeText = purposeMap[dto.purpose] ?? dto.purpose;
    const toneText = toneMap[dto.tone] ?? dto.tone;
    const restrictionsText = dto.capabilities?.trim()
      ? `\n- Restricciones o comportamientos específicos: ${dto.capabilities.trim()}.`
      : '';

    const prompt =
      `Genera un system prompt completo en español para un agente de IA con las siguientes características:\n` +
      `- Función principal: ${purposeText}\n` +
      `- Dominio/Industria: ${dto.domain}\n` +
      `- Tono de comunicación: ${toneText}\n` +
      restrictionsText +
      `\n\nEl system prompt debe:\n` +
      `1. Comenzar con "Eres un agente especializado en..."\n` +
      `2. Describir claramente la función y el dominio\n` +
      `3. Indicar el tono y estilo de comunicación\n` +
      `4. Incluir instrucciones sobre el formato de respuesta esperado\n` +
      `5. Tener entre 3 y 6 oraciones\n` +
      `\nResponde ÚNICAMENTE con el system prompt, sin prefijos ni explicaciones adicionales.`;

    const generationSystem = await this.loadGenerationSkills(tenantId, 'generacion-prompt');

    const ollamaRes = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel.modelId,
        prompt,
        ...(generationSystem ? { system: generationSystem } : {}),
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      const txt = await ollamaRes.text();
      this.logger.warn(
        `Ollama generate-system-prompt error ${ollamaRes.status}: ${txt.slice(0, 200)}`,
      );
      throw new BadRequestException(
        `Ollama respondió con error ${ollamaRes.status}. Verifica que el modelo "${ollamaModel.modelId}" esté descargado.`,
      );
    }

    const data = (await ollamaRes.json()) as { response?: string };
    const systemPrompt = this.stripThinkTags((data.response ?? '').trim());

    if (!systemPrompt) {
      throw new BadRequestException(
        'Ollama devolvió una respuesta vacía. Intenta de nuevo.',
      );
    }

    return { systemPrompt };
  }

  /**
   * Returns the Ollama model designated as system model (isSystemModel=true in extra),
   * or falls back to the first enabled Ollama model by creation date.
   */
  private async resolveOllamaModel(
    tenantId: string,
  ): Promise<LlmModelTemplate | null> {
    const systemModel = await this.modelRepo
      .createQueryBuilder('m')
      .where('m.tenantId = :tid', { tid: tenantId })
      .andWhere("m.provider = 'ollama'")
      .andWhere('m.enabled = true')
      .andWhere("m.extra @> :flag", { flag: JSON.stringify({ isSystemModel: true }) })
      .select(['m.modelId', 'm.id'])
      .getOne();

    if (systemModel) return systemModel;

    return this.modelRepo.findOne({
      where: { tenantId, provider: 'ollama', enabled: true },
      order: { createdAt: 'ASC' },
      select: ['modelId', 'id'],
    });
  }

  private async resolveModelRef(
    rawModel: string,
    tenantId: string | null,
  ): Promise<string> {
    const llmModel = rawModel.trim();
    if (!llmModel) {
      throw new BadRequestException('llmModel es requerido');
    }

    if (!tenantId || LEGACY_MODELS.has(llmModel)) {
      return llmModel;
    }

    const template = await this.modelRepo.findOne({
      where: [
        { tenantId, acronym: llmModel },
        { tenantId, enabled: true, modelId: llmModel },
      ],
      select: ['acronym'],
    });

    if (!template) {
      throw new BadRequestException(
        `Modelo "${llmModel}" no está registrado. Ve a Modelos IA, valida el proveedor y crea el template.`,
      );
    }

    return template.acronym;
  }

  /**
   * Resolves an agent's stored llmModel (acronym or legacy id) to
   * { provider, modelId } for inference calls.
   */
  private async resolveModelToProvider(
    llmModel: string,
    tenantId: string | null,
  ): Promise<{ provider: LlmProviderId; modelId: string }> {
    if (LEGACY_MODELS.has(llmModel)) {
      return { provider: LEGACY_MODEL_PROVIDER[llmModel], modelId: llmModel };
    }

    if (!tenantId) {
      throw new BadRequestException('No se puede resolver el modelo sin un espacio de trabajo.');
    }

    const template = await this.modelRepo.findOne({
      where: { tenantId, acronym: llmModel },
      select: ['provider', 'modelId'],
    });

    if (!template) {
      throw new BadRequestException(
        `No se encontró el modelo "${llmModel}" en la configuración. Ve a Modelos IA para verificarlo.`,
      );
    }

    return { provider: template.provider, modelId: template.modelId };
  }

  // ─── Chat / Playground ────────────────────────────────────────────────────

  /** Load agent with skills and functions for chat. */
  private findOneWithSkills(agentId: string, tenantId: string | null) {
    return this.agentRepo.findOne({
      where: tenantId ? { id: agentId, tenantId } : { id: agentId },
      relations: ['skills', 'functions'],
    });
  }

  /** Build the full system prompt by prepending active skill instructions. */
  private buildSystemPromptWithSkills(basePrompt: string, skills: Skill[]): string {
    const skillInstructions = (skills ?? [])
      .filter((s) => s.isActive)
      .map((s) => s.prompt)
      .join('\n\n');
    return [skillInstructions, basePrompt].filter(Boolean).join('\n\n');
  }

  /**
   * One-shot LLM call for schedules: applies agent skills + system prompt (+ optional RAG),
   * no tools. Used to turn webhook JSON into natural-language output.
   */
  async processWithLlm(
    agentId: string,
    _tenantId: string | null,
    userMessage: string,
  ): Promise<string> {
    // Find agent by id only — schedules run server-side, tenant scoping not required.
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['skills'],
    });
    if (!agent) throw new NotFoundException(`Agente ${agentId} no encontrado`);

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const basePrompt = ((config['systemPrompt'] as string | undefined) ?? '').trim();
    let systemPrompt = this.buildSystemPromptWithSkills(basePrompt, agent.skills);
    const temperature = (config['temperature'] as number | undefined) ?? 0.7;
    const maxTokens = (config['maxTokens'] as number | undefined) ?? 2048;

    // Resolve model and the tenantId to use for provider config (API key lookup).
    let resolved: { provider: LlmProviderId; modelId: string };
    let configTenantId: string | null = agent.tenantId;

    if (LEGACY_MODELS.has(agent.llmModel)) {
      resolved = { provider: LEGACY_MODEL_PROVIDER[agent.llmModel], modelId: agent.llmModel };
    } else {
      // Find template by acronym; also capture its tenantId for API key resolution.
      const template = await this.modelRepo.findOne({
        where: { acronym: agent.llmModel },
        select: ['provider', 'modelId', 'tenantId'],
      });
      if (!template) {
        throw new BadRequestException(
          `Modelo "${agent.llmModel}" no encontrado en plantillas. Verifica la configuración de Modelos IA.`,
        );
      }
      resolved = { provider: template.provider, modelId: template.modelId };
      configTenantId = template.tenantId ?? agent.tenantId;
    }
    const { provider, modelId } = resolved;

    // RAG optional — use agent.tenantId if available.
    const ragTenantId = agent.tenantId;
    if (ragTenantId) {
      const ragContext = await this.retrieveContext(agentId, userMessage, ragTenantId);
      if (ragContext) systemPrompt += ragContext;
    }

    const messages: Array<Record<string, unknown>> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    const raw = await this.chatWithTools(
      provider,
      modelId,
      messages,
      temperature,
      maxTokens,
      [],
      configTenantId,
    );

    if (raw.toolCalls?.length) {
      this.logger.warn(
        `processWithLlm: modelo solicitó herramientas (${raw.toolCalls.map((t) => t.name).join(', ')}) — ignoradas en schedule`,
      );
    }

    return this.stripThinkTags(raw.message);
  }

  /** Load active skills by category (global + tenant-scoped) for generation endpoints. */
  private async loadGenerationSkills(tenantId: string, category: string): Promise<string> {
    const skills = await this.skillRepo
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .andWhere('s.category = :cat', { cat: category })
      .andWhere('(s.isGlobal = true OR s.tenantId = :tid)', { tid: tenantId })
      .orderBy('s.isGlobal', 'DESC')
      .getMany();
    return skills.map(s => s.prompt).filter(Boolean).join('\n\n');
  }

  async chat(
    agentId: string,
    dto: ChatAgentDto,
    tenantId: string | null,
    effectiveTenantId: string | null = tenantId,
  ): Promise<{ message: string; model: string; provider: string; usage?: Record<string, number>; toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result: string }> }> {
    const agent = await this.findOneWithSkills(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const basePrompt =
      (dto.systemPrompt ?? (config['systemPrompt'] as string | undefined) ?? '').trim();
    let systemPrompt = this.buildSystemPromptWithSkills(basePrompt, agent.skills);
    const temperature = dto.temperature ?? (config['temperature'] as number | undefined) ?? 0.7;
    const maxTokens = dto.maxTokens ?? (config['maxTokens'] as number | undefined) ?? 2048;

    // RAG: retrieve relevant document context
    if (effectiveTenantId) {
      const ragContext = await this.retrieveContext(agentId, dto.message, effectiveTenantId);
      if (ragContext) systemPrompt += ragContext;
    }

    const { provider, modelId } = await this.resolveModelToProvider(agent.llmModel, effectiveTenantId);

    const webhookTools = this.buildToolsArray(agent.functions ?? []);
    const mcpIntegrations = await this.mcpCrud.loadForAgent(agentId);
    const mcpToolDefs = this.mcpRouter.getToolsForIntegrations(mcpIntegrations);
    const mcpTools: ToolDef[] = mcpToolDefs.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const tools = [...webhookTools, ...mcpTools];

    const history: ChatMessageDto[] = dto.history ?? [];
    const messages: Array<Record<string, unknown>> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const m of history) messages.push({ role: m.role, content: m.content });
    messages.push({ role: 'user', content: dto.message });

    const collectedToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result: string }> = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const raw = await this.chatWithTools(provider, modelId, messages, temperature, maxTokens, tools, effectiveTenantId);

      if (!raw.toolCalls || raw.toolCalls.length === 0) {
        return {
          message: this.stripThinkTags(raw.message),
          model: modelId,
          provider,
          usage: raw.usage,
          ...(collectedToolCalls.length > 0 ? { toolCalls: collectedToolCalls } : {}),
        };
      }

      messages.push(raw.assistantMessage);

      for (const tc of raw.toolCalls) {
        const result = await this.executeToolCall(tc.name, tc.arguments, agent.functions ?? [], mcpIntegrations);
        collectedToolCalls.push({ name: tc.name, arguments: tc.arguments, result });

        if (provider === 'gemini') {
          let parsed: unknown;
          try { parsed = JSON.parse(result); } catch { parsed = { text: result }; }
          messages.push({
            role: 'function',
            parts: [{ functionResponse: { name: tc.name, response: parsed } }],
          });
        } else {
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
      }
    }

    return {
      message: 'Se alcanzó el límite de iteraciones de herramientas.',
      model: modelId,
      provider,
      ...(collectedToolCalls.length > 0 ? { toolCalls: collectedToolCalls } : {}),
    };
  }

  /** Unified chat call that returns raw tool calls if the model requests them. */
  private async chatWithTools(
    provider: string,
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tools: ToolDef[],
    tenantId: string | null,
  ): Promise<{
    message: string;
    toolCalls: ToolCallResult[] | null;
    assistantMessage: Record<string, unknown>;
    usage?: Record<string, number>;
  }> {
    switch (provider) {
      case 'ollama':
        return this.chatOllamaWithTools(modelId, messages, temperature, maxTokens, tools, tenantId as string);
      case 'openai':
        return this.chatOpenAiWithTools(modelId, messages, temperature, maxTokens, tools, tenantId);
      case 'gemini':
        return this.chatGeminiWithTools(modelId, messages, temperature, maxTokens, tools, tenantId);
      default:
        throw new BadRequestException(`Proveedor desconocido: ${provider}`);
    }
  }

  /** Remove <think>…</think> reasoning blocks produced by models like DeepSeek-R1. */
  private stripThinkTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  // ─── Provider Chat with Tools ──────────────────────────────────────────────

  private async chatOllamaWithTools(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tools: ToolDef[],
    tenantId: string,
  ) {
    const settings = await this.llmConfigService.getSettings(tenantId);
    const ollamaCfg = settings.providers.ollama;
    if (!ollamaCfg.enabled) {
      throw new BadRequestException('Ollama no está habilitado. Actívalo en Configuración → Modelos IA.');
    }

    const baseUrl = ((ollamaCfg.baseUrl as string | undefined) || DEFAULT_OLLAMA).trim().replace(/\/$/, '');

    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      stream: false,
      options: { temperature, num_predict: maxTokens },
    };
    if (tools.length > 0) body.tools = tools;

    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 120_000);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortCtrl.signal,
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Error de red';
      if (msg.includes('abort') || msg.includes('AbortError')) {
        throw new BadRequestException(`Ollama tardó demasiado (>120 s). El modelo "${modelId}" puede estar sobrecargado o no disponible.`);
      }
      throw new BadRequestException(`Error al conectar con Ollama: ${msg}`);
    } finally {
      clearTimeout(abortTimer);
    }

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`Ollama /api/chat error ${res.status}: ${txt.slice(0, 200)}`);
      const toolsHint =
        tools.length > 0 && res.status === 400
          ? ` El modelo "${modelId}" puede no soportar function calling (herramientas). Prueba con un modelo compatible como llama3, qwen2.5 o mistral.`
          : ` Verifica que el modelo "${modelId}" esté descargado.`;
      throw new BadRequestException(`Ollama respondió con error ${res.status}.${toolsHint}`);
    }

    const data = (await res.json()) as {
      message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const tcRaw = data.message?.tool_calls;
    const toolCalls: ToolCallResult[] | null =
      tcRaw && tcRaw.length > 0
        ? tcRaw.map((tc, i) => ({ id: `ollama_${i}`, name: tc.function.name, arguments: tc.function.arguments }))
        : null;

    return {
      message: (data.message?.content ?? '').trim(),
      toolCalls,
      assistantMessage: data.message as Record<string, unknown>,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }

  private async chatOpenAiWithTools(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tools: ToolDef[],
    tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Se requiere espacio de trabajo para OpenAI.');

    const cfg = await this.llmConfigService.getProviderRawConfig(tenantId, 'openai');
    if (!cfg.enabled) throw new BadRequestException('OpenAI no está habilitado. Actívalo en Configuración → Modelos IA.');
    if (!cfg.apiKey) throw new BadRequestException('No hay una clave de API de OpenAI configurada.');

    const baseUrl = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');

    const body: Record<string, unknown> = { model: modelId, messages, temperature, max_completion_tokens: maxTokens };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`OpenAI chat error ${res.status}: ${txt.slice(0, 300)}`);
      throw new BadRequestException(`OpenAI respondió con error ${res.status}. Verifica tu clave de API y el modelo.`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const msg = data.choices?.[0]?.message;
    const tcRaw = msg?.tool_calls;
    const toolCalls: ToolCallResult[] | null =
      tcRaw && tcRaw.length > 0
        ? tcRaw.map((tc) => {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
            return { id: tc.id, name: tc.function.name, arguments: args };
          })
        : null;

    return {
      message: (msg?.content ?? '').trim(),
      toolCalls,
      assistantMessage: msg as Record<string, unknown>,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  private async chatGeminiWithTools(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tools: ToolDef[],
    tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Se requiere espacio de trabajo para Gemini.');

    const cfg = await this.llmConfigService.getProviderRawConfig(tenantId, 'gemini');
    if (!cfg.enabled) throw new BadRequestException('Gemini no está habilitado. Actívalo en Configuración → Modelos IA.');
    if (!cfg.apiKey) throw new BadRequestException('No hay una clave de API de Gemini configurada.');

    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');
    const contents = conversationMsgs.map((m) => {
      const parts = m.parts ?? [{ text: m.content as string }];
      return { role: m.role === 'assistant' ? 'model' : (m.role === 'function' ? 'function' : 'user'), parts };
    });

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (systemMsg) body['system_instruction'] = { parts: [{ text: systemMsg.content }] };
    const geminiTools = this.buildGeminiTools(tools);
    if (geminiTools) body.tools = geminiTools;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`Gemini chat error ${res.status}: ${txt.slice(0, 300)}`);
      throw new BadRequestException(`Gemini respondió con error ${res.status}. Verifica tu clave de API y el modelo.`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const textParts = parts.filter((p) => p.text).map((p) => p.text).join('');
    const fnCalls = parts.filter((p) => p.functionCall);
    const toolCalls: ToolCallResult[] | null =
      fnCalls.length > 0
        ? fnCalls.map((p, i) => ({ id: `gemini_${i}`, name: p.functionCall!.name, arguments: p.functionCall!.args }))
        : null;

    return {
      message: textParts.trim(),
      toolCalls,
      assistantMessage: { role: 'model', parts },
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  // ─── Streaming Chat / Playground ──────────────────────────────────────────

  /**
   * Streaming chat with tool loop support.
   * Yields JSON strings. Regular text chunks: { chunk: "..." }
   * Tool events: { toolCall: { name, arguments } } and { toolResult: { name, result } }
   */
  async *chatStream(
    agentId: string,
    dto: ChatAgentDto,
    tenantId: string | null,
    effectiveTenantId: string | null = tenantId,
  ): AsyncGenerator<string> {
    const agent = await this.findOneWithSkills(agentId, tenantId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    const config = (agent.config ?? {}) as Record<string, unknown>;
    const basePrompt =
      (dto.systemPrompt ?? (config['systemPrompt'] as string | undefined) ?? '').trim();
    let systemPrompt = this.buildSystemPromptWithSkills(basePrompt, agent.skills);
    const temperature = dto.temperature ?? (config['temperature'] as number | undefined) ?? 0.7;
    const maxTokens = dto.maxTokens ?? (config['maxTokens'] as number | undefined) ?? 2048;

    // RAG: retrieve relevant document context
    if (effectiveTenantId) {
      const ragContext = await this.retrieveContext(agentId, dto.message, effectiveTenantId);
      if (ragContext) systemPrompt += ragContext;
    }

    const { provider, modelId } = await this.resolveModelToProvider(agent.llmModel, effectiveTenantId);

    const webhookTools = this.buildToolsArray(agent.functions ?? []);
    const mcpIntegrations = await this.mcpCrud.loadForAgent(agentId);
    const mcpToolDefs = this.mcpRouter.getToolsForIntegrations(mcpIntegrations);
    const mcpTools: ToolDef[] = mcpToolDefs.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const tools = [...webhookTools, ...mcpTools];

    let effectiveSystemPrompt = systemPrompt;
    if (tools.length > 0 && effectiveSystemPrompt) {
      effectiveSystemPrompt +=
        '\n\nIMPORTANTE: Solo usa las herramientas disponibles cuando el usuario lo solicite explícitamente. ' +
        'Si el usuario saluda o hace preguntas generales, responde de forma conversacional sin invocar herramientas.';
    }

    const history: ChatMessageDto[] = dto.history ?? [];
    const messages: Array<Record<string, unknown>> = [];
    if (effectiveSystemPrompt) messages.push({ role: 'system', content: effectiveSystemPrompt });
    for (const m of history) messages.push({ role: m.role, content: m.content });
    messages.push({ role: 'user', content: dto.message });

    if (tools.length === 0) {
      const raw = this.streamByProvider(provider, modelId, messages, temperature, maxTokens, effectiveTenantId);
      yield* this.filterThinkTagsStream(raw);
      return;
    }

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const raw = await this.chatWithTools(provider, modelId, messages, temperature, maxTokens, tools, effectiveTenantId);

      if (!raw.toolCalls || raw.toolCalls.length === 0) {
        // Final text response — yield word-by-word so the frontend renders
        // progressively instead of receiving one large blob.
        const text = this.stripThinkTags(raw.message);
        if (text) yield* this.yieldInChunks(text);
        return;
      }

      messages.push(raw.assistantMessage);

      for (const tc of raw.toolCalls) {
        yield JSON.stringify({ toolCall: { name: tc.name, arguments: tc.arguments } });

        const result = await this.executeToolCall(tc.name, tc.arguments, agent.functions ?? [], mcpIntegrations);

        // Emit tool_result event
        yield JSON.stringify({ toolResult: { name: tc.name, result } });

        if (provider === 'gemini') {
          let parsed: unknown;
          try { parsed = JSON.parse(result); } catch { parsed = { text: result }; }
          messages.push({
            role: 'function',
            parts: [{ functionResponse: { name: tc.name, response: parsed } }],
          });
        } else {
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
      }
    }

    yield 'Se alcanzó el límite de iteraciones de herramientas.';
  }

  /** Yields text split into small word-level chunks to simulate token streaming. */
  private async *yieldInChunks(text: string): AsyncGenerator<string> {
    // Split on whitespace boundaries keeping the spaces attached to the preceding word
    const words = text.split(/(?<=\s)/);
    for (const word of words) {
      if (word) yield word;
    }
  }

  private streamByProvider(
    provider: string,
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tenantId: string | null,
  ): AsyncGenerator<string> {
    switch (provider) {
      case 'ollama':
        return this.streamOllama(modelId, messages, temperature, maxTokens, tenantId as string);
      case 'openai':
        return this.streamOpenAi(modelId, messages, temperature, maxTokens, tenantId);
      case 'gemini':
        return this.streamGemini(modelId, messages, temperature, maxTokens, tenantId);
      default:
        throw new BadRequestException(`Proveedor desconocido: ${provider}`);
    }
  }

  /**
   * Strips <think>…</think> reasoning blocks from a text stream.
   * Buffers content until </think> is found, then switches to passthrough mode.
   * Models like DeepSeek-R1 emit these blocks before the actual response.
   */
  private async *filterThinkTagsStream(source: AsyncGenerator<string>): AsyncGenerator<string> {
    let buffer = '';
    let inThink = false;
    let resolved = false;

    for await (const chunk of source) {
      if (resolved) {
        yield chunk;
        continue;
      }

      buffer += chunk;

      if (!inThink) {
        const stripped = buffer.trimStart();
        if (stripped.length === 0) continue;

        if (stripped.startsWith('<think>')) {
          inThink = true;
          const openIdx = buffer.indexOf('<think>');
          buffer = buffer.slice(openIdx + 7);
        } else {
          // No think block – switch to passthrough immediately
          yield buffer;
          buffer = '';
          resolved = true;
          continue;
        }
      }

      if (inThink) {
        const closeIdx = buffer.indexOf('</think>');
        if (closeIdx !== -1) {
          const after = buffer.slice(closeIdx + 8).trimStart();
          buffer = '';
          inThink = false;
          resolved = true;
          if (after) yield after;
        } else {
          // Discard buffered think content; keep a tail to detect partial closing tag
          const keep = Math.max(0, buffer.length - 8);
          buffer = buffer.slice(keep);
        }
      }
    }

    // Flush remaining buffer
    if (!inThink && buffer) yield buffer;
  }

  private async *streamOllama(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tenantId: string,
  ): AsyncGenerator<string> {
    const settings = await this.llmConfigService.getSettings(tenantId);
    const ollamaCfg = settings.providers.ollama;
    if (!ollamaCfg.enabled) {
      throw new BadRequestException(
        'Ollama no está habilitado. Actívalo en Configuración → Modelos IA.',
      );
    }

    const baseUrl = ((ollamaCfg.baseUrl as string | undefined) || DEFAULT_OLLAMA)
      .trim()
      .replace(/\/$/, '');

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
        options: { temperature, num_predict: maxTokens },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`Ollama /api/chat stream error ${res.status}: ${txt.slice(0, 200)}`);
      throw new BadRequestException(
        `Ollama respondió con error ${res.status}. Verifica que el modelo "${modelId}" esté descargado.`,
      );
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            if (data.message?.content) yield data.message.content;
            if (data.done) return;
          } catch {
            // skip malformed NDJSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamOpenAi(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tenantId: string | null,
  ): AsyncGenerator<string> {
    if (!tenantId) throw new BadRequestException('Se requiere espacio de trabajo para OpenAI.');

    const cfg = await this.llmConfigService.getProviderRawConfig(tenantId, 'openai');
    if (!cfg.enabled) {
      throw new BadRequestException('OpenAI no está habilitado. Actívalo en Configuración → Modelos IA.');
    }
    if (!cfg.apiKey) throw new BadRequestException('No hay una clave de API de OpenAI configurada.');

    const baseUrl = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`OpenAI chat stream error ${res.status}: ${txt.slice(0, 300)}`);
      throw new BadRequestException(
        `OpenAI respondió con error ${res.status}. Verifica tu clave de API y el modelo.`,
      );
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') return;
          try {
            const data = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = data.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip malformed SSE data lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamGemini(
    modelId: string,
    messages: Array<Record<string, unknown>>,
    temperature: number,
    maxTokens: number,
    tenantId: string | null,
  ): AsyncGenerator<string> {
    if (!tenantId) throw new BadRequestException('Se requiere espacio de trabajo para Gemini.');

    const cfg = await this.llmConfigService.getProviderRawConfig(tenantId, 'gemini');
    if (!cfg.enabled) {
      throw new BadRequestException('Gemini no está habilitado. Actívalo en Configuración → Modelos IA.');
    }
    if (!cfg.apiKey) throw new BadRequestException('No hay una clave de API de Gemini configurada.');

    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');
    const contents = conversationMsgs.map((m) => ({
      role: (m.role as string) === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content as string }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (systemMsg) body['system_instruction'] = { parts: [{ text: systemMsg.content }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${cfg.apiKey}&alt=sse`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      this.logger.warn(`Gemini chat stream error ${res.status}: ${txt.slice(0, 300)}`);
      throw new BadRequestException(
        `Gemini respondió con error ${res.status}. Verifica tu clave de API y el modelo.`,
      );
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6)) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // skip malformed SSE data lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
