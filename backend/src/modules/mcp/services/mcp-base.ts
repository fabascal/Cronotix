export interface McpToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface McpServiceInterface {
  readonly type: string;
  getTools(): McpToolDef[];
  execute(
    toolName: string,
    args: Record<string, unknown>,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<string>;
}
