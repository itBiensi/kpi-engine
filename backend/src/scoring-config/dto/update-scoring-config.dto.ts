import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScoringConfigDto {
  @ApiPropertyOptional({
    description: 'Cap multiplier for maximum score (e.g., 1.2 for 120%)',
    example: 1.2,
    minimum: 1.0,
    maximum: 2.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(2.0)
  capMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Minimum score for grade A',
    example: 90,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gradeAThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score for grade B',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gradeBThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score for grade C',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gradeCThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score for grade D',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gradeDThreshold?: number;
}
