import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit-log/audit-log.service';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface BulkJobData {
    jobId: string;
    filePath: string;
    originalName: string;
    adminId: number;
}

interface RowData {
    action: string;
    employeeId: string;
    fullName: string;
    email: string;
    deptCode: string;
    role: string;
    managerId: string;
}

interface ErrorRow extends RowData {
    rowNumber: number;
    errorMessage: string;
}

@Processor('bulk-upload')
export class BulkUploadProcessor extends WorkerHost {
    private readonly logger = new Logger(BulkUploadProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly auditService: AuditService,
    ) {
        super();
    }

    async process(job: Job<BulkJobData>): Promise<void> {
        const { jobId, filePath } = job.data;
        this.logger.log(`Processing bulk upload job: ${jobId}`);

        try {
            // Update status to PROCESSING
            await this.prisma.bulkImportJob.update({
                where: { jobId },
                data: { status: 'PROCESSING' },
            });

            // Read Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const sheet = workbook.getWorksheet(1);

            if (!sheet) {
                throw new Error('No worksheet found in the uploaded file');
            }

            const rows: RowData[] = [];
            const errors: ErrorRow[] = [];

            // Parse rows (skip header row 1)
            sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
                if (rowNumber === 1) return; // Skip header

                const rowData: RowData = {
                    action: String(row.getCell(1).value || '').trim().toUpperCase(),
                    employeeId: String(row.getCell(2).value || '').trim(),
                    fullName: String(row.getCell(3).value || '').trim(),
                    email: String(row.getCell(4).value || '').trim(),
                    deptCode: String(row.getCell(5).value || '').trim(),
                    role: String(row.getCell(6).value || '').trim().toUpperCase(),
                    managerId: String(row.getCell(7).value || '').trim(),
                };

                // Skip completely empty rows
                if (!rowData.action && !rowData.employeeId) return;

                rows.push(rowData);
            });

            await this.prisma.bulkImportJob.update({
                where: { jobId },
                data: { totalRows: rows.length },
            });

            let successCount = 0;
            let failCount = 0;

            // Process each row individually (Partial Success)
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNumber = i + 2; // Account for header + 0-index

                try {
                    await this.processRow(row, rowNumber);
                    successCount++;
                } catch (error: any) {
                    failCount++;
                    errors.push({
                        ...row,
                        rowNumber,
                        errorMessage: error.message || 'Unknown error',
                    });
                }

                // Update progress periodically
                if ((i + 1) % 50 === 0 || i === rows.length - 1) {
                    await this.prisma.bulkImportJob.update({
                        where: { jobId },
                        data: {
                            successRows: successCount,
                            failedRows: failCount,
                        },
                    });
                }
            }

            // Generate error log if there are errors
            let errorLogUrl: string | null = null;
            if (errors.length > 0) {
                errorLogUrl = await this.generateErrorLog(jobId, errors);
            }

            // Final update
            await this.prisma.bulkImportJob.update({
                where: { jobId },
                data: {
                    status: 'COMPLETED',
                    successRows: successCount,
                    failedRows: failCount,
                    errorLogUrl,
                },
            });

            // Log bulk import completion
            await this.auditService.log(
                'BULK_IMPORT_COMPLETED',
                {
                    userId: job.data.adminId,
                },
                {
                    resourceType: 'BulkImportJob',
                    resourceId: undefined, // Job ID is a string, not an int
                    details: {
                        jobId,
                        filename: job.data.originalName,
                        successRows: successCount,
                        failedRows: failCount,
                        hasErrors: errors.length > 0,
                    },
                },
            );

            // Clean up uploaded file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            this.logger.log(
                `Job ${jobId} completed: ${successCount} success, ${failCount} failed`,
            );
        } catch (error: any) {
            this.logger.error(`Job ${jobId} failed: ${error.message}`);
            await this.prisma.bulkImportJob.update({
                where: { jobId },
                data: {
                    status: 'FAILED',
                    failedRows: -1,
                },
            });
            throw error;
        }
    }

    private async processRow(row: RowData, rowNumber: number): Promise<void> {
        // Validate action
        if (!['INSERT', 'UPDATE', 'DISABLE'].includes(row.action)) {
            throw new Error(
                `Invalid ACTION "${row.action}". Must be INSERT, UPDATE, or DISABLE.`,
            );
        }

        // EMPLOYEE_ID is always required
        if (!row.employeeId) {
            throw new Error('EMPLOYEE_ID is required.');
        }

        // Validate role if provided
        const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
        if (row.role && !validRoles.includes(row.role)) {
            throw new Error(
                `Invalid ROLE "${row.role}". Must be ADMIN, MANAGER, or EMPLOYEE.`,
            );
        }

        switch (row.action) {
            case 'INSERT':
                await this.handleInsert(row);
                break;
            case 'UPDATE':
                await this.handleUpdate(row);
                break;
            case 'DISABLE':
                await this.handleDisable(row);
                break;
        }
    }

    private async handleInsert(row: RowData): Promise<void> {
        // Required fields for INSERT
        if (!row.fullName) throw new Error('FULL_NAME is required for INSERT.');
        if (!row.email) throw new Error('EMAIL is required for INSERT.');

        // Check duplicates
        const existingById = await this.prisma.user.findUnique({
            where: { employeeId: row.employeeId },
        });
        if (existingById) {
            throw new Error(`EMPLOYEE_ID "${row.employeeId}" already exists.`);
        }

        const existingByEmail = await this.prisma.user.findUnique({
            where: { email: row.email },
        });
        if (existingByEmail) {
            throw new Error(`EMAIL "${row.email}" already exists (Email Duplicate).`);
        }

        // Resolve manager
        let managerId: number | null = null;
        if (row.managerId) {
            const manager = await this.prisma.user.findUnique({
                where: { employeeId: row.managerId },
            });
            if (!manager) {
                throw new Error(`Manager ID "${row.managerId}" Not Found.`);
            }
            managerId = manager.id;
        }

        const defaultPassword = await this.passwordService.hashPassword('password123');

        await this.prisma.user.create({
            data: {
                employeeId: row.employeeId,
                fullName: row.fullName,
                email: row.email,
                password: defaultPassword,
                deptCode: row.deptCode || null,
                role: (row.role as any) || 'EMPLOYEE',
                managerId,
                isActive: true,
            },
        });
    }

    private async handleUpdate(row: RowData): Promise<void> {
        const existing = await this.prisma.user.findUnique({
            where: { employeeId: row.employeeId },
        });
        if (!existing) {
            throw new Error(`EMPLOYEE_ID "${row.employeeId}" not found for UPDATE.`);
        }

        // Check email uniqueness if changing
        if (row.email && row.email !== existing.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: row.email },
            });
            if (emailExists) {
                throw new Error(
                    `EMAIL "${row.email}" already belongs to another user (Email Duplicate).`,
                );
            }
        }

        // Resolve manager
        let managerId: number | undefined = undefined;
        if (row.managerId) {
            const manager = await this.prisma.user.findUnique({
                where: { employeeId: row.managerId },
            });
            if (!manager) {
                throw new Error(`Manager ID "${row.managerId}" Not Found.`);
            }
            managerId = manager.id;
        }

        const updateData: any = {};
        if (row.fullName) updateData.fullName = row.fullName;
        if (row.email) updateData.email = row.email;
        if (row.deptCode) updateData.deptCode = row.deptCode;
        if (row.role) updateData.role = row.role;
        if (managerId !== undefined) updateData.managerId = managerId;

        await this.prisma.user.update({
            where: { employeeId: row.employeeId },
            data: updateData,
        });
    }

    private async handleDisable(row: RowData): Promise<void> {
        const existing = await this.prisma.user.findUnique({
            where: { employeeId: row.employeeId },
        });
        if (!existing) {
            throw new Error(
                `EMPLOYEE_ID "${row.employeeId}" not found for DISABLE.`,
            );
        }
        if (!existing.isActive) {
            throw new Error(
                `User "${row.employeeId}" is already disabled.`,
            );
        }

        await this.prisma.user.update({
            where: { employeeId: row.employeeId },
            data: { isActive: false },
        });
    }

    private async generateErrorLog(
        jobId: string,
        errors: ErrorRow[],
    ): Promise<string> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Error Log');

        // Error header styling (red)
        const headerStyle: Partial<ExcelJS.Style> = {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC00000' },
            },
            font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        sheet.columns = [
            { header: 'ROW_NUMBER', key: 'rowNumber', width: 12 },
            { header: 'ACTION', key: 'action', width: 12 },
            { header: 'EMPLOYEE_ID', key: 'employeeId', width: 18 },
            { header: 'FULL_NAME', key: 'fullName', width: 30 },
            { header: 'EMAIL', key: 'email', width: 30 },
            { header: 'DEPT_CODE', key: 'deptCode', width: 15 },
            { header: 'ROLE', key: 'role', width: 15 },
            { header: 'MANAGER_ID', key: 'managerId', width: 18 },
            { header: 'ERROR_MESSAGE', key: 'errorMessage', width: 50 },
        ];

        // Apply header styles
        const headerRow = sheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell: ExcelJS.Cell) => {
            cell.style = headerStyle;
        });

        // Add error rows
        for (const error of errors) {
            const row = sheet.addRow(error);
            // Highlight ERROR_MESSAGE cell
            row.getCell(9).font = { color: { argb: 'FFC00000' }, bold: true };
        }

        // Save error log
        const uploadsDir = path.resolve('./uploads/error-logs');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, `error_log_${jobId}.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        return filePath;
    }
}
