import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProviderConfig } from '../../database/entities/llm-provider-config.entity';
import { LlmModelTemplate } from '../../database/entities/llm-model-template.entity';
import { AuthModule } from '../auth/auth.module';
import { LlmConfigController } from './llm-config.controller';
import { LlmConfigService } from './llm-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProviderConfig, LlmModelTemplate]), AuthModule],
  controllers: [LlmConfigController],
  providers: [LlmConfigService],
  exports: [LlmConfigService],
})
export class LlmConfigModule {}
