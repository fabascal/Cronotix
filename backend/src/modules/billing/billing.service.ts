import { Injectable, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { TokenUsage, OperationType } from '../../database/entities/token-usage.entity';
import { ProviderPricing } from '../../database/entities/provider-pricing.entity';

export interface DeductCreditsParams {
  tenantId: string;
  documentId?: string;
  provider: string;
  modelId: string;
  operationType: OperationType;
  promptTokens: number;
  completionTokens: number;
}

export interface CreditEstimate {
  estimatedCredits: number;
  pricing: ProviderPricing;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TokenUsage)
    private readonly usageRepo: Repository<TokenUsage>,
    @InjectRepository(ProviderPricing)
    private readonly pricingRepo: Repository<ProviderPricing>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Pre-flight credit check. MUST be called before any OCR or LLM operation.
   * Throws HTTP 402 if the tenant does not have enough credits.
   */
  async checkCredits(tenantId: string, estimatedCredits: number): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId, isActive: true } });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found or inactive`);
    }

    if (Number(tenant.credits) < estimatedCredits) {
      this.logger.warn(
        `Tenant ${tenantId} insufficient credits: has ${tenant.credits}, needs ${estimatedCredits}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Payment Required',
          message: 'Insufficient credits. Please top up your account.',
          creditsAvailable: Number(tenant.credits),
          creditsRequired: estimatedCredits,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /**
   * Estimates the credit cost for an operation based on provider_pricing table.
   * Tariffs are NEVER hardcoded — always read from DB.
   */
  async estimateCredits(
    provider: string,
    modelId: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number,
  ): Promise<CreditEstimate> {
    const pricing = await this.pricingRepo.findOne({
      where: { provider, modelId, isActive: true },
    });

    if (!pricing) {
      this.logger.warn(`No pricing found for ${provider}/${modelId}, using zero estimate`);
      return {
        estimatedCredits: 0,
        pricing: {
          inputPricePer1kTokens: 0,
          outputPricePer1kTokens: 0,
          creditsPerUsd: 100,
        } as ProviderPricing,
      };
    }

    const inputCostUsd =
      (estimatedPromptTokens / 1000) * Number(pricing.inputPricePer1kTokens);
    const outputCostUsd =
      (estimatedCompletionTokens / 1000) * Number(pricing.outputPricePer1kTokens);
    const totalUsd = inputCostUsd + outputCostUsd;
    const estimatedCredits = totalUsd * Number(pricing.creditsPerUsd);

    return { estimatedCredits, pricing };
  }

  /**
   * Records actual token usage and deducts credits from tenant balance.
   * Runs inside a transaction to prevent credit drift.
   */
  async deductCredits(params: DeductCreditsParams): Promise<TokenUsage> {
    const {
      tenantId,
      documentId,
      provider,
      modelId,
      operationType,
      promptTokens,
      completionTokens,
    } = params;

    const pricing = await this.pricingRepo.findOne({
      where: { provider, modelId, isActive: true },
    });

    const inputCostUsd = pricing
      ? (promptTokens / 1000) * Number(pricing.inputPricePer1kTokens)
      : 0;
    const outputCostUsd = pricing
      ? (completionTokens / 1000) * Number(pricing.outputPricePer1kTokens)
      : 0;
    const usdCost = inputCostUsd + outputCostUsd;
    const creditsConsumed = pricing ? usdCost * Number(pricing.creditsPerUsd) : 0;

    return await this.dataSource.transaction(async (manager) => {
      // Atomically deduct credits
      await manager
        .createQueryBuilder()
        .update(Tenant)
        .set({ credits: () => `credits - ${creditsConsumed}` })
        .where('id = :id', { id: tenantId })
        .execute();

      // Record usage
      const usage = manager.create(TokenUsage, {
        tenantId,
        documentId: documentId ?? null,
        provider,
        modelId,
        operationType,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        creditsConsumed,
        usdCost,
      });

      const saved = await manager.save(TokenUsage, usage);

      this.logger.log(
        `Deducted ${creditsConsumed.toFixed(4)} credits from tenant ${tenantId} ` +
          `(${provider}/${modelId}, ${promptTokens + completionTokens} tokens)`,
      );

      return saved;
    });
  }

  async getTenantBalance(tenantId: string): Promise<number> {
    const tenant = await this.tenantRepo.findOneOrFail({ where: { id: tenantId } });
    return Number(tenant.credits);
  }
}
