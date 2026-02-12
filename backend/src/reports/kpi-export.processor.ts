import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-log/audit-log.service';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface ExportJobData {
    periodId: number;
    adminId: number;
    adminName: string;
}

interface ExportJobResult {
    jobId: string;
    status: 'completed' | 'failed';
    filePath?: string;
    fileName?: string;
    totalRows?: number;
    error?: string;
}

@Processor('kpi-export')
@Injectable()
export class KpiExportProcessor extends WorkerHost {
    private readonly logger = new Logger(KpiExportProcessor.name);
    private readonly CHUNK_SIZE = 500; // Process 500 KPI details at a time
    private readonly EXPORT_DIR = path.join(process.cwd(), 'exports');

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) {
        super();
        // Ensure exports directory exists
        if (!fs.existsSync(this.EXPORT_DIR)) {
            fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
        }
    }

    async process(job: Job<ExportJobData>): Promise<ExportJobResult> {
        this.logger.log(`Starting KPI export for period ${job.data.periodId}`);

        try {
            // Update job progress
            await job.updateProgress(10);

            // Verify period exists
            const period = await this.prisma.period.findUnique({
                where: { id: job.data.periodId },
            });

            if (!period) {
                throw new Error(`Period with ID ${job.data.periodId} not found`);
            }

            await job.updateProgress(20);

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('KPI Export');

            // Define columns
            worksheet.columns = [
                { header: 'Employee ID', key: 'employeeId', width: 15 },
                { header: 'Employee Name', key: 'employeeName', width: 25 },
                { header: 'Department', key: 'department', width: 20 },
                { header: 'Manager', key: 'manager', width: 25 },
                { header: 'Plan Status', key: 'planStatus', width: 15 },
                { header: 'KPI Title', key: 'kpiTitle', width: 30 },
                { header: 'KPI Definition', key: 'kpiDefinition', width: 40 },
                { header: 'Polarity', key: 'polarity', width: 10 },
                { header: 'Weight (%)', key: 'weight', width: 12 },
                { header: 'Target', key: 'target', width: 15 },
                { header: 'Actual', key: 'actual', width: 15 },
                { header: 'Unit', key: 'unit', width: 10 },
                { header: 'Achievement (%)', key: 'achievement', width: 15 },
                { header: 'Final Score', key: 'finalScore', width: 15 },
                { header: 'Evidence URL', key: 'evidenceUrl', width: 30 },
                { header: 'Manager Comment', key: 'managerComment', width: 40 },
            ];

            // Style header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Get total count for progress calculation
            const totalDetails = await this.prisma.kpiDetail.count({
                where: {
                    header: {
                        periodId: job.data.periodId,
                    },
                },
            });

            await job.updateProgress(30);

            // Process data in chunks to avoid memory issues
            let processedRows = 0;
            let skip = 0;

            while (true) {
                // Fetch a chunk of KPI details with related data
                const details = await this.prisma.kpiDetail.findMany({
                    where: {
                        header: {
                            periodId: job.data.periodId,
                        },
                    },
                    include: {
                        header: {
                            include: {
                                user: {
                                    include: {
                                        manager: {
                                            select: {
                                                fullName: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    skip,
                    take: this.CHUNK_SIZE,
                    orderBy: [
                        { header: { user: { employeeId: 'asc' } } },
                        { id: 'asc' },
                    ],
                });

                if (details.length === 0) break;

                // Add rows to worksheet
                for (const detail of details) {
                    const user = detail.header.user;
                    const row = {
                        employeeId: user.employeeId,
                        employeeName: user.fullName,
                        department: user.deptCode || 'N/A',
                        manager: user.manager?.fullName || 'N/A',
                        planStatus: detail.header.status,
                        kpiTitle: detail.title,
                        kpiDefinition: detail.definition || '',
                        polarity: detail.polarity,
                        weight: Number(detail.weight),
                        target: Number(detail.targetValue),
                        actual: Number(detail.actualValue),
                        unit: detail.unit || '',
                        achievement: detail.achievementPct ? Number(detail.achievementPct) : 0,
                        finalScore: detail.finalScore ? Number(detail.finalScore) : 0,
                        evidenceUrl: detail.evidenceUrl || '',
                        managerComment: detail.managerComment || '',
                    };

                    worksheet.addRow(row);
                    processedRows++;
                }

                skip += this.CHUNK_SIZE;

                // Update progress (30% to 80%)
                const progress = 30 + Math.floor((processedRows / totalDetails) * 50);
                await job.updateProgress(Math.min(progress, 80));

                this.logger.log(`Processed ${processedRows} of ${totalDetails} rows`);
            }

            await job.updateProgress(85);

            // Apply conditional formatting for status column
            const statusColumn = worksheet.getColumn('planStatus');
            statusColumn.eachCell((cell, rowNumber) => {
                if (rowNumber > 1) { // Skip header
                    const value = cell.value as string;
                    switch (value) {
                        case 'APPROVED':
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFC6EFCE' },
                            };
                            break;
                        case 'REJECTED':
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFC7CE' },
                            };
                            break;
                        case 'SUBMITTED':
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFEB9C' },
                            };
                            break;
                    }
                }
            });

            await job.updateProgress(90);

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const fileName = `KPI_Export_Period${job.data.periodId}_${timestamp}.xlsx`;
            const filePath = path.join(this.EXPORT_DIR, fileName);

            // Write file
            await workbook.xlsx.writeFile(filePath);

            await job.updateProgress(100);

            this.logger.log(`Export completed: ${fileName} (${processedRows} rows)`);

            // Log export completion
            await this.auditService.log(
                'EXPORT_COMPLETED',
                {
                    userId: job.data.adminId,
                },
                {
                    resourceType: 'Period',
                    resourceId: job.data.periodId,
                    details: {
                        jobId: job.id,
                        fileName,
                        totalRows: processedRows,
                    },
                },
            );

            return {
                jobId: job.id || '',
                status: 'completed' as const,
                filePath,
                fileName,
                totalRows: processedRows,
            };
        } catch (error) {
            this.logger.error(`Export failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
