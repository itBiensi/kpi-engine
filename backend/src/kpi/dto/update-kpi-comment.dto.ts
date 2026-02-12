import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKpiCommentDto {
    @ApiProperty({
        description: 'Manager or admin comment for the KPI item',
        example: 'Good progress on this KPI. Consider increasing the target for next period.',
    })
    @IsString()
    @IsNotEmpty()
    comment: string;
}
