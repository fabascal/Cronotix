import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpFilesystemService implements McpServiceInterface {
  readonly type = 'filesystem';
  private readonly logger = new Logger(McpFilesystemService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_filesystem_list_directory',
        description: 'Lists files and directories in the specified path',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path within the base directory' },
          },
          required: [],
        },
      },
      {
        name: 'mcp_filesystem_read_file',
        description: 'Reads the content of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
          },
          required: ['path'],
        },
      },
      {
        name: 'mcp_filesystem_write_file',
        description: 'Writes content to a file (creates or overwrites)',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
            content: { type: 'string', description: 'File content to write' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'mcp_filesystem_file_info',
        description: 'Returns metadata about a file (size, modified date, type)',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
          },
          required: ['path'],
        },
      },
    ];
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<string> {
    const baseDir = (config.baseDirectory as string) || '/tmp';
    const safePath = (rel: string) => {
      const resolved = path.resolve(baseDir, rel);
      if (!resolved.startsWith(path.resolve(baseDir))) {
        throw new Error('Path traversal not allowed');
      }
      return resolved;
    };

    try {
      switch (toolName) {
        case 'mcp_filesystem_list_directory': {
          const dirPath = safePath((args.path as string) || '.');
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          const list = entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file',
          }));
          return JSON.stringify(list);
        }
        case 'mcp_filesystem_read_file': {
          const filePath = safePath(args.path as string);
          const content = await fs.readFile(filePath, 'utf-8');
          return content.slice(0, 50000);
        }
        case 'mcp_filesystem_write_file': {
          const filePath = safePath(args.path as string);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, args.content as string, 'utf-8');
          return JSON.stringify({ success: true, path: filePath });
        }
        case 'mcp_filesystem_file_info': {
          const filePath = safePath(args.path as string);
          const stat = await fs.stat(filePath);
          return JSON.stringify({
            size: stat.size,
            modified: stat.mtime.toISOString(),
            created: stat.birthtime.toISOString(),
            isDirectory: stat.isDirectory(),
          });
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (err) {
      this.logger.warn(`Filesystem MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }
}
