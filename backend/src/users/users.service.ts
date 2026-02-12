import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit-log/audit-log.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
        private readonly auditService: AuditService,
    ) { }

    async findAll(params?: {
        skip?: number;
        take?: number;
        search?: string;
        deptCode?: string;
        isActive?: boolean;
    }) {
        const where: Prisma.UserWhereInput = {};

        if (params?.search) {
            where.OR = [
                { fullName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
                { employeeId: { contains: params.search, mode: 'insensitive' } },
            ];
        }
        if (params?.deptCode) {
            where.deptCode = params.deptCode;
        }
        if (params?.isActive !== undefined) {
            where.isActive = params.isActive;
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: params?.skip || 0,
                take: params?.take || 20,
                select: {
                    id: true,
                    employeeId: true,
                    fullName: true,
                    email: true,
                    deptCode: true,
                    role: true,
                    isActive: true,
                    managerId: true,
                    createdAt: true,
                    manager: { select: { fullName: true, employeeId: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { data: users, total, page: Math.floor((params?.skip || 0) / (params?.take || 20)) + 1 };
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { manager: { select: { fullName: true, employeeId: true } } },
        });
        if (!user) throw new NotFoundException(`User #${id} not found`);
        return user;
    }

    async findByEmployeeId(employeeId: string) {
        return this.prisma.user.findUnique({ where: { employeeId } });
    }

    async create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({ data });
    }

    async update(id: number, data: Prisma.UserUpdateInput) {
        return this.prisma.user.update({ where: { id }, data });
    }

    async createUser(dto: {
        employeeId: string;
        fullName: string;
        email: string;
        deptCode?: string;
        role?: string;
        managerEmployeeId?: string;
    }, adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Check for duplicates
        const existingByEmployeeId = await this.prisma.user.findUnique({
            where: { employeeId: dto.employeeId },
        });
        if (existingByEmployeeId) {
            throw new Error(`Employee ID "${dto.employeeId}" already exists`);
        }

        const existingByEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingByEmail) {
            throw new Error(`Email "${dto.email}" already exists`);
        }

        // Resolve manager
        let managerId: number | null = null;
        if (dto.managerEmployeeId) {
            const manager = await this.prisma.user.findUnique({
                where: { employeeId: dto.managerEmployeeId },
            });
            if (!manager) {
                throw new Error(`Manager with Employee ID "${dto.managerEmployeeId}" not found`);
            }
            managerId = manager.id;
        }

        // Hash password with bcrypt
        const defaultPassword = await this.passwordService.hashPassword('password123');

        // Create user
        const user = await this.prisma.user.create({
            data: {
                employeeId: dto.employeeId,
                fullName: dto.fullName,
                email: dto.email,
                password: defaultPassword,
                deptCode: dto.deptCode || null,
                role: (dto.role as any) || 'EMPLOYEE',
                managerId,
                isActive: true,
            },
            select: {
                id: true,
                employeeId: true,
                fullName: true,
                email: true,
                deptCode: true,
                role: true,
                isActive: true,
                managerId: true,
                createdAt: true,
                manager: { select: { fullName: true, employeeId: true } },
            },
        });

        // Log user creation
        await this.auditService.log(
            'USER_CREATED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                resourceType: 'User',
                resourceId: user.id,
                details: {
                    employeeId: user.employeeId,
                    email: user.email,
                    role: user.role,
                },
            },
        );

        return user;
    }

    /**
     * Update user data (admin only)
     */
    async updateUser(id: number, dto: Partial<{
        fullName?: string;
        email?: string;
        deptCode?: string;
        role?: string;
        managerEmployeeId?: string;
        isActive?: boolean;
    }>, adminContext?: { userId?: number; ipAddress?: string; userAgent?: string }) {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            throw new BadRequestException(`User with ID ${id} not found`);
        }

        // Check for duplicate email (if email is being changed)
        if (dto.email && dto.email !== existingUser.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (emailExists) {
                throw new BadRequestException(`Email ${dto.email} is already in use`);
            }
        }

        // Resolve manager by employeeId if provided
        let managerId = undefined;
        if (dto.managerEmployeeId !== undefined) {
            if (dto.managerEmployeeId) {
                const manager = await this.prisma.user.findUnique({
                    where: { employeeId: dto.managerEmployeeId },
                });
                if (!manager) {
                    throw new BadRequestException(
                        `Manager with employeeId ${dto.managerEmployeeId} not found`,
                    );
                }
                managerId = manager.id;
            } else {
                managerId = null; // Remove manager
            }
        }

        // Update user
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.fullName !== undefined && { fullName: dto.fullName }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.deptCode !== undefined && { deptCode: dto.deptCode || null }),
                ...(dto.role !== undefined && { role: dto.role as any }),
                ...(managerId !== undefined && { managerId }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            select: {
                id: true,
                employeeId: true,
                fullName: true,
                email: true,
                deptCode: true,
                role: true,
                isActive: true,
                managerId: true,
                createdAt: true,
                manager: { select: { fullName: true, employeeId: true } },
            },
        });

        // Log user update
        await this.auditService.log(
            'USER_UPDATED',
            {
                userId: adminContext?.userId,
                ipAddress: adminContext?.ipAddress,
                userAgent: adminContext?.userAgent,
            },
            {
                resourceType: 'User',
                resourceId: updatedUser.id,
                details: {
                    employeeId: updatedUser.employeeId,
                    updatedFields: dto,
                },
            },
        );

        return updatedUser;
    }


    async getSubordinates(managerId: number) {
        return this.prisma.user.findMany({
            where: { managerId, isActive: true },
            select: { id: true, employeeId: true, fullName: true, email: true, deptCode: true },
        });
    }

    async getSubordinateIds(managerId: number): Promise<number[]> {
        const subordinates = await this.prisma.user.findMany({
            where: { managerId, isActive: true },
            select: { id: true },
        });
        return subordinates.map(s => s.id);
    }
}
