import { Controller, Post, Body, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'admin@hris.com' },
                password: { type: 'string', example: 'admin123' },
            },
        },
    })
    @ApiResponse({
        status: 200, description: 'Successfully authenticated', schema: {
            type: 'object',
            properties: {
                access_token: { type: 'string' },
                user: { type: 'object' },
            },
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: { email: string; password: string }, @Request() req: any) {
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.login(body.email, body.password, ipAddress, userAgent);
    }

    @Post('seed')
    @ApiOperation({ summary: 'Seed admin user (for development)' })
    @ApiResponse({ status: 201, description: 'Admin user created successfully' })
    @ApiResponse({ status: 409, description: 'Admin user already exists' })
    async seed() {
        return this.authService.seed();
    }

    @Put('password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update own password (requires current password)' })
    @ApiResponse({ status: 200, description: 'Password updated successfully' })
    @ApiResponse({ status: 401, description: 'Current password is incorrect' })
    @ApiResponse({ status: 400, description: 'Invalid password strength' })
    async updatePassword(@Request() req: any, @Body() updatePasswordDto: UpdatePasswordDto) {
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.updateOwnPassword(
            req.user.id,
            updatePasswordDto.currentPassword,
            updatePasswordDto.newPassword,
            ipAddress,
            userAgent,
        );
    }

    @Post('refresh')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Refresh JWT token for authenticated user (session keep-alive)' })
    @ApiResponse({ status: 200, description: 'New access token issued', schema: { type: 'object', properties: { access_token: { type: 'string' } } } })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async refresh(@Request() req: any) {
        return this.authService.refreshToken(req.user.id);
    }

    @Post('password/reset')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Admin resets any user password (no current password needed)' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
    @ApiResponse({ status: 400, description: 'Invalid user ID or password strength' })
    async resetPassword(@Request() req: any, @Body() resetPasswordDto: ResetPasswordDto) {
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.authService.resetUserPassword(
            resetPasswordDto.userId,
            resetPasswordDto.newPassword,
            req.user.id,
            ipAddress,
            userAgent,
        );
    }
}
