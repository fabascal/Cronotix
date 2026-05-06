import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../../database/entities/agent.entity';
import { McpIntegration } from '../../database/entities/mcp-integration.entity';
import { AuthModule } from '../auth/auth.module';
import { McpFilesystemService } from './services/filesystem.service';
import { McpPostgresqlService } from './services/postgresql.service';
import { McpGithubService } from './services/github.service';
import { McpSlackService } from './services/slack.service';
import { McpNotionService } from './services/notion.service';
import { McpHttpService } from './services/http.service';
import { McpRouterService } from './mcp-router.service';
import { McpCrudService } from './mcp-crud.service';
import { McpController } from './mcp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, McpIntegration]), AuthModule],
  providers: [
    McpFilesystemService,
    McpPostgresqlService,
    McpGithubService,
    McpSlackService,
    McpNotionService,
    McpHttpService,
    McpRouterService,
    McpCrudService,
  ],
  controllers: [McpController],
  exports: [McpRouterService, McpCrudService],
})
export class McpModule {}
