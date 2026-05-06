import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../../database/entities/document.entity';
import { DocumentChunk } from '../../database/entities/document-chunk.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Agent } from '../../database/entities/agent.entity';
import { Skill } from '../../database/entities/skill.entity';
import { AgentFunction } from '../../database/entities/agent-function.entity';
import { AgentDocument } from '../../database/entities/agent-document.entity';
import { LlmModelTemplate } from '../../database/entities/llm-model-template.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { LlmConfigModule } from '../llm-config/llm-config.module';
import { McpModule } from '../mcp/mcp.module';
import { AgentsService } from './agents.service';
import { AgentsCrudService } from './agents-crud.service';
import { AgentsController } from './agents.controller';
import { AgentsDashboardController } from './agents-dashboard.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

/**
 * Agents module.
 *
 * Two controllers:
 * - AgentsController          — protected by ApiKeyGuard (Portal B / external systems)
 * - AgentsDashboardController — protected by JwtOrApiKeyGuard (dashboard users + Portal B)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk, Tenant, Agent, Skill, AgentFunction, AgentDocument, LlmModelTemplate, ApiKey]),
    BillingModule,
    AuthModule,
    LlmConfigModule,
    McpModule,
  ],
  providers: [AgentsService, AgentsCrudService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [AgentsController, AgentsDashboardController],
  exports: [AgentsService, AgentsCrudService],
})
export class AgentsModule {}
