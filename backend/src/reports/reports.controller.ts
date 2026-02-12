import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
    Response,
    StreamableFile,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import * as fs from 'fs';
import type { Response as ExpressResponse } from 'express';

@ApiTags('Reports (Admin Only)')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('kpi-export')
    @ApiOperation({ summary: 'Trigger KPI export job (Admin only)' })
    @ApiQuery({
        name: 'period_id',
        type: Number,
        description: 'Period ID to export',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Export job created successfully',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string' },
                periodId: { type: 'number' },
                periodName: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 404, description: 'Period not found' })
    async triggerKpiExport(
        @Query('period_id') periodId: string,
        @Request() req: any,
    ) {
        const periodIdNum = parseInt(periodId, 10);
        if (isNaN(periodIdNum)) {
            throw new Error('Invalid period_id');
        }

        return this.reportsService.triggerKpiExport(
            periodIdNum,
            req.user.id,
            req.user.employeeId || req.user.email,
        );
    }

    @Get('kpi-export/status/:jobId')
    @ApiOperation({ summary: 'Check export job status (Admin only)' })
    @ApiParam({
        name: 'jobId',
        type: String,
        description: 'Job ID returned from export trigger',
    })
    @ApiResponse({
        status: 200,
        description: 'Job status retrieved',
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string' },
                status: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed'] },
                progress: { type: 'number' },
                result: { type: 'object' },
                failedReason: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Job not found' })
    async getExportStatus(@Param('jobId') jobId: string) {
        return this.reportsService.getExportStatus(jobId);
    }

    @Get('kpi-export/download/:jobId')
    @ApiOperation({ summary: 'Download generated export file (Admin only)' })
    @ApiParam({
        name: 'jobId',
        type: String,
        description: 'Job ID of completed export',
    })
    @ApiResponse({
        status: 200,
        description: 'Export file downloaded',
        content: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Job not found or file not available' })
    async downloadExport(
        @Param('jobId') jobId: string,
        @Response({ passthrough: true }) res: ExpressResponse,
    ) {
        const { filePath, fileName } = await this.reportsService.getExportFile(jobId);

        const file = fs.createReadStream(filePath);

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });

        return new StreamableFile(file);
    }

    @Get('kpi-export/list')
    @ApiOperation({ summary: 'List recent export jobs (Admin only)' })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: false,
        description: 'Number of recent jobs to retrieve',
        example: 10,
    })
    @ApiResponse({
        status: 200,
        description: 'List of recent export jobs',
    })
    async listRecentExports(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.reportsService.listRecentExports(limitNum);
    }
}
