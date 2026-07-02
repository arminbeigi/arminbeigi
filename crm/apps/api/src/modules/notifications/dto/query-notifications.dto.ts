import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'فقط خوانده‌نشده‌ها', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  unread?: string;
}
