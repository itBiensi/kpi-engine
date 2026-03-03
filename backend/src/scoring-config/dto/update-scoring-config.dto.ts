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
    description: 'Minimum score percentage for Excellent grade',
    example: 130,
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  excellentThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score percentage for Very Good grade',
    example: 110,
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  veryGoodThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score percentage for Good grade',
    example: 90,
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  goodThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum score percentage for Poor grade',
    example: 70,
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  poorThreshold?: number;
}
