import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    Request,
} from '@nestjs/common';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('KPI')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/kpi')
@UseGuards(JwtAuthGuard)
export class KpiController {
    constructor(private readonly kpiService: KpiService) { }

    @Post('plans')
    @ApiOperation({ summary: 'Create a new KPI plan' })
    @ApiResponse({ status: 201, description: 'KPI plan created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data or weight validation failed' })
    createPlan(
        @Body()
        body: {
            userId: number;
            periodId: number;
            details: {
                title: string;
                definition?: string;
                polarity: 'MAX' | 'MIN' | 'BINARY';
                weight: number;
                targetValue: number;
            }[];
        },
    ) {
        return this.kpiService.createPlan(body);
    }

    @Get('plans')
    @ApiOperation({ summary: 'Get KPI plans with filters and pagination' })
    @ApiQuery({ name: 'userId', required: false, type: Number })
    @ApiQuery({ name: 'periodId', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED'] })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiResponse({ status: 200, description: 'List of KPI plans' })
    findPlans(
        @Query('userId') userId?: string,
        @Query('periodId') periodId?: string,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        const take = parseInt(limit || '20', 10);
        const skip = (parseInt(page || '1', 10) - 1) * take;

        return this.kpiService.findPlans({
            userId: userId ? parseInt(userId, 10) : undefined,
            periodId: periodId ? parseInt(periodId, 10) : undefined,
            status,
            skip,
            take,
            currentUser: req?.user,
        });
    }

    @Get('plans/:id')
    @ApiOperation({ summary: 'Get KPI plan by ID' })
    @ApiParam({ name: 'id', type: Number, description: 'KPI plan ID' })
    @ApiResponse({ status: 200, description: 'KPI plan details' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    findPlanById(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ) {
        return this.kpiService.findPlanById(id, req.user);
    }

    @Post('plans/:id/submit')
    @ApiOperation({ summary: 'Submit KPI plan for approval (Employee)' })
    @ApiParam({ name: 'id', type: Number, description: 'KPI plan ID' })
    @ApiResponse({ status: 200, description: 'Plan submitted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid status, weight not 100%, or period not active' })
    @ApiResponse({ status: 403, description: 'Not the plan owner' })
    submitPlan(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        return this.kpiService.submitPlan(id, req.user.id);
    }

    @Post('plans/:id/approve')
    @ApiOperation({ summary: 'Approve KPI plan (Manager)' })
    @ApiParam({ name: 'id', type: Number, description: 'KPI plan ID' })
    @ApiResponse({ status: 200, description: 'Plan approved successfully' })
    @ApiResponse({ status: 400, description: 'Plan not in SUBMITTED status' })
    @ApiResponse({ status: 403, description: 'Not the manager of the plan owner' })
    approvePlan(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        return this.kpiService.approvePlan(id, req.user.id);
    }

    @Post('plans/:id/reject')
    @ApiOperation({ summary: 'Reject KPI plan (Manager)' })
    @ApiParam({ name: 'id', type: Number, description: 'KPI plan ID' })
    @ApiBody({ schema: { type: 'object', properties: { comment: { type: 'string', description: 'Rejection reason (required)' } }, required: ['comment'] } })
    @ApiResponse({ status: 200, description: 'Plan rejected successfully' })
    @ApiResponse({ status: 400, description: 'Plan not in SUBMITTED status or comment missing' })
    @ApiResponse({ status: 403, description: 'Not the manager of the plan owner' })
    rejectPlan(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { comment: string },
        @Request() req: any,
    ) {
        return this.kpiService.rejectPlan(id, req.user.id, body.comment);
    }

    @Post('plans/:id/cancel')
    @ApiOperation({ summary: 'Cancel submission (Employee)' })
    @ApiParam({ name: 'id', type: Number, description: 'KPI plan ID' })
    @ApiResponse({ status: 200, description: 'Submission cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Plan not in SUBMITTED status' })
    @ApiResponse({ status: 403, description: 'Not the plan owner' })
    cancelSubmission(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        return this.kpiService.cancelSubmission(id, req.user.id);
    }

    @Put('achievements/:detailId')
    @ApiOperation({ summary: 'Update KPI achievement (actual value)' })
    @ApiParam({ name: 'detailId', type: Number, description: 'KPI detail ID' })
    @ApiBody({ schema: { type: 'object', properties: { actual_value: { type: 'number' }, evidence_url: { type: 'string' } } } })
    @ApiResponse({ status: 200, description: 'Achievement updated successfully' })
    updateAchievement(
        @Param('detailId', ParseIntPipe) detailId: number,
        @Body() body: { actual_value: number; evidence_url?: string },
        @Request() req: any,
    ) {
        return this.kpiService.updateAchievement(
            detailId,
            body.actual_value,
            body.evidence_url,
            req.user,
        );
    }

    @Put('details/:detailId/comment')
    @ApiOperation({ summary: 'Add manager/admin comment to KPI item' })
    @ApiParam({ name: 'detailId', type: Number, description: 'KPI detail ID' })
    @ApiBody({ schema: { type: 'object', properties: { comment: { type: 'string', description: 'Manager comment' } }, required: ['comment'] } })
    @ApiResponse({ status: 200, description: 'Comment added successfully' })
    @ApiResponse({ status: 403, description: 'Only admin or direct manager can add comments' })
    @ApiResponse({ status: 404, description: 'KPI item not found' })
    updateKpiItemComment(
        @Param('detailId', ParseIntPipe) detailId: number,
        @Body() body: { comment: string },
        @Request() req: any,
    ) {
        return this.kpiService.updateKpiItemComment(
            detailId,
            body.comment,
            req.user.id,
            req.user.role,
        );
    }

    @Post('cascade')
    @ApiOperation({ summary: 'Cascade KPI to subordinate' })
    @ApiResponse({ status: 201, description: 'KPI cascaded successfully' })
    cascadeKpi(
        @Body()
        body: {
            sourceDetailId: number;
            targetUserId: number;
            periodId: number;
            weight: number;
        },
    ) {
        return this.kpiService.cascadeKpi(
            body.sourceDetailId,
            body.targetUserId,
            body.periodId,
            body.weight,
        );
    }

    @Delete('plans/all')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete all KPI data (admin only)' })
    @ApiResponse({
        status: 200, description: 'All KPI data deleted successfully', schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                detailsDeleted: { type: 'number' },
                headersDeleted: { type: 'number' },
            },
        }
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async deleteAllKpiData() {
        return this.kpiService.deleteAllKpiData();
    }
}
