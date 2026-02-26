import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringEngine, PolarityType, ScoringConfigValues } from './scoring.engine';
import { Prisma } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit-log/audit-log.service';
import { ScoringConfigService } from '../scoring-config/scoring-config.service';

export class KpiDetailInput {
    title: string;
    definition?: string;
    polarity: 'MAX' | 'MIN' | 'BINARY';
    weight: number;
    targetValue: number;
    unit?: string;
}

export class CreateKpiPlanInput {
    userId: number;
    periodId: number;
    details: KpiDetailInput[];
}

@Injectable()
export class KpiService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly auditService: AuditService,
        private readonly scoringConfigService: ScoringConfigService,
    ) { }

    /**
     * Create a new KPI Plan with weight validation
     */
    async createPlan(input: CreateKpiPlanInput, context?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Validate total weight is 100
        const totalWeight = input.details.reduce((sum, d) => sum + d.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new BadRequestException(
                `Total weight must be 100%. Current total: ${totalWeight}%`,
            );
        }

        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: input.userId },
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${input.userId} not found`);
        }

        // Validate period exists
        const period = await this.prisma.period.findUnique({
            where: { id: input.periodId },
        });
        if (!period) {
            throw new NotFoundException(`Period with ID ${input.periodId} not found`);
        }

        // Validate uniqueness of period for user
        const existing = await this.prisma.kpiHeader.findFirst({
            where: {
                userId: input.userId,
                periodId: input.periodId,
            },
        });

        if (existing) {
            throw new BadRequestException(
                `KPI Plan for this user and period already exists (ID: ${existing.id})`,
            );
        }

        // Create Header and Details transactionally
        const header = await this.prisma.$transaction(async (tx) => {
            const createdHeader = await tx.kpiHeader.create({
                data: {
                    userId: input.userId,
                    periodId: input.periodId,
                    status: 'DRAFT',
                    totalScore: 0,
                },
            });

            // Calculate initial scores (all achievement 0 for now)
            await tx.kpiDetail.createMany({
                data: input.details.map((d) => ({
                    headerId: createdHeader.id,
                    title: d.title,
                    definition: d.definition,
                    polarity: d.polarity,
                    weight: d.weight,
                    targetValue: d.targetValue,
                    actualValue: 0,
                    achievementPct: 0,
                    finalScore: 0,
                    unit: d.unit, // Pass unit here
                })),
            });

            return createdHeader;
        });

        // Log KPI creation
        await this.auditService.log(
            'KPI_CREATED',
            {
                userId: context?.userId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiHeader',
                resourceId: header.id,
                details: {
                    targetUserId: input.userId,
                    periodId: input.periodId,
                    kpiCount: input.details.length,
                },
            },
        );

        // Fetch the complete plan with details AFTER transaction commits
        return this.findPlanById(header.id, { role: 'ADMIN', id: 0 });
    }

    /**
     * Get KPI plans with optional filters and access control
     */
    async findPlans(params: {
        userId?: number;
        periodId?: number;
        status?: string;
        skip?: number;
        take?: number;
        currentUser?: { id: number; role: string };
    }) {
        const where: Prisma.KpiHeaderWhereInput = {};

        // 1. Access Control Logic
        if (params.currentUser) {
            const { id, role } = params.currentUser;
            if (role === 'ADMIN') {
                // Admin sees all, respect userId filter if provided
                if (params.userId) where.userId = params.userId;
            } else if (role === 'MANAGER') {
                // Manager sees self + subordinates
                const subordinateIds = await this.usersService.getSubordinateIds(id);
                const allowedIds = [id, ...subordinateIds];

                if (params.userId) {
                    // If requesting specific user, verify it's allowed
                    if (!allowedIds.includes(params.userId)) {
                        throw new ForbiddenException('Access denied to this user\'s KPIs');
                    }
                    where.userId = params.userId;
                } else {
                    // Otherwise show all allowed
                    where.userId = { in: allowedIds };
                }
            } else {
                // Employee sees only self
                if (params.userId && params.userId !== id) {
                    throw new ForbiddenException('Access denied');
                }
                where.userId = id;
            }
        } else if (params.userId) {
            // Fallback for internal calls without currentUser
            where.userId = params.userId;
        }

        // 2. Apply other filters
        if (params.periodId) where.periodId = params.periodId;
        if (params.status) where.status = params.status as any;

        const [data, total] = await Promise.all([
            this.prisma.kpiHeader.findMany({
                where,
                skip: params.skip || 0,
                take: params.take || 20,
                include: {
                    user: {
                        select: { fullName: true, employeeId: true, deptCode: true },
                    },
                    details: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.kpiHeader.count({ where }),
        ]);

        return { data, total };
    }

    /**
     * Get a single KPI plan with access control
     */
    async findPlanById(id: number, currentUser?: { id: number; role: string }) {
        const plan = await this.prisma.kpiHeader.findUnique({
            where: { id },
            include: {
                user: {
                    select: { fullName: true, employeeId: true, deptCode: true },
                },
                details: {
                    orderBy: { id: 'asc' }
                },
            },
        });
        if (!plan) throw new NotFoundException(`KPI Plan #${id} not found`);

        // Access Control
        if (currentUser) {
            const { id: userId, role } = currentUser;
            if (role !== 'ADMIN') {
                const isOwner = plan.userId === userId;
                let isManagerOfOwner = false;

                if (role === 'MANAGER') {
                    const subordinateIds = await this.usersService.getSubordinateIds(userId);
                    isManagerOfOwner = subordinateIds.includes(plan.userId);
                }

                if (!isOwner && !isManagerOfOwner) {
                    throw new ForbiddenException('Access denied to this KPI plan');
                }
            }
        }

        return plan;
    }

    /**
     * Submit a KPI plan (Employee action)
     * Transition: DRAFT/REJECTED → SUBMITTED
     * Validations:
     * 1. Total weight must be 100%
     * 2. Period must be ACTIVE
     */
    async submitPlan(id: number, currentUserId: number, context?: { ipAddress?: string; userAgent?: string }) {
        const plan = await this.prisma.kpiHeader.findUnique({
            where: { id },
            include: {
                details: true,
                period: true,
                user: true,
            },
        });

        if (!plan) {
            throw new NotFoundException(`KPI Plan #${id} not found`);
        }

        // Check ownership
        if (plan.userId !== currentUserId) {
            throw new ForbiddenException('You can only submit your own KPI plan');
        }

        // Check current status
        if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
            throw new BadRequestException(
                `Cannot submit plan with status ${plan.status}. Plan must be in DRAFT or REJECTED status.`,
            );
        }

        // Validation 1: Total weight must be 100%
        const totalWeight = plan.details.reduce((sum, d) => sum + Number(d.weight), 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new BadRequestException(
                `Total weight must be 100%. Current total: ${totalWeight.toFixed(2)}%`,
            );
        }

        // Validation 2: Period must be ACTIVE
        if (plan.period.status !== 'ACTIVE') {
            throw new BadRequestException(
                `Cannot submit during ${plan.period.status} period. Period must be ACTIVE.`,
            );
        }

        // Update status to SUBMITTED
        const updated = await this.prisma.kpiHeader.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
                managerComment: null, // Clear any previous rejection comment
            },
        });

        // Log KPI submission
        await this.auditService.log(
            'KPI_SUBMITTED',
            {
                userId: currentUserId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiHeader',
                resourceId: id,
                details: {
                    periodId: plan.periodId,
                    previousStatus: plan.status,
                },
            },
        );

        return updated;
    }

    /**
     * Approve a KPI plan (Manager action)
     * Transition: SUBMITTED → APPROVED
     * Validation: Current user must be the manager of the plan owner
     */
    async approvePlan(id: number, currentUserId: number, context?: { ipAddress?: string; userAgent?: string }) {
        const plan = await this.prisma.kpiHeader.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, fullName: true, managerId: true },
                },
            },
        });

        if (!plan) {
            throw new NotFoundException(`KPI Plan #${id} not found`);
        }

        // Check status
        if (plan.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Cannot approve plan with status ${plan.status}. Plan must be SUBMITTED.`,
            );
        }

        // Check if current user is the manager of the plan owner
        if (plan.user.managerId !== currentUserId) {
            throw new ForbiddenException(
                'You can only approve plans of your direct subordinates',
            );
        }

        // Update status to APPROVED
        const updated = await this.prisma.kpiHeader.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approverId: currentUserId,
                managerComment: null, // Clear any previous comments
            },
        });

        // Log KPI approval
        await this.auditService.log(
            'KPI_APPROVED',
            {
                userId: currentUserId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiHeader',
                resourceId: id,
                details: {
                    targetUserId: plan.userId,
                    periodId: plan.periodId,
                },
            },
        );

        return updated;
    }

    /**
     * Reject a KPI plan (Manager action)
     * Transition: SUBMITTED → REJECTED
     * Validation: manager_comment is mandatory
     */
    async rejectPlan(id: number, currentUserId: number, managerComment: string, context?: { ipAddress?: string; userAgent?: string }) {
        if (!managerComment || managerComment.trim().length === 0) {
            throw new BadRequestException('Manager comment is required when rejecting a plan');
        }

        const plan = await this.prisma.kpiHeader.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, fullName: true, managerId: true },
                },
            },
        });

        if (!plan) {
            throw new NotFoundException(`KPI Plan #${id} not found`);
        }

        // Check status
        if (plan.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Cannot reject plan with status ${plan.status}. Plan must be SUBMITTED.`,
            );
        }

        // Check if current user is the manager of the plan owner
        if (plan.user.managerId !== currentUserId) {
            throw new ForbiddenException(
                'You can only reject plans of your direct subordinates',
            );
        }

        // Update status to REJECTED
        const updated = await this.prisma.kpiHeader.update({
            where: { id },
            data: {
                status: 'REJECTED',
                managerComment,
                approverId: currentUserId,
                approvedAt: null, // Clear approval date if previously approved
            },
        });

        // Log KPI rejection
        await this.auditService.log(
            'KPI_REJECTED',
            {
                userId: currentUserId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiHeader',
                resourceId: id,
                details: {
                    targetUserId: plan.userId,
                    periodId: plan.periodId,
                    comment: managerComment,
                },
            },
        );

        return updated;
    }

    /**
     * Cancel submission (Employee action)
     * Transition: SUBMITTED → DRAFT
     */
    async cancelSubmission(id: number, currentUserId: number) {
        const plan = await this.prisma.kpiHeader.findUnique({
            where: { id },
        });

        if (!plan) {
            throw new NotFoundException(`KPI Plan #${id} not found`);
        }

        // Check ownership
        if (plan.userId !== currentUserId) {
            throw new ForbiddenException('You can only cancel your own submission');
        }

        // Check status
        if (plan.status !== 'SUBMITTED') {
            throw new BadRequestException(
                `Cannot cancel submission with status ${plan.status}. Plan must be SUBMITTED.`,
            );
        }

        // Update status back to DRAFT
        return this.prisma.kpiHeader.update({
            where: { id },
            data: {
                status: 'DRAFT',
                submittedAt: null,
                managerComment: null,
            },
        });
    }

    /**
     * Update actual achievement and recalculate scores
     */
    async updateAchievement(
        detailId: number,
        actualValue: number,
        evidenceUrl?: string,
        currentUser?: { id: number; role: string },
        context?: { ipAddress?: string; userAgent?: string },
    ) {
        const detail = await this.prisma.kpiDetail.findUnique({
            where: { id: detailId },
            include: { header: true },
        });
        if (!detail) throw new NotFoundException(`KPI Detail #${detailId} not found`);

        // Access Control
        if (currentUser) {
            const { id: userId, role } = currentUser;
            const planOwnerId = detail.header.userId;

            if (role !== 'ADMIN') {
                const isOwner = planOwnerId === userId;
                // Managers can update their subordinates' achievements? Usually yes.
                // For now sticking to strict ownership or admin, or manager relation
                let isManagerOfOwner = false;
                if (role === 'MANAGER') {
                    const subordinateIds = await this.usersService.getSubordinateIds(userId);
                    isManagerOfOwner = subordinateIds.includes(planOwnerId);
                }

                if (!isOwner && !isManagerOfOwner) {
                    throw new ForbiddenException('Access denied to update this KPI');
                }
            }
        }

        if (detail.header.status === 'LOCKED') {
            throw new BadRequestException('Cannot update achievements on a LOCKED plan.');
        }

        // Fetch dynamic scoring configuration
        const config = await this.scoringConfigService.getConfig();
        const scoringConfig: ScoringConfigValues = {
            capMultiplier: Number(config.capMultiplier),
            gradeAThreshold: Number(config.gradeAThreshold),
            gradeBThreshold: Number(config.gradeBThreshold),
            gradeCThreshold: Number(config.gradeCThreshold),
            gradeDThreshold: Number(config.gradeDThreshold),
        };

        // Calculate score using the engine with dynamic config
        const result = ScoringEngine.calculate({
            polarity: detail.polarity as PolarityType,
            weight: Number(detail.weight),
            targetValue: Number(detail.targetValue),
            actualValue,
        }, scoringConfig);

        // Update the detail
        const updatedDetail = await this.prisma.kpiDetail.update({
            where: { id: detailId },
            data: {
                actualValue,
                achievementPct: result.achievementPct,
                finalScore: result.finalScore,
                evidenceUrl: evidenceUrl || detail.evidenceUrl,
            },
        });

        // Recalculate header total
        const allDetails = await this.prisma.kpiDetail.findMany({
            where: { headerId: detail.headerId },
        });

        const totalScore = allDetails.reduce(
            (sum, d) => sum + Number(d.finalScore || 0),
            0,
        );
        const roundedTotal = Math.round(totalScore * 100) / 100;
        const finalGrade = ScoringEngine.determineGrade(roundedTotal, scoringConfig);

        await this.prisma.kpiHeader.update({
            where: { id: detail.headerId },
            data: { totalScore: roundedTotal, finalGrade },
        });

        // Log achievement update
        await this.auditService.log(
            'KPI_ACHIEVEMENT_UPDATED',
            {
                userId: currentUser?.id,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiDetail',
                resourceId: detailId,
                details: {
                    headerId: detail.headerId,
                    targetUserId: detail.header.userId,
                    previousActual: Number(detail.actualValue),
                    newActual: actualValue,
                    achievementPct: result.achievementPct,
                    finalScore: result.finalScore,
                },
            },
        );

        return {
            ...updatedDetail,
            headerTotalScore: roundedTotal,
            headerFinalGrade: finalGrade,
        };
    }

    /**
     * Cascade KPI from manager to subordinate
     */
    async cascadeKpi(
        sourceDetailId: number,
        targetUserId: number,
        periodId: number,
        weight: number,
    ) {
        const sourceDetail = await this.prisma.kpiDetail.findUnique({
            where: { id: sourceDetailId },
        });
        if (!sourceDetail)
            throw new NotFoundException(`Source KPI #${sourceDetailId} not found`);

        // Ensure the target user exists
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!targetUser)
            throw new NotFoundException(`Target user #${targetUserId} not found`);

        // Find or create header for target user
        let header = await this.prisma.kpiHeader.findUnique({
            where: { userId_periodId: { userId: targetUserId, periodId } },
        });

        if (!header) {
            header = await this.prisma.kpiHeader.create({
                data: { userId: targetUserId, periodId, status: 'DRAFT' },
            });
        }

        if (header.status !== 'DRAFT') {
            throw new BadRequestException(
                'Can only cascade to DRAFT plans.',
            );
        }

        return this.prisma.kpiDetail.create({
            data: {
                headerId: header.id,
                title: sourceDetail.title,
                definition: sourceDetail.definition,
                polarity: sourceDetail.polarity,
                weight,
                targetValue: Number(sourceDetail.targetValue),
            },
        });
    }

    /**
     * Update manager/admin comment on a specific KPI item
     * Only managers (of plan owner) or admins can add comments
     */
    async updateKpiItemComment(
        detailId: number,
        comment: string,
        currentUserId: number,
        currentUserRole: string,
        context?: { ipAddress?: string; userAgent?: string },
    ) {
        const detail = await this.prisma.kpiDetail.findUnique({
            where: { id: detailId },
            include: {
                header: {
                    include: {
                        user: {
                            select: { id: true, fullName: true, managerId: true },
                        },
                    },
                },
            },
        });

        if (!detail) {
            throw new NotFoundException(`KPI Detail #${detailId} not found`);
        }

        // Authorization: Only admin or manager of the plan owner can add comments
        if (currentUserRole !== 'ADMIN') {
            const planOwnerId = detail.header.userId;
            const planOwnerManagerId = detail.header.user.managerId;

            if (currentUserRole !== 'MANAGER' || currentUserId !== planOwnerManagerId) {
                throw new ForbiddenException(
                    'Only admins or the direct manager can add comments to KPI items',
                );
            }
        }

        // Update the comment
        const updated = await this.prisma.kpiDetail.update({
            where: { id: detailId },
            data: { managerComment: comment },
        });

        // Log comment added
        await this.auditService.log(
            'KPI_COMMENT_ADDED',
            {
                userId: currentUserId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'KpiDetail',
                resourceId: detailId,
                details: {
                    headerId: detail.headerId,
                    targetUserId: detail.header.userId,
                    commentLength: comment.length,
                },
            },
        );

        return {
            message: 'Comment added successfully',
            detailId: updated.id,
            comment: updated.managerComment,
        };
    }

    /**
     * Delete all KPI data (admin only)
     */
    async deleteAllKpiData(adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Delete details first (foreign key constraint)
        const detailsDeleted = await this.prisma.kpiDetail.deleteMany({});

        // Delete headers
        const headersDeleted = await this.prisma.kpiHeader.deleteMany({});

        // Log KPI data deletion
        await this.auditService.log(
            'KPI_ALL_DELETED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                details: {
                    detailsDeleted: detailsDeleted.count,
                    headersDeleted: headersDeleted.count,
                },
            },
        );

        return {
            message: 'All KPI data deleted successfully',
            detailsDeleted: detailsDeleted.count,
            headersDeleted: headersDeleted.count,
        };
    }

    /**
     * Get Nine-Box Grid data for talent management
     * Performance (X-axis): Based on totalScore — Low (0–50), Medium (50–75), High (75+)
     * Potential (Y-axis): Based on finalGrade — Low (E/D), Medium (C), High (A/B)
     * Admin only
     */
    async getNineBoxData(periodId?: number) {
        const where: Prisma.KpiHeaderWhereInput = {};
        if (periodId) where.periodId = periodId;

        const headers = await this.prisma.kpiHeader.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        employeeId: true,
                        deptCode: true,
                        role: true,
                    },
                },
                period: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { totalScore: 'desc' },
        });

        const employees = headers.map((h) => {
            const score = Number(h.totalScore);
            const grade = h.finalGrade || 'E';

            // Performance level based on totalScore
            let performanceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
            if (score >= 75) performanceLevel = 'HIGH';
            else if (score >= 50) performanceLevel = 'MEDIUM';
            else performanceLevel = 'LOW';

            // Potential level based on finalGrade
            let potentialLevel: 'LOW' | 'MEDIUM' | 'HIGH';
            if (grade === 'A' || grade === 'B') potentialLevel = 'HIGH';
            else if (grade === 'C') potentialLevel = 'MEDIUM';
            else potentialLevel = 'LOW';

            return {
                userId: h.user.id,
                fullName: h.user.fullName,
                employeeId: h.user.employeeId,
                deptCode: h.user.deptCode,
                role: h.user.role,
                totalScore: score,
                finalGrade: grade,
                performanceLevel,
                potentialLevel,
                periodId: h.period.id,
                periodName: h.period.name,
                planId: h.id,
                status: h.status,
            };
        });

        // Build grid summary
        const grid: Record<string, number> = {
            'HIGH_HIGH': 0, 'HIGH_MEDIUM': 0, 'HIGH_LOW': 0,
            'MEDIUM_HIGH': 0, 'MEDIUM_MEDIUM': 0, 'MEDIUM_LOW': 0,
            'LOW_HIGH': 0, 'LOW_MEDIUM': 0, 'LOW_LOW': 0,
        };

        employees.forEach((e) => {
            const key = `${e.performanceLevel}_${e.potentialLevel}`;
            grid[key] = (grid[key] || 0) + 1;
        });

        return {
            employees,
            grid,
            total: employees.length,
        };
    }
}
