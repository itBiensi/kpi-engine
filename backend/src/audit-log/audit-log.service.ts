import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

export interface AuditContext {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditDetails {
  resourceType?: string;
  resourceId?: number;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit action
   * Uses try-catch to prevent audit failures from breaking main operations
   */
  async log(
    action: AuditAction,
    context: AuditContext,
    auditDetails?: AuditDetails,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: context.userId,
          resourceType: auditDetails?.resourceType,
          resourceId: auditDetails?.resourceId,
          details: auditDetails?.details || undefined,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    } catch (error) {
      // Log the error but don't throw - audit failures shouldn't break operations
      this.logger.error(`Failed to log audit action ${action}:`, error);
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async findAll(filters: GetAuditLogsDto) {
    const { action, userId, resourceType, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get statistics about audit logs
   */
  async getStats() {
    const [totalLogs, actionCounts, recentActivity] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const actionCountsMap = actionCounts.reduce((acc, item) => {
      acc[item.action] = item._count.action;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs,
      actionCounts: actionCountsMap,
      recentActivity,
    };
  }
}
