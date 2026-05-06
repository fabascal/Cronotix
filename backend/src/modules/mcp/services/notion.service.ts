import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpNotionService implements McpServiceInterface {
  readonly type = 'notion';
  private readonly logger = new Logger(McpNotionService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_notion_search_pages',
        description: 'Searches Notion pages by title',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'mcp_notion_read_page',
        description: 'Reads the content of a Notion page',
        parameters: {
          type: 'object',
          properties: {
            page_id: { type: 'string', description: 'Notion page ID' },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'mcp_notion_create_page',
        description: 'Creates a new Notion page in a parent page or database',
        parameters: {
          type: 'object',
          properties: {
            parent_id: { type: 'string', description: 'Parent page or database ID' },
            title: { type: 'string', description: 'Page title' },
            content: { type: 'string', description: 'Page content (plain text)' },
          },
          required: ['parent_id', 'title'],
        },
      },
      {
        name: 'mcp_notion_update_page',
        description: 'Updates properties of a Notion page',
        parameters: {
          type: 'object',
          properties: {
            page_id: { type: 'string' },
            properties: { type: 'object', description: 'Properties to update' },
          },
          required: ['page_id', 'properties'],
        },
      },
      {
        name: 'mcp_notion_query_database',
        description: 'Queries a Notion database',
        parameters: {
          type: 'object',
          properties: {
            database_id: { type: 'string', description: 'Database ID' },
            filter: { type: 'object', description: 'Notion filter object (optional)' },
          },
          required: ['database_id'],
        },
      },
    ];
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    _config: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<string> {
    const token = secrets.token;
    if (!token) return JSON.stringify({ error: 'Notion integration token not configured' });

    const base = 'https://api.notion.com/v1';

    try {
      switch (toolName) {
        case 'mcp_notion_search_pages': {
          const res = await fetch(`${base}/search`, {
            method: 'POST',
            headers: this.headers(token),
            body: JSON.stringify({ query: args.query, page_size: 10 }),
          });
          if (!res.ok) throw new Error(`Notion API ${res.status}`);
          const data = (await res.json()) as { results: Array<{ id: string; object: string; url: string }> };
          return JSON.stringify(data.results.map((r) => ({ id: r.id, type: r.object, url: r.url })));
        }
        case 'mcp_notion_read_page': {
          const res = await fetch(`${base}/blocks/${args.page_id}/children?page_size=50`, {
            headers: this.headers(token),
          });
          if (!res.ok) throw new Error(`Notion API ${res.status}`);
          const data = (await res.json()) as { results: unknown[] };
          return JSON.stringify(data.results.slice(0, 30));
        }
        case 'mcp_notion_create_page': {
          const body: Record<string, unknown> = {
            parent: { page_id: args.parent_id },
            properties: { title: { title: [{ text: { content: args.title } }] } },
          };
          if (args.content) {
            body.children = [
              { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: args.content } }] } },
            ];
          }
          const res = await fetch(`${base}/pages`, {
            method: 'POST',
            headers: this.headers(token),
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(`Notion API ${res.status}`);
          const data = (await res.json()) as { id: string; url: string };
          return JSON.stringify({ id: data.id, url: data.url });
        }
        case 'mcp_notion_update_page': {
          const res = await fetch(`${base}/pages/${args.page_id}`, {
            method: 'PATCH',
            headers: this.headers(token),
            body: JSON.stringify({ properties: args.properties }),
          });
          if (!res.ok) throw new Error(`Notion API ${res.status}`);
          return JSON.stringify({ ok: true });
        }
        case 'mcp_notion_query_database': {
          const body: Record<string, unknown> = { page_size: 20 };
          if (args.filter) body.filter = args.filter;
          const res = await fetch(`${base}/databases/${args.database_id}/query`, {
            method: 'POST',
            headers: this.headers(token),
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(`Notion API ${res.status}`);
          const data = (await res.json()) as { results: unknown[] };
          return JSON.stringify(data.results.slice(0, 20));
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (err) {
      this.logger.warn(`Notion MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }
}
