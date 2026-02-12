import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
    @ApiProperty({
        description: 'Current password for verification',
        example: 'oldPassword123',
    })
    @IsString()
    currentPassword: string;

    @ApiProperty({
        description: 'New password (8-72 chars, must contain letter and number)',
        example: 'newPassword123',
    })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: 'Password must contain at least one letter and one number',
    })
    newPassword: string;
}
