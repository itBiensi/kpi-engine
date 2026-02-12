import {
    Controller,
    Post,
    Get,
    Param,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Request,
    Res,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BulkUploadService } from './bulk-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Bulk Upload')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard)
export class BulkUploadController {
    constructor(private readonly bulkUploadService: BulkUploadService) { }

    @Post('users/bulk')
    @ApiOperation({ summary: 'Upload Excel file for bulk user import' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiResponse({
        status: 201, description: 'File uploaded and processing started', schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string' },
                status: { type: 'string' },
            },
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid file format' })
    @UseInterceptors(
        FileInterceptor('file', {
            dest: './uploads',
            fileFilter: (_req, file, cb) => {
                if (
                    file.mimetype ===
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.originalname.endsWith('.xlsx')
                ) {
                    cb(null, true);
                } else {
                    cb(new Error('Only .xlsx files are allowed'), false);
                }
            },
        }),
    )
    async uploadBulk(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        const adminId = req.user?.id;
        return this.bulkUploadService.queueUpload(file, adminId);
    }

    @Get('jobs/:jobId')
    @ApiOperation({ summary: 'Get bulk upload job status' })
    @ApiParam({ name: 'jobId', type: String, description: 'Job ID' })
    @ApiResponse({ status: 200, description: 'Job status retrieved' })
    async getJobStatus(@Param('jobId') jobId: string) {
        return this.bulkUploadService.getJobStatus(jobId);
    }

    @Get('jobs')
    @ApiOperation({ summary: 'List all bulk upload jobs' })
    @ApiResponse({ status: 200, description: 'List of all jobs' })
    async listJobs() {
        return this.bulkUploadService.listJobs();
    }

    @Get('users/template')
    @ApiOperation({ summary: 'Download bulk user upload Excel template' })
    @ApiResponse({ status: 200, description: 'Template file downloaded' })
    async downloadTemplate(@Res() res: any) {
        const buffer = await this.bulkUploadService.generateTemplate();
        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition':
                'attachment; filename=bulk_user_template.xlsx',
        });
        res.send(buffer);
    }

    @Get('jobs/:jobId/error-log')
    @ApiOperation({ summary: 'Download error log for a failed job' })
    @ApiParam({ name: 'jobId', type: String, description: 'Job ID' })
    @ApiResponse({ status: 200, description: 'Error log downloaded' })
    @ApiResponse({ status: 404, description: 'Error log not available' })
    async downloadErrorLog(
        @Param('jobId') jobId: string,
        @Res() res: any,
    ) {
        const job = await this.bulkUploadService.getJobStatus(jobId);
        if (!job.errorLogUrl) {
            throw new NotFoundException('No error log available for this job');
        }

        const filePath = path.resolve(job.errorLogUrl);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('Error log file not found');
        }

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=error_log_${jobId}.xlsx`,
        });
        res.sendFile(filePath);
    }
}
