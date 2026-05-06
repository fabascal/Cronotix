import { Injectable, Logger } from '@nestjs/common';
import type { McpServiceInterface, McpToolDef } from './mcp-base';

@Injectable()
export class McpGithubService implements McpServiceInterface {
  readonly type = 'github';
  private readonly logger = new Logger(McpGithubService.name);

  getTools(): McpToolDef[] {
    return [
      {
        name: 'mcp_github_list_repos',
        description: 'Lists repositories for the authenticated user or organization',
        parameters: {
          type: 'object',
          properties: {
            org: { type: 'string', description: 'Organization name (optional, defaults to user repos)' },
          },
          required: [],
        },
      },
      {
        name: 'mcp_github_get_issues',
        description: 'Lists issues for a repository',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Issue state filter' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'mcp_github_create_issue',
        description: 'Creates a new issue in a repository',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'mcp_github_list_pull_requests',
        description: 'Lists pull requests for a repository',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            state: { type: 'string', enum: ['open', 'closed', 'all'] },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'mcp_github_create_comment',
        description: 'Creates a comment on an issue or pull request',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            issue_number: { type: 'number', description: 'Issue or PR number' },
            body: { type: 'string' },
          },
          required: ['owner', 'repo', 'issue_number', 'body'],
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
    const token = secrets.token;
    if (!token) return JSON.stringify({ error: 'GitHub token not configured' });

    const apiBase = 'https://api.github.com';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Cronotix-MCP',
    };

    try {
      switch (toolName) {
        case 'mcp_github_list_repos': {
          const org = args.org as string | undefined;
          const url = org ? `${apiBase}/orgs/${org}/repos?per_page=30` : `${apiBase}/user/repos?per_page=30&sort=updated`;
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`GitHub API ${res.status}`);
          const data = (await res.json()) as Array<{ full_name: string; description: string | null; private: boolean }>;
          return JSON.stringify(data.map((r) => ({ name: r.full_name, description: r.description, private: r.private })));
        }
        case 'mcp_github_get_issues': {
          const state = (args.state as string) || 'open';
          const res = await fetch(`${apiBase}/repos/${args.owner}/${args.repo}/issues?state=${state}&per_page=30`, { headers });
          if (!res.ok) throw new Error(`GitHub API ${res.status}`);
          const data = (await res.json()) as Array<{ number: number; title: string; state: string; user: { login: string } }>;
          return JSON.stringify(data.map((i) => ({ number: i.number, title: i.title, state: i.state, author: i.user.login })));
        }
        case 'mcp_github_create_issue': {
          const res = await fetch(`${apiBase}/repos/${args.owner}/${args.repo}/issues`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: args.title, body: args.body || '' }),
          });
          if (!res.ok) throw new Error(`GitHub API ${res.status}`);
          const data = (await res.json()) as { number: number; html_url: string };
          return JSON.stringify({ number: data.number, url: data.html_url });
        }
        case 'mcp_github_list_pull_requests': {
          const state = (args.state as string) || 'open';
          const res = await fetch(`${apiBase}/repos/${args.owner}/${args.repo}/pulls?state=${state}&per_page=30`, { headers });
          if (!res.ok) throw new Error(`GitHub API ${res.status}`);
          const data = (await res.json()) as Array<{ number: number; title: string; state: string; user: { login: string } }>;
          return JSON.stringify(data.map((p) => ({ number: p.number, title: p.title, state: p.state, author: p.user.login })));
        }
        case 'mcp_github_create_comment': {
          const res = await fetch(`${apiBase}/repos/${args.owner}/${args.repo}/issues/${args.issue_number}/comments`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: args.body }),
          });
          if (!res.ok) throw new Error(`GitHub API ${res.status}`);
          const data = (await res.json()) as { id: number; html_url: string };
          return JSON.stringify({ id: data.id, url: data.html_url });
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (err) {
      this.logger.warn(`GitHub MCP error: ${(err as Error).message}`);
      return JSON.stringify({ error: (err as Error).message });
    }
  }
}
