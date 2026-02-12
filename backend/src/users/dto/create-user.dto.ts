import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

export class CreateUserDto {
    @ApiProperty({ example: 'EMP001', description: 'Unique employee identifier' })
    @IsString()
    employeeId: string;

    @ApiProperty({ example: 'John Doe', description: 'Full name of the employee' })
    @IsString()
    fullName: string;

    @ApiProperty({ example: 'john.doe@company.com', description: 'Email address' })
    @IsEmail()
    email: string;

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
}
