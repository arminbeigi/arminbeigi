import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class OriginateDto {
  @ApiProperty({ description: 'داخلی اپراتور تماس‌گیرنده', example: '201' })
  @IsString()
  @MinLength(1)
  agentExtension: string;

  @ApiProperty({ description: 'شماره مقصد', example: '09123456789' })
  @IsString()
  @MinLength(3)
  toNumber: string;

  @ApiPropertyOptional({ description: 'شناسه مشتری (در صورت معلوم‌بودن)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'CallerID نمایشی' })
  @IsOptional()
  @IsString()
  callerId?: string;
}
