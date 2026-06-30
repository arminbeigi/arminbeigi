import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryDealsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'فیلتر پایپ‌لاین' })
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'فیلتر مرحله' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({ enum: DealStatus })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiPropertyOptional({ description: 'فیلتر مشتری' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'فیلتر کارشناس' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
