import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of the employee' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ example: 'john.doe@company.com', description: 'Email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'IT', description: 'Department code' })
    @IsOptional()
    @IsString()
    deptCode?: string;

    @ApiPropertyOptional({ enum: UserRole, example: 'EMPLOYEE', description: 'User role' })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: 'MGR001', description: 'Manager employee ID' })
    @IsOptional()
    @IsString()
    managerEmployeeId?: string;

    @ApiPropertyOptional({ example: true, description: 'Active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
