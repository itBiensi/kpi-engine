import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-log/audit-log.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class BulkUploadService {
    constructor(
        @InjectQueue('bulk-upload') private readonly bulkQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    async queueUpload(file: Express.Multer.File, adminId: number, context?: { ipAddress?: string; userAgent?: string }) {
        // Create job record in DB
        const job = await this.prisma.bulkImportJob.create({
            data: {
                adminId,
                filename: file.originalname,
                status: 'QUEUED',
            },
        });

        // Add to BullMQ queue
        await this.bulkQueue.add('process-bulk', {
            jobId: job.jobId,
            filePath: file.path,
            originalName: file.originalname,
            adminId,
        });

        // Log bulk import started
        await this.auditService.log(
            'BULK_IMPORT_STARTED',
            {
                userId: adminId,
                ipAddress: context?.ipAddress,
                userAgent: context?.userAgent,
            },
            {
                resourceType: 'BulkImportJob',
                resourceId: undefined, // Job ID is a string, not an int
                details: {
                    jobId: job.jobId,
                    filename: file.originalname,
                },
            },
        );

        return { job_id: job.jobId, status: 'QUEUED' };
    }

    async getJobStatus(jobId: string) {
        const job = await this.prisma.bulkImportJob.findUnique({
            where: { jobId },
        });
        if (!job) throw new NotFoundException(`Job ${jobId} not found`);

        return {
            jobId: job.jobId,
            status: job.status,
            filename: job.filename,
            totalRows: job.totalRows,
            successRows: job.successRows,
            failedRows: job.failedRows,
            errorLogUrl: job.errorLogUrl,
            createdAt: job.createdAt,
            progress:
                job.totalRows > 0
                    ? Math.round(
                        ((job.successRows + job.failedRows) / job.totalRows) * 100,
                    )
                    : 0,
        };
    }

    async listJobs() {
        const jobs = await this.prisma.bulkImportJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return { data: jobs };
    }

    async generateTemplate(): Promise<any> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Users');

        // Header styling
        const headerStyle: Partial<ExcelJS.Style> = {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F4E79' },
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
            { header: 'ACTION', key: 'action', width: 12 },
            { header: 'EMPLOYEE_ID', key: 'employee_id', width: 18 },
            { header: 'FULL_NAME', key: 'full_name', width: 30 },
            { header: 'EMAIL', key: 'email', width: 30 },
            { header: 'DEPT_CODE', key: 'dept_code', width: 15 },
            { header: 'ROLE', key: 'role', width: 15 },
            { header: 'MANAGER_ID', key: 'manager_id', width: 18 },
        ];

        // Apply header styles
        const headerRow = sheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell: ExcelJS.Cell) => {
            cell.style = headerStyle;
        });

        // Add example rows
        sheet.addRow({
            action: 'INSERT',
            employee_id: 'EMP001',
            full_name: 'John Doe',
            email: 'john.doe@company.com',
            dept_code: 'IT',
            role: 'EMPLOYEE',
            manager_id: 'ADM001',
        });
        sheet.addRow({
            action: 'UPDATE',
            employee_id: 'EMP002',
            full_name: 'Jane Smith (Updated)',
            email: 'jane.smith@company.com',
            dept_code: 'HR',
            role: 'MANAGER',
            manager_id: '',
        });
        sheet.addRow({
            action: 'DISABLE',
            employee_id: 'EMP003',
            full_name: '',
            email: '',
            dept_code: '',
            role: '',
            manager_id: '',
        });

        // Add validation sheet
        const infoSheet = workbook.addWorksheet('Instructions');
        infoSheet.getColumn(1).width = 20;
        infoSheet.getColumn(2).width = 60;
        infoSheet.addRow(['Column', 'Description']);
        infoSheet.addRow(['ACTION', 'INSERT (new user), UPDATE (modify), DISABLE (deactivate)']);
        infoSheet.addRow(['EMPLOYEE_ID', 'Unique employee identifier (e.g. EMP001)']);
        infoSheet.addRow(['FULL_NAME', 'Employee full name (required for INSERT)']);
        infoSheet.addRow(['EMAIL', 'Unique email address (required for INSERT)']);
        infoSheet.addRow(['DEPT_CODE', 'Department code (e.g. IT, HR, FIN)']);
        infoSheet.addRow(['ROLE', 'ADMIN, MANAGER, or EMPLOYEE']);
        infoSheet.addRow(['MANAGER_ID', 'Employee ID of the manager (optional)']);

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
}
