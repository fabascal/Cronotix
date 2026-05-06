import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './services/mcp-base';
import type { McpIntegrationType } from '../../database/entities/mcp-integration.entity';
import { McpFilesystemService } from './services/filesystem.service';
import { McpPostgresqlService } from './services/postgresql.service';
import { McpGithubService } from './services/github.service';
import { McpSlackService } from './services/slack.service';
import { McpNotionService } from './services/notion.service';
import { McpHttpService } from './services/http.service';

export interface McpIntegrationData {
  type: McpIntegrationType;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
  isActive: boolean;
}

@Injectable()
export class McpRouterService {
  private readonly logger = new Logger(McpRouterService.name);
  private readonly services = new Map<string, McpServiceInterface>();

  constructor(
    private readonly fsSvc: McpFilesystemService,
    private readonly pgSvc: McpPostgresqlService,
    private readonly ghSvc: McpGithubService,
    private readonly slackSvc: McpSlackService,
    private readonly notionSvc: McpNotionService,
    private readonly httpSvc: McpHttpService,
  ) {
    for (const svc of [fsSvc, pgSvc, ghSvc, slackSvc, notionSvc, httpSvc]) {
      this.services.set(svc.type, svc);
    }
  }

  /** Get all tool definitions for the given active integrations. */
  getToolsForIntegrations(integrations: McpIntegrationData[]): McpToolDef[] {
    const tools: McpToolDef[] = [];
    for (const integ of integrations) {
      if (!integ.isActive) continue;
      const svc = this.services.get(integ.type);
      if (svc) tools.push(...svc.getTools());
    }
    return tools;
  }

  /** Returns true if the tool name is an MCP tool (uses mcp_ prefix). */
  isMcpTool(toolName: string): boolean {
    return toolName.startsWith('mcp_');
  }

  /** Extract the integration type from a tool name like mcp_postgresql_list_tables → postgresql */
  private extractType(toolName: string): string | null {
    const match = toolName.match(/^mcp_([a-z]+)_/);
    return match ? match[1] : null;
  }

  /** Execute an MCP tool call. */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    integrations: McpIntegrationData[],
  ): Promise<string> {
    const type = this.extractType(toolName);
    if (!type) return JSON.stringify({ error: `Cannot determine MCP type from tool name: ${toolName}` });

    const integ = integrations.find((i) => i.type === type && i.isActive);
    if (!integ) return JSON.stringify({ error: `Integration "${type}" not active` });

    const svc = this.services.get(type);
    if (!svc) return JSON.stringify({ error: `No service for type "${type}"` });

    try {
      return await svc.execute(toolName, args, integ.config, integ.secrets);
    } catch (err) {
      this.logger.error(`MCP execute error [${type}/${toolName}]: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }

  /** Returns metadata for all available MCP types. */
  getAvailableTypes() {
    return [
      {
        type: 'filesystem',
        label: 'Filesystem',
        description: 'Lee y escribe archivos en un directorio configurado',
        configSchema: {
          baseDirectory: { type: 'string', label: 'Directorio base', required: true },
        },
        secretsSchema: {},
        tools: this.fsSvc.getTools().length,
      },
      {
        type: 'postgresql',
        label: 'PostgreSQL',
        description: 'Ejecuta consultas SQL en una base de datos PostgreSQL',
        configSchema: {
          host: { type: 'string', label: 'Host', required: true },
          port: { type: 'number', label: 'Puerto', required: false },
          database: { type: 'string', label: 'Base de datos', required: true },
          user: { type: 'string', label: 'Usuario', required: false },
        },
        secretsSchema: {
          user: { type: 'string', label: 'Usuario', required: true },
          password: { type: 'string', label: 'Contraseña', required: true, sensitive: true },
        },
        tools: this.pgSvc.getTools().length,
      },
      {
        type: 'github',
        label: 'GitHub',
        description: 'Interactúa con repositorios, issues y pull requests',
        configSchema: {
          owner: { type: 'string', label: 'Owner/Org (default)', required: false },
          repo: { type: 'string', label: 'Repo (default)', required: false },
        },
        secretsSchema: {
          token: { type: 'string', label: 'Personal Access Token', required: true, sensitive: true },
        },
        tools: this.ghSvc.getTools().length,
      },
      {
        type: 'slack',
        label: 'Slack',
        description: 'Envía mensajes y consulta canales de Slack',
        configSchema: {
          workspace: { type: 'string', label: 'Workspace', required: false },
        },
        secretsSchema: {
          botToken: { type: 'string', label: 'Bot Token (xoxb-...)', required: true, sensitive: true },
        },
        tools: this.slackSvc.getTools().length,
      },
      {
        type: 'notion',
        label: 'Notion',
        description: 'Busca, lee y crea páginas en Notion',
        configSchema: {},
        secretsSchema: {
          token: { type: 'string', label: 'Integration Token', required: true, sensitive: true },
        },
        tools: this.notionSvc.getTools().length,
      },
      {
        type: 'http',
        label: 'HTTP',
        description: 'Realiza peticiones HTTP genéricas a cualquier API',
        configSchema: {
          baseUrl: { type: 'string', label: 'Base URL', required: false },
        },
        secretsSchema: {
          headers: { type: 'string', label: 'Headers por defecto (JSON)', required: false, sensitive: true },
        },
        tools: this.httpSvc.getTools().length,
      },
    ];
  }
}
