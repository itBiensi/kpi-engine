import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new user (admin only)' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or duplicate employee ID/email' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
        try {
            const ipAddress = req.ip || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];
            return await this.usersService.createUser({
                employeeId: createUserDto.employeeId,
                fullName: createUserDto.fullName,
                email: createUserDto.email,
                deptCode: createUserDto.deptCode,
                role: createUserDto.role,
                managerEmployeeId: createUserDto.managerEmployeeId,
            }, {
                userId: req.user?.id,
                ipAddress,
                userAgent,
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all users with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email, or employee ID' })
    @ApiQuery({ name: 'deptCode', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'List of users retrieved successfully' })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('deptCode') deptCode?: string,
        @Query('isActive') isActive?: string,
    ) {
        const take = parseInt(limit || '20', 10);
        const skip = (parseInt(page || '1', 10) - 1) * take;

        return this.usersService.findAll({
            skip,
            take,
            search,
            deptCode,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', type: Number, description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update user data (admin only)' })
    @ApiParam({ name: 'id', type: Number, description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or duplicate email' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
        @Request() req: any,
    ) {
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.usersService.updateUser(id, updateUserDto, {
            userId: req.user?.id,
            ipAddress,
            userAgent,
        });
    }

    @Get(':id/subordinates')
    @ApiOperation({ summary: 'Get subordinates of a manager' })
    @ApiParam({ name: 'id', type: Number, description: 'Manager ID' })
    @ApiResponse({ status: 200, description: 'List of subordinates retrieved' })
    getSubordinates(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.getSubordinates(id);
    }
}
