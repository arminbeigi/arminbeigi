import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Buderus', description: 'نام برند (می‌تواند لاتین باشد)' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'بودروس' })
  @IsOptional()
  @IsString()
  nameFa?: string;

  @ApiPropertyOptional({ example: 'Germany' })
  @IsOptional()
  @IsString()
  country?: string;
}
