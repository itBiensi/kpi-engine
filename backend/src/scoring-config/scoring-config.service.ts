import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-log/audit-log.service';
import { UpdateScoringConfigDto } from './dto/update-scoring-config.dto';

@Injectable()
export class ScoringConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get current scoring configuration
   * Creates default config if none exists
   */
  async getConfig() {
    let config = await this.prisma.scoringConfig.findFirst({
      orderBy: { id: 'desc' },
    });

    // Create default config if none exists
    if (!config) {
      config = await this.prisma.scoringConfig.create({
        data: {
          capMultiplier: 1.2,
          excellentThreshold: 130,
          veryGoodThreshold: 110,
          goodThreshold: 90,
          poorThreshold: 70,
        },
      });
    }

    return config;
  }

  /**
   * Update scoring configuration (admin only)
   * Validates that thresholds are in descending order
   */
  async updateConfig(
    dto: UpdateScoringConfigDto,
    adminContext?: { userId?: number; ipAddress?: string; userAgent?: string },
  ) {
    const currentConfig = await this.getConfig();

    // Merge with current values
    const newConfig = {
      capMultiplier: dto.capMultiplier ?? Number(currentConfig.capMultiplier),
      excellentThreshold: dto.excellentThreshold ?? Number(currentConfig.excellentThreshold),
      veryGoodThreshold: dto.veryGoodThreshold ?? Number(currentConfig.veryGoodThreshold),
      goodThreshold: dto.goodThreshold ?? Number(currentConfig.goodThreshold),
      poorThreshold: dto.poorThreshold ?? Number(currentConfig.poorThreshold),
    };

    // Validate thresholds are in descending order
    if (
      newConfig.excellentThreshold <= newConfig.veryGoodThreshold ||
      newConfig.veryGoodThreshold <= newConfig.goodThreshold ||
      newConfig.goodThreshold <= newConfig.poorThreshold
    ) {
      throw new BadRequestException(
        'Grade thresholds must be in descending order: Excellent > Very Good > Good > Poor',
      );
    }

    // Update configuration
    const updated = await this.prisma.scoringConfig.update({
      where: { id: currentConfig.id },
      data: {
        capMultiplier: newConfig.capMultiplier,
        excellentThreshold: newConfig.excellentThreshold,
        veryGoodThreshold: newConfig.veryGoodThreshold,
        goodThreshold: newConfig.goodThreshold,
        poorThreshold: newConfig.poorThreshold,
        updatedBy: adminContext?.userId,
      },
    });

    // Log configuration change
    await this.auditService.log(
      'SYSTEM_SEEDED', // Reusing existing action type
      {
        userId: adminContext?.userId,
        ipAddress: adminContext?.ipAddress,
        userAgent: adminContext?.userAgent,
      },
      {
        resourceType: 'ScoringConfig',
        resourceId: updated.id,
        details: {
          action: 'Scoring configuration updated',
          changes: dto,
        },
      },
    );

    return updated;
  }
}
