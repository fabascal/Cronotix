import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpHttpService implements McpServiceInterface {
  readonly type = 'http';
  private readonly logger = new Logger(McpHttpService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_http_request',
        description: 'Makes an HTTP request to any URL',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Full URL or path (appended to baseUrl if configured)' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default GET)' },
            headers: { type: 'object', description: 'Additional HTTP headers (optional)' },
            body: { type: 'object', description: 'Request body as JSON (optional)' },
          },
          required: ['url'],
        },
      },
    ];
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<string> {
    if (toolName !== 'mcp_http_request') {
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    try {
      const baseUrl = ((config.baseUrl as string) || '').replace(/\/$/, '');
      let url = args.url as string;
      if (baseUrl && !url.startsWith('http')) {
        url = `${baseUrl}/${url.replace(/^\//, '')}`;
      }

      let defaultHeaders: Record<string, string> = {};
      if (secrets.headers) {
        try { defaultHeaders = JSON.parse(secrets.headers); } catch { /* ignore */ }
      }

      const method = ((args.method as string) || 'GET').toUpperCase();
      const customHeaders = (args.headers as Record<string, string>) || {};
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...customHeaders,
      };

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && args.body;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method,
        headers,
        ...(hasBody ? { body: JSON.stringify(args.body) } : {}),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();
      const truncated = text.slice(0, 8000);

      try {
        const json = JSON.parse(truncated);
        return JSON.stringify({ status: res.status, data: json });
      } catch {
        return JSON.stringify({ status: res.status, body: truncated });
      }
    } catch (err) {
      this.logger.warn(`HTTP MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }
}
