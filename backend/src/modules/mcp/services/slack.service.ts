import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpSlackService implements McpServiceInterface {
  readonly type = 'slack';
  private readonly logger = new Logger(McpSlackService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_slack_send_message',
        description: 'Sends a message to a Slack channel',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID or name (e.g. #general)' },
            text: { type: 'string', description: 'Message text' },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'mcp_slack_list_channels',
        description: 'Lists available Slack channels',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'mcp_slack_read_channel_history',
        description: 'Reads recent messages from a channel',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel ID' },
            limit: { type: 'number', description: 'Number of messages (default 20)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'mcp_slack_search_messages',
        description: 'Searches messages across the workspace',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    _config: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<string> {
    const token = secrets.botToken;
    if (!token) return JSON.stringify({ error: 'Slack bot token not configured' });

    const slackApi = async (method: string, body?: Record<string, unknown>) => {
      const res = await fetch(`https://slack.com/api/${method}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json() as Promise<Record<string, unknown>>;
    };

    try {
      switch (toolName) {
        case 'mcp_slack_send_message': {
          const data = await slackApi('chat.postMessage', {
            channel: args.channel,
            text: args.text,
          });
          if (!data.ok) return JSON.stringify({ error: data.error });
          return JSON.stringify({ ok: true, ts: data.ts });
        }
        case 'mcp_slack_list_channels': {
          const data = await slackApi('conversations.list', {
            types: 'public_channel,private_channel',
            limit: 50,
          });
          if (!data.ok) return JSON.stringify({ error: data.error });
          const channels = (data.channels as Array<{ id: string; name: string; is_private: boolean }>) ?? [];
          return JSON.stringify(channels.map((c) => ({ id: c.id, name: c.name, private: c.is_private })));
        }
        case 'mcp_slack_read_channel_history': {
          const data = await slackApi('conversations.history', {
            channel: args.channel,
            limit: (args.limit as number) || 20,
          });
          if (!data.ok) return JSON.stringify({ error: data.error });
          const msgs = (data.messages as Array<{ text: string; user: string; ts: string }>) ?? [];
          return JSON.stringify(msgs.map((m) => ({ text: m.text, user: m.user, ts: m.ts })));
        }
        case 'mcp_slack_search_messages': {
          const data = await slackApi('search.messages', { query: args.query });
          if (!data.ok) return JSON.stringify({ error: data.error });
          const matches = ((data.messages as Record<string, unknown>)?.matches as Array<{ text: string; channel: { name: string }; ts: string }>) ?? [];
          return JSON.stringify(matches.slice(0, 20).map((m) => ({ text: m.text, channel: m.channel?.name, ts: m.ts })));
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (err) {
      this.logger.warn(`Slack MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }
}
