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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PeriodsService } from './periods.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Periods')
@Controller('api/v1/periods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PeriodsController {
    constructor(private readonly periodsService: PeriodsService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create a new period (Admin only)' })
    @ApiResponse({ status: 201, description: 'Period created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid date range or overlapping period' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
    async create(@Body() createPeriodDto: CreatePeriodDto) {
        return this.periodsService.create(createPeriodDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all periods' })
    @ApiQuery({ name: 'status', required: false, enum: ['SETUP', 'ACTIVE', 'LOCKED', 'CLOSED'] })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'List of periods' })
    async findAll(
        @Query('status') status?: string,
        @Query('isActive') isActive?: string,
    ) {
        return this.periodsService.findAll({
            status,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
    }

    @Get('active')
    @ApiOperation({ summary: 'Get the currently active period' })
    @ApiResponse({ status: 200, description: 'Active period' })
    @ApiResponse({ status: 404, description: 'No active period found' })
    async findActive() {
        return this.periodsService.findActive();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get period by ID' })
    @ApiResponse({ status: 200, description: 'Period found' })
    @ApiResponse({ status: 404, description: 'Period not found' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.periodsService.findOne(id);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update a period (Admin only)' })
    @ApiResponse({ status: 200, description: 'Period updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid date range' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
    @ApiResponse({ status: 404, description: 'Period not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updatePeriodDto: UpdatePeriodDto,
    ) {
        return this.periodsService.update(id, updatePeriodDto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete a period (Admin only)' })
    @ApiResponse({ status: 200, description: 'Period deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete period with associated KPIs' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
    @ApiResponse({ status: 404, description: 'Period not found' })
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.periodsService.remove(id);
    }
}
