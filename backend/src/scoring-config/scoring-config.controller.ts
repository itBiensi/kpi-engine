import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ScoringConfigService } from './scoring-config.service';
import { UpdateScoringConfigDto } from './dto/update-scoring-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Scoring Configuration')
@Controller('api/v1/scoring-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScoringConfigController {
  constructor(private readonly scoringConfigService: ScoringConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current scoring configuration',
    description: 'Retrieves the current dynamic scoring configuration used for KPI calculations. All authenticated users can view this configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current scoring configuration retrieved successfully',
    schema: {
      example: {
        id: 1,
        capMultiplier: 1.2,
        excellentThreshold: 130,
        veryGoodThreshold: 110,
        goodThreshold: 90,
        poorThreshold: 70,
        updatedAt: '2026-02-12T10:30:00.000Z',
        updatedBy: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  async getConfig() {
    return this.scoringConfigService.getConfig();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update scoring configuration (Admin only)',
    description: `Updates the dynamic scoring configuration. Only administrators can perform this action.

**Business Rules:**
- Cap multiplier must be between 1.0 and 2.0
- Grade thresholds must be in descending order: Excellent > Very Good > Good > Poor
- All changes are logged to audit trail
- New configuration applies to all future score calculations immediately

**Default Values:**
- Cap Multiplier: 1.2 (120% of weight)
- Excellent: > 130%
- Very Good: > 110%
- Good: > 90%
- Poor: > 70%
- Bad: ≤ 70%`,
  })
  @ApiBody({
    type: UpdateScoringConfigDto,
    description: 'Scoring configuration values to update (all fields optional)',
    examples: {
      'Update All': {
        value: {
          capMultiplier: 1.5,
          excellentThreshold: 140,
          veryGoodThreshold: 115,
          goodThreshold: 95,
          poorThreshold: 75,
        },
        description: 'Update all configuration values',
      },
      'Update Cap Only': {
        value: {
          capMultiplier: 1.3,
        },
        description: 'Update only the cap multiplier',
      },
      'Update Grades Only': {
        value: {
          excellentThreshold: 135,
          veryGoodThreshold: 112,
          goodThreshold: 92,
          poorThreshold: 72,
        },
        description: 'Update only grade thresholds',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Scoring configuration updated successfully',
    schema: {
      example: {
        id: 1,
        capMultiplier: 1.5,
        excellentThreshold: 140,
        veryGoodThreshold: 115,
        goodThreshold: 95,
        poorThreshold: 75,
        updatedAt: '2026-02-12T10:35:00.000Z',
        updatedBy: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration values - Validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Grade thresholds must be in descending order: Excellent > Very Good > Good > Poor',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async updateConfig(
    @Body() dto: UpdateScoringConfigDto,
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.scoringConfigService.updateConfig(dto, {
      userId: req.user?.id,
      ipAddress,
      userAgent,
    });
  }
}
