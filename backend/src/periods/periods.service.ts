import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { AuditService } from '../audit-log/audit-log.service';

@Injectable()
export class PeriodsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) {}

    /**
     * Create a new period
     * Validates dates and handles active period logic
     */
    async create(createPeriodDto: CreatePeriodDto, adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Date validation
        const startDate = new Date(createPeriodDto.startDate);
        const endDate = new Date(createPeriodDto.endDate);

        if (endDate < startDate) {
            throw new BadRequestException('End date cannot be earlier than start date');
        }

        // Check for overlapping periods
        const overlapping = await this.prisma.period.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            { startDate: { lte: endDate } },
                            { endDate: { gte: startDate } },
                        ],
                    },
                ],
            },
        });

        if (overlapping) {
            throw new BadRequestException(
                `Period overlaps with existing period: ${overlapping.name}`,
            );
        }

        // If status is ACTIVE, deactivate all other periods
        if (createPeriodDto.status === 'ACTIVE') {
            await this.deactivateAllPeriods();
        }

        const period = await this.prisma.period.create({
            data: {
                name: createPeriodDto.name,
                startDate,
                endDate,
                cycleType: createPeriodDto.cycleType,
                status: createPeriodDto.status || 'SETUP',
                isActive: createPeriodDto.status === 'ACTIVE',
            },
        });

        // Log period creation
        await this.auditService.log(
            'PERIOD_CREATED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                resourceType: 'Period',
                resourceId: period.id,
                details: {
                    name: period.name,
                    cycleType: period.cycleType,
                    status: period.status,
                },
            },
        );

        return period;
    }

    /**
     * Get all periods
     */
    async findAll(params?: { status?: string; isActive?: boolean }) {
        const where: any = {};

        if (params?.status) {
            where.status = params.status;
        }

        if (params?.isActive !== undefined) {
            where.isActive = params.isActive;
        }

        return this.prisma.period.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get active period
     */
    async findActive() {
        const activePeriod = await this.prisma.period.findFirst({
            where: { isActive: true },
        });

        if (!activePeriod) {
            throw new NotFoundException('No active period found');
        }

        return activePeriod;
    }

    /**
     * Get period by ID
     */
    async findOne(id: number) {
        const period = await this.prisma.period.findUnique({
            where: { id },
        });

        if (!period) {
            throw new NotFoundException(`Period with ID ${id} not found`);
        }

        return period;
    }

    /**
     * Update a period
     */
    async update(id: number, updatePeriodDto: UpdatePeriodDto, adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Check if period exists
        const existingPeriod = await this.findOne(id);

        // Date validation if dates are being updated
        if (updatePeriodDto.startDate || updatePeriodDto.endDate) {
            const period = await this.findOne(id);
            const startDate = updatePeriodDto.startDate
                ? new Date(updatePeriodDto.startDate)
                : period.startDate;
            const endDate = updatePeriodDto.endDate
                ? new Date(updatePeriodDto.endDate)
                : period.endDate;

            if (endDate < startDate) {
                throw new BadRequestException('End date cannot be earlier than start date');
            }
        }

        // If changing status to ACTIVE, deactivate all other periods
        if (updatePeriodDto.status === 'ACTIVE') {
            await this.deactivateAllPeriods();
        }

        const data: any = {};
        if (updatePeriodDto.name) data.name = updatePeriodDto.name;
        if (updatePeriodDto.startDate) data.startDate = new Date(updatePeriodDto.startDate);
        if (updatePeriodDto.endDate) data.endDate = new Date(updatePeriodDto.endDate);
        if (updatePeriodDto.cycleType) data.cycleType = updatePeriodDto.cycleType;
        if (updatePeriodDto.status) {
            data.status = updatePeriodDto.status;
            data.isActive = updatePeriodDto.status === 'ACTIVE';
        }

        const updated = await this.prisma.period.update({
            where: { id },
            data,
        });

        // Log period update
        await this.auditService.log(
            'PERIOD_UPDATED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                resourceType: 'Period',
                resourceId: id,
                details: {
                    updatedFields: updatePeriodDto,
                },
            },
        );

        // Log status change specifically if status was changed
        if (updatePeriodDto.status && updatePeriodDto.status !== existingPeriod.status) {
            await this.auditService.log(
                'PERIOD_STATUS_CHANGED',
                {
                    userId: adminContext?.userId,
                    ipAddress: adminContext?.ipAddress,
                    userAgent: adminContext?.userAgent,
                },
                {
                    resourceType: 'Period',
                    resourceId: id,
                    details: {
                        previousStatus: existingPeriod.status,
                        newStatus: updatePeriodDto.status,
                    },
                },
            );
        }

        return updated;
    }

    /**
     * Delete a period
     */
    async remove(id: number, adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Check if period exists
        const period = await this.findOne(id);

        // Check if period has KPI data
        const kpiCount = await this.prisma.kpiHeader.count({
            where: { periodId: id },
        });

        if (kpiCount > 0) {
            throw new BadRequestException(
                `Cannot delete period with ${kpiCount} associated KPI records. Please delete KPIs first or set period to CLOSED.`,
            );
        }

        await this.prisma.period.delete({
            where: { id },
        });

        // Log period deletion
        await this.auditService.log(
            'PERIOD_DELETED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                resourceType: 'Period',
                resourceId: id,
                details: {
                    name: period.name,
                    cycleType: period.cycleType,
                    status: period.status,
                },
            },
        );

        return { message: 'Period deleted successfully' };
    }

    /**
     * Deactivate all periods (helper method)
     */
    private async deactivateAllPeriods() {
        await this.prisma.period.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
    }
}
