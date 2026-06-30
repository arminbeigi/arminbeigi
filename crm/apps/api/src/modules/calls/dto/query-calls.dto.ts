import { ApiPropertyOptional } from '@nestjs/swagger';
import { CallDirection, CallStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCallsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CallDirection })
  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection;

  @ApiPropertyOptional({ enum: CallStatus })
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @ApiPropertyOptional({ description: 'فیلتر اپراتور' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'فیلتر مشتری' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'از تاریخ (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'تا تاریخ (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
