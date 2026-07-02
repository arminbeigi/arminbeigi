import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimelineEntry } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QueryTimelineDto } from './dto/query-timeline.dto';
import { TimelineService } from './timeline.service';

@ApiTags('تایم‌لاین')
@ApiBearerAuth()
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست تایم‌لاین (فیلتر + جست‌وجو + صفحه‌بندی)' })
  list(@Query() query: QueryTimelineDto): Promise<PaginatedResult<TimelineEntry>> {
    return this.timeline.list(query);
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'تایم‌لاین یک موجودیت خاص' })
  forEntity(
    @Param('type') type: string,
    @Param('id') id: string,
    @Query() query: QueryTimelineDto,
  ): Promise<PaginatedResult<TimelineEntry>> {
    query.entityType = type;
    query.entityId = id;
    return this.timeline.list(query);
  }
}
