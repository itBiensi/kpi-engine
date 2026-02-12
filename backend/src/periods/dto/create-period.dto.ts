import { IsString, IsDateString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePeriodDto {
    @ApiProperty({
        description: 'Period name',
        example: 'Q1 2026 Performance Review',
        maxLength: 100,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'Period start date',
        example: '2026-01-01',
    })
    @IsDateString()
    startDate: string;

    @ApiProperty({
        description: 'Period end date',
        example: '2026-03-31',
    })
    @IsDateString()
    endDate: string;

    @ApiProperty({
        description: 'Cycle type',
        enum: ['MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL'],
        example: 'QUARTERLY',
    })
    @IsEnum(['MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL'])
    cycleType: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';

    @ApiProperty({
        description: 'Period status',
        enum: ['SETUP', 'ACTIVE', 'LOCKED', 'CLOSED'],
        example: 'SETUP',
        required: false,
    })
    @IsEnum(['SETUP', 'ACTIVE', 'LOCKED', 'CLOSED'])
    status?: 'SETUP' | 'ACTIVE' | 'LOCKED' | 'CLOSED';
}
