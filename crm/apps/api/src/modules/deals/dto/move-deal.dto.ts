import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MoveDealDto {
  @ApiProperty({ description: 'شناسه مرحله‌ی مقصد' })
  @IsString()
  stageId: string;

  @ApiPropertyOptional({ description: 'دلیل (الزامی هنگام انتقال به مرحله‌ی ازدست‌رفته)' })
  @IsOptional()
  @IsString()
  lostReason?: string;
}
