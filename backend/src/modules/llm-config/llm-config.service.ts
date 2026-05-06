import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LlmProviderConfig,
  LlmProviderId,
} from '../../database/entities/llm-provider-config.entity';
import { LlmModelTemplate } from '../../database/entities/llm-model-template.entity';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isEncryptionConfigured,
} from '../../common/crypto/aes-gcm';
import { UpdateLlmSettingsDto } from './dto/update-llm-settings.dto';
import { TestLlmDto } from './dto/test-llm.dto';
import { CreateLlmModelDto } from './dto/create-llm-model.dto';

const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';
const PROVIDER_CODE: Record<LlmProviderId, string> = {
  openai: 'CO',
  gemini: 'CG',
  ollama: 'CL',
};

@Injectable()
export class LlmConfigService {
  private readonly logger = new Logger(LlmConfigService.name);

  constructor(
    @InjectRepository(LlmProviderConfig)
    private readonly repo: Repository<LlmProviderConfig>,
    @InjectRepository(LlmModelTemplate)
    private readonly modelRepo: Repository<LlmModelTemplate>,
    private readonly config: ConfigService,
  ) {}

  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException(
        'Tu usuario no tiene un espacio de trabajo asignado. No puedes configurar modelos.',
      );
    }
    return tenantId;
  }

  private async getRow(
    tenantId: string,
    provider: LlmProviderId,
  ): Promise<LlmProviderConfig | null> {
    return this.repo.findOne({
      where: { tenantId, provider },
      select: [
        'id',
        'tenantId',
        'provider',
        'enabled',
        'baseUrl',
        'apiKeyEncrypted',
        'extra',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  private decryptKey(enc: string | null): string | null {
    if (!enc) return null;
    try {
      return decryptSecret(enc);
    } catch (e) {
      this.logger.warn(`No se pudo descifrar clave: ${e}`);
      return null;
    }
  }

  async getSettings(tenantId: string | null) {
    if (!tenantId) {
      return {
        hasTenant: false,
        encryptionConfigured: isEncryptionConfigured(),
        providers: {
          openai: {
            enabled: false,
            baseUrl: null as string | null,
            hasValue: false,
            hint: null as string | null,
          },
          ollama: { enabled: false, baseUrl: DEFAULT_OLLAMA },
          gemini: {
            enabled: false,
            hasValue: false,
            hint: null as string | null,
          },
        },
      };
    }

    const rows = await this.repo.find({
      where: { tenantId },
      select: ['provider', 'enabled', 'baseUrl', 'apiKeyEncrypted'],
    });

    const byProv = new Map(rows.map((r) => [r.provider, r]));

    const openai = byProv.get('openai');
    const ollama = byProv.get('ollama');
    const gemini = byProv.get('gemini');

    const openaiKey = this.decryptKey(openai?.apiKeyEncrypted ?? null);
    const geminiKey = this.decryptKey(gemini?.apiKeyEncrypted ?? null);

    return {
      hasTenant: true,
      encryptionConfigured: isEncryptionConfigured(),
      providers: {
        openai: {
          enabled: openai?.enabled ?? false,
          baseUrl: openai?.baseUrl ?? null,
          ...maskSecret(openaiKey),
        },
        ollama: {
          enabled: ollama?.enabled ?? false,
          baseUrl: ollama?.baseUrl ?? DEFAULT_OLLAMA,
        },
        gemini: {
          enabled: gemini?.enabled ?? false,
          ...maskSecret(geminiKey),
        },
      },
    };
  }

  /**
   * Internal method — returns actual decrypted API keys for inference calls.
   * Never expose the returned keys to HTTP responses.
   */
  async getProviderRawConfig(
    tenantId: string,
    provider: LlmProviderId,
  ): Promise<{ enabled: boolean; baseUrl: string | null; apiKey: string | null }> {
    const row = await this.getRow(tenantId, provider);
    return {
      enabled: row?.enabled ?? false,
      baseUrl: row?.baseUrl ?? (provider === 'ollama' ? DEFAULT_OLLAMA : null),
      apiKey: this.decryptKey(row?.apiKeyEncrypted ?? null),
    };
  }

  async updateSettings(tenantId: string | null, dto: UpdateLlmSettingsDto) {
    const tid = this.requireTenant(tenantId);

    if (dto.openai) {
      await this.upsertOpenAi(tid, dto.openai);
    }
    if (dto.ollama) {
      await this.upsertOllama(tid, dto.ollama);
    }
    if (dto.gemini) {
      await this.upsertGemini(tid, dto.gemini);
    }

    return this.getSettings(tid);
  }

  async listModels(tenantId: string | null) {
    const tid = this.requireTenant(tenantId);
    const rows = await this.modelRepo.find({
      where: { tenantId: tid },
      order: { provider: 'ASC', createdAt: 'ASC' },
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        acronym: r.acronym,
        modelId: r.modelId,
        displayName: r.displayName,
        enabled: r.enabled,
        isSystemModel: r.extra?.['isSystemModel'] === true,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  async setSystemModel(tenantId: string | null, modelId: string) {
    const tid = this.requireTenant(tenantId);

    const target = await this.modelRepo.findOne({
      where: { id: modelId, tenantId: tid },
    });

    if (!target) {
      throw new BadRequestException('Modelo no encontrado.');
    }

    // Clear isSystemModel from all models of this tenant
    const all = await this.modelRepo.find({ where: { tenantId: tid } });
    await Promise.all(
      all.map((m) => {
        const extra = { ...(m.extra ?? {}) };
        delete extra['isSystemModel'];
        m.extra = Object.keys(extra).length ? extra : null;
        return this.modelRepo.save(m);
      }),
    );

    // Set isSystemModel on the chosen model
    target.extra = { ...(target.extra ?? {}), isSystemModel: true };
    await this.modelRepo.save(target);

    return this.listModels(tid);
  }

  async createModel(tenantId: string | null, dto: CreateLlmModelDto) {
    const tid = this.requireTenant(tenantId);
    const modelId = dto.modelId.trim();
    if (!modelId) {
      throw new BadRequestException('modelId es requerido');
    }

    const providerRow = await this.getRow(tid, dto.provider);
    if (!providerRow?.enabled) {
      throw new BadRequestException(
        `Primero habilita y configura el proveedor ${dto.provider} en Modelos IA.`,
      );
    }

    await this.testProvider(tid, dto.provider, {});

    const existing = await this.modelRepo.findOne({
      where: { tenantId: tid, provider: dto.provider, modelId },
    });
    if (existing) {
      throw new ConflictException(
        `El modelo ${modelId} ya existe para ${dto.provider} (${existing.acronym}).`,
      );
    }

    const acronym = await this.nextAcronym(tid, dto.provider);

    const created = this.modelRepo.create({
      tenantId: tid,
      provider: dto.provider,
      acronym,
      modelId,
      displayName: dto.displayName?.trim() || null,
      enabled: dto.enabled ?? true,
      extra: null,
    });

    return this.modelRepo.save(created);
  }

  private async nextAcronym(
    tenantId: string,
    provider: LlmProviderId,
  ): Promise<string> {
    const prefix = PROVIDER_CODE[provider];
    const rows = await this.modelRepo.find({
      where: { tenantId, provider },
      select: ['acronym'],
    });

    let max = -1;
    for (const row of rows) {
      const m = row.acronym.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (!m) continue;
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  private async upsertOpenAi(
    tenantId: string,
    d: NonNullable<UpdateLlmSettingsDto['openai']>,
  ) {
    let row = await this.getRow(tenantId, 'openai');
    if (!row) {
      row = this.repo.create({
        tenantId,
        provider: 'openai',
        enabled: false,
        baseUrl: null,
        apiKeyEncrypted: null,
        extra: null,
      });
    }
    if (d.enabled !== undefined) row.enabled = d.enabled;
    if (d.baseUrl !== undefined) row.baseUrl = d.baseUrl?.trim() || null;
    if (d.apiKey !== undefined) {
      if (d.apiKey === '') {
        row.apiKeyEncrypted = null;
      } else {
        if (!isEncryptionConfigured()) {
          throw new BadRequestException(
            'ENCRYPTION_KEY no está configurada (64 caracteres hex). No se pueden guardar claves API.',
          );
        }
        row.apiKeyEncrypted = encryptSecret(d.apiKey);
      }
    }
    await this.repo.save(row);
  }

  private async upsertOllama(
    tenantId: string,
    d: NonNullable<UpdateLlmSettingsDto['ollama']>,
  ) {
    let row = await this.getRow(tenantId, 'ollama');
    if (!row) {
      row = this.repo.create({
        tenantId,
        provider: 'ollama',
        enabled: false,
        baseUrl: DEFAULT_OLLAMA,
        apiKeyEncrypted: null,
        extra: null,
      });
    }
    if (d.enabled !== undefined) row.enabled = d.enabled;
    if (d.baseUrl !== undefined) {
      row.baseUrl = d.baseUrl?.trim() || DEFAULT_OLLAMA;
    }
    await this.repo.save(row);
  }

  private async upsertGemini(
    tenantId: string,
    d: NonNullable<UpdateLlmSettingsDto['gemini']>,
  ) {
    let row = await this.getRow(tenantId, 'gemini');
    if (!row) {
      row = this.repo.create({
        tenantId,
        provider: 'gemini',
        enabled: false,
        baseUrl: null,
        apiKeyEncrypted: null,
        extra: null,
      });
    }
    if (d.enabled !== undefined) row.enabled = d.enabled;
    if (d.apiKey !== undefined) {
      if (d.apiKey === '') {
        row.apiKeyEncrypted = null;
      } else {
        if (!isEncryptionConfigured()) {
          throw new BadRequestException(
            'ENCRYPTION_KEY no está configurada (64 caracteres hex). No se pueden guardar claves API.',
          );
        }
        row.apiKeyEncrypted = encryptSecret(d.apiKey);
      }
    }
    await this.repo.save(row);
  }

  async testProvider(
    tenantId: string | null,
    provider: LlmProviderId,
    body: TestLlmDto,
  ) {
    const tid = this.requireTenant(tenantId);
    const row = await this.getRow(tid, provider);

    if (provider === 'openai') {
      const apiKey =
        body.apiKey?.trim() ||
        this.decryptKey(row?.apiKeyEncrypted ?? null) ||
        this.config.get<string>('OPENAI_API_KEY')?.trim() ||
        '';
      const base = (body.baseUrl ?? row?.baseUrl ?? DEFAULT_OPENAI_BASE).replace(
        /\/$/,
        '',
      );
      if (!apiKey) {
        throw new BadRequestException(
          'No hay clave API de OpenAI (configúrala en el formulario o define OPENAI_API_KEY en el servidor).',
        );
      }
      const detail = await this.fetchOpenAiModels(apiKey, base);
      return {
        ok: true,
        provider: 'openai' as const,
        message: 'Conexión correcta con OpenAI',
        detail,
      };
    }

    if (provider === 'ollama') {
      const base = this.normalizeOllamaUrl(body.baseUrl ?? row?.baseUrl);
      const detail = await this.fetchOllamaModels(base);
      return {
        ok: true,
        provider: 'ollama' as const,
        message: 'Conexión correcta con Ollama',
        detail,
      };
    }

    if (provider === 'gemini') {
      const apiKey =
        body.apiKey?.trim() ||
        this.decryptKey(row?.apiKeyEncrypted ?? null) ||
        this.config.get<string>('GEMINI_API_KEY')?.trim() ||
        '';
      if (!apiKey) {
        throw new BadRequestException(
          'No hay clave API de Gemini (configúrala en el formulario o define GEMINI_API_KEY en el servidor).',
        );
      }
      const detail = await this.fetchGeminiModels(apiKey);
      return {
        ok: true,
        provider: 'gemini' as const,
        message: 'Conexión correcta con Google Gemini',
        detail,
      };
    }

    throw new BadRequestException('Proveedor no soportado');
  }

  async listProviderModels(
    tenantId: string | null,
    provider: LlmProviderId,
    body: TestLlmDto,
  ) {
    const tested = await this.testProvider(tenantId, provider, body);
    const detail = tested.detail as
      | {
          modelsListed?: number;
          sampleModels?: string[];
          modelIds?: string[];
        }
      | undefined;

    const models = Array.isArray(detail?.modelIds)
      ? detail.modelIds
      : Array.isArray(detail?.sampleModels)
      ? detail.sampleModels
      : [];

    return {
      ok: true,
      provider,
      modelsListed: detail?.modelsListed ?? models.length,
      models,
    };
  }

  private normalizeOllamaUrl(url: string | null | undefined): string {
    let u = (url || DEFAULT_OLLAMA).trim().replace(/\/$/, '');
    if (!u.startsWith('http')) u = `http://${u}`;
    return u;
  }

  private async fetchOpenAiModels(apiKey: string, baseUrl: string) {
    const url = `${baseUrl}/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new BadRequestException(
        `OpenAI respondió ${res.status}: ${txt.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as {
      data?: Array<{ id?: string }>;
    };
    const ids = Array.isArray(data.data)
      ? data.data
          .map((m) => m?.id?.trim())
          .filter((v): v is string => Boolean(v))
          .sort((a, b) => a.localeCompare(b))
      : [];
    return {
      modelsListed: Array.isArray(data.data) ? data.data.length : 0,
      sampleModels: ids.slice(0, 20),
      modelIds: ids.slice(0, 500),
    };
  }

  private async fetchOllamaModels(baseUrl: string) {
    const url = `${baseUrl}/api/tags`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const txt = await res.text();
      throw new BadRequestException(
        `Ollama respondió ${res.status}: ${txt.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as {
      models?: Array<{ name?: string; model?: string }>;
    };
    const ids = Array.isArray(data.models)
      ? data.models
          .map((m) => (m?.model || m?.name || '').trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      : [];
    return {
      baseUrl,
      modelsListed: Array.isArray(data.models) ? data.models.length : 0,
      sampleModels: ids.slice(0, 20),
      modelIds: ids,
    };
  }

  private async fetchGeminiModels(apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new BadRequestException(
        `Gemini respondió ${res.status}: ${txt.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as {
      models?: Array<{ name?: string }>;
    };
    const ids = Array.isArray(data.models)
      ? data.models
          .map((m) => (m?.name || '').replace(/^models\//, '').trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      : [];
    return {
      modelsListed: Array.isArray(data.models) ? data.models.length : 0,
      sampleModels: ids.slice(0, 20),
      modelIds: ids.slice(0, 500),
    };
  }
}
