import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpPostgresqlService implements McpServiceInterface {
  readonly type = 'postgresql';
  private readonly logger = new Logger(McpPostgresqlService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_postgresql_execute_query',
        description: 'Executes a SQL query and returns results (read-only recommended)',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute' },
          },
          required: ['query'],
        },
      },
      {
        name: 'mcp_postgresql_list_tables',
        description: 'Lists all tables in the database',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'mcp_postgresql_describe_table',
        description: 'Describes the columns of a table',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
          },
          required: ['table'],
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
    let client: import('pg').Client | null = null;
    try {
      const { Client } = await import('pg');
      const connConfig = {
        host: (config.host as string) || 'localhost',
        port: parseInt(String(config.port ?? 5432)),
        user: secrets.user || (config.user as string) || 'postgres',
        password: secrets.password || '',
        database: (config.database as string) || 'postgres',
        connectionTimeoutMillis: 5000,
        query_timeout: 10000,
      };

      client = new Client(connConfig);
      await client.connect();

      switch (toolName) {
        case 'mcp_postgresql_execute_query': {
          const result = await client.query(args.query as string);
          return JSON.stringify({ rows: result.rows?.slice(0, 100), rowCount: result.rowCount });
        }
        case 'mcp_postgresql_list_tables': {
          const result = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
          );
          return JSON.stringify(result.rows.map((r: Record<string, unknown>) => r.table_name));
        }
        case 'mcp_postgresql_describe_table': {
          const result = await client.query(
            'SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
            [args.table],
          );
          return JSON.stringify(result.rows);
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (err) {
      this.logger.warn(`PostgreSQL MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    } finally {
      await client?.end().catch(() => {});
    }
  }
}
