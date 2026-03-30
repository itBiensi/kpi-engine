import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { AuditService } from '../audit-log/audit-log.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly passwordService: PasswordService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Legacy SHA-256 hashing (kept for migration support)
     */
    private hashPasswordSHA256(password: string): string {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            // Log failed login attempt
            await this.auditService.log(
                'LOGIN_FAILURE',
                { ipAddress, userAgent },
                { details: { email, reason: 'Invalid credentials' } },
            );
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password (support both bcrypt and legacy SHA-256)
        const isPasswordValid = await this.passwordService.comparePasswords(password, user.password);
        if (!isPasswordValid) {
            // Log failed login attempt
            await this.auditService.log(
                'LOGIN_FAILURE',
                { userId: user.id, ipAddress, userAgent },
                { details: { email, reason: 'Invalid password' } },
            );
            throw new UnauthorizedException('Invalid credentials');
        }

        // Auto-migrate legacy SHA-256 passwords to bcrypt
        if (this.passwordService.isLegacyHash(user.password)) {
            const bcryptHash = await this.passwordService.hashPassword(password);
            await this.prisma.user.update({
                where: { id: user.id },
                data: { password: bcryptHash },
            });
        }

        // Log successful login
        await this.auditService.log(
            'LOGIN_SUCCESS',
            { userId: user.id, ipAddress, userAgent },
            { details: { email } },
        );

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                employeeId: user.employeeId,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                deptCode: user.deptCode,
            },
        };
    }

    async seed() {
        const existing = await this.prisma.user.findUnique({
            where: { email: 'admin@hris.com' },
        });
        if (!existing) {
            const admin = await this.prisma.user.create({
                data: {
                    employeeId: 'ADM001',
                    fullName: 'System Administrator',
                    email: 'admin@hris.com',
                    password: await this.passwordService.hashPassword('admin123'),
                    role: 'ADMIN',
                    deptCode: 'IT',
                    isActive: true,
                },
            });

            // Log system seed
            await this.auditService.log(
                'SYSTEM_SEEDED',
                {},
                {
                    details: {
                        action: 'Created default admin user',
                        adminId: admin.id,
                    },
                },
            );
        }
        return { message: 'Seed completed' };
    }

    /**
     * Employee updates their own password
     * Requires current password verification
     */
    async updateOwnPassword(
        userId: number,
        currentPassword: string,
        newPassword: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ message: string }> {
        // Find user
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isPasswordValid = await this.passwordService.comparePasswords(
            currentPassword,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Validate new password strength
        const validationError = this.passwordService.validatePasswordStrength(newPassword);
        if (validationError) {
            throw new BadRequestException(validationError);
        }

        // Hash and update password
        const hashedPassword = await this.passwordService.hashPassword(newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Log password update
        await this.auditService.log(
            'PASSWORD_UPDATED',
            { userId, ipAddress, userAgent },
            {
                resourceType: 'User',
                resourceId: userId,
                details: { action: 'User updated own password' },
            },
        );

        return { message: 'Password updated successfully' };
    }

    /**
     * Reissues a fresh JWT for an already-authenticated user.
     * Called by the client-side session-refresh ping.
     */
    async refreshToken(userId: number): Promise<{ access_token: string }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
        };

        return { access_token: this.jwtService.sign(payload) };
    }

    /**
     * Admin resets any user's password
     * No current password required
     */
    async resetUserPassword(
        userId: number,
        newPassword: string,
        adminId?: number,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ message: string; userId: number }> {
        // Check if user exists
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException(`User with ID ${userId} not found`);
        }

        // Validate new password strength
        const validationError = this.passwordService.validatePasswordStrength(newPassword);
        if (validationError) {
            throw new BadRequestException(validationError);
        }

        // Hash and update password
        const hashedPassword = await this.passwordService.hashPassword(newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // Log password reset by admin
        await this.auditService.log(
            'PASSWORD_RESET',
            { userId: adminId, ipAddress, userAgent },
            {
                resourceType: 'User',
                resourceId: userId,
                details: {
                    action: 'Admin reset user password',
                    targetUser: user.email,
                },
            },
        );

        return {
            message: `Password reset successfully for ${user.fullName}`,
            userId: user.id,
        };
    }
}
