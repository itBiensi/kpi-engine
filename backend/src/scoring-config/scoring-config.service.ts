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
          gradeAThreshold: 90,
          gradeBThreshold: 75,
          gradeCThreshold: 60,
          gradeDThreshold: 50,
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
      gradeAThreshold: dto.gradeAThreshold ?? Number(currentConfig.gradeAThreshold),
      gradeBThreshold: dto.gradeBThreshold ?? Number(currentConfig.gradeBThreshold),
      gradeCThreshold: dto.gradeCThreshold ?? Number(currentConfig.gradeCThreshold),
      gradeDThreshold: dto.gradeDThreshold ?? Number(currentConfig.gradeDThreshold),
    };

    // Validate thresholds are in descending order
    if (
      newConfig.gradeAThreshold <= newConfig.gradeBThreshold ||
      newConfig.gradeBThreshold <= newConfig.gradeCThreshold ||
      newConfig.gradeCThreshold <= newConfig.gradeDThreshold
    ) {
      throw new BadRequestException(
        'Grade thresholds must be in descending order: A > B > C > D',
      );
    }

    // Update configuration
    const updated = await this.prisma.scoringConfig.update({
      where: { id: currentConfig.id },
      data: {
        capMultiplier: newConfig.capMultiplier,
        gradeAThreshold: newConfig.gradeAThreshold,
        gradeBThreshold: newConfig.gradeBThreshold,
        gradeCThreshold: newConfig.gradeCThreshold,
        gradeDThreshold: newConfig.gradeDThreshold,
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
