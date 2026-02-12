import { Injectable, NotFoundException } from '@nestjs/common';
import { kpiExportQueue } from './kpi-export.queue';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-log/audit-log.service';
import * as fs from 'fs';

@Injectable()
export class ReportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) {}

    /**
     * Trigger KPI export job
     */
    async triggerKpiExport(periodId: number, adminId: number, adminName: string, context?: { ipAddress?: string; userAgent?: string }) {
        // Verify period exists
        const period = await this.prisma.period.findUnique({
            where: { id: periodId },
        });

        if (!period) {
            throw new NotFoundException(`Period with ID ${periodId} not found`);
        }

        // Create job
        const job = await kpiExportQueue.add('export-kpi', {
            periodId,
            adminId,
            adminName,
        });

        // Log export triggered
        await this.auditService.log(
            'EXPORT_TRIGGERED',
            {
                userId: adminId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'Period',
                resourceId: periodId,
                details: {
                    jobId: job.id,
                    periodName: period.name,
                },
            },
        );

        return {
            jobId: job.id,
            periodId,
            periodName: period.name,
            status: 'queued',
            message: 'Export job has been queued. Please check status using the job ID.',
        };
    }

    /**
     * Get export job status
     */
    async getExportStatus(jobId: string) {
        const job = await kpiExportQueue.getJob(jobId);

        if (!job) {
            throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        const state = await job.getState();
        const progress = job.progress;
        const returnvalue = job.returnvalue;

        return {
            jobId: job.id,
            status: state,
            progress,
            result: state === 'completed' ? returnvalue : null,
            failedReason: state === 'failed' ? job.failedReason : null,
        };
    }

    /**
     * Get download file stream
     */
    async getExportFile(jobId: string) {
        const job = await kpiExportQueue.getJob(jobId);

        if (!job) {
            throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        const state = await job.getState();

        if (state !== 'completed') {
            throw new NotFoundException(`Job is not completed yet. Current status: ${state}`);
        }

        const result = job.returnvalue;

        if (!result || !result.filePath) {
            throw new NotFoundException('Export file not found');
        }

        // Check if file exists
        if (!fs.existsSync(result.filePath)) {
            throw new NotFoundException('Export file has been removed or does not exist');
        }

        return {
            filePath: result.filePath,
            fileName: result.fileName,
            totalRows: result.totalRows,
        };
    }

    /**
     * List recent export jobs
     */
    async listRecentExports(limit = 10) {
        const jobs = await kpiExportQueue.getJobs(
            ['completed', 'failed', 'active', 'waiting'],
            0,
            limit,
        );

        return Promise.all(
            jobs.map(async (job) => ({
                jobId: job.id,
                periodId: job.data.periodId,
                adminName: job.data.adminName,
                status: await job.getState(),
                progress: job.progress,
                createdAt: new Date(job.timestamp),
                result: job.returnvalue,
            })),
        );
    }
}
