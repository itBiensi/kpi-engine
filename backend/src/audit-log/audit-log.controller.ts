import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit-log.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Audit Log (Admin Only)')
@Controller('api/v1/admin/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
    schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              action: { type: 'string' },
              userId: { type: 'number', nullable: true },
              resourceType: { type: 'string', nullable: true },
              resourceId: { type: 'number', nullable: true },
              details: { type: 'object', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              timestamp: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  fullName: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(@Query() filters: GetAuditLogsDto) {
    return this.auditService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit log statistics',
    schema: {
      type: 'object',
      properties: {
        totalLogs: { type: 'number' },
        actionCounts: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        recentActivity: { type: 'number', description: 'Logs in last 24 hours' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStats() {
    return this.auditService.getStats();
  }
}
