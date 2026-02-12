import { IsInt, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'User ID to reset password for',
        example: 5,
    })
    @IsInt()
    userId: number;

    @ApiProperty({
        description: 'New password (8-72 chars, must contain letter and number)',
        example: 'resetPassword123',
    })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: 'Password must contain at least one letter and one number',
    })
    newPassword: string;
}
