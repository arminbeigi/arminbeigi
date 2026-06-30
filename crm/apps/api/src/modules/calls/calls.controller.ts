import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CallsService, CallIngestResult } from './calls.service';
import { CallResponseDto } from './dto/call-response.dto';
import { IngestCallDto } from './dto/ingest-call.dto';
import { LinkCallDto } from './dto/link-call.dto';
import { QueryCallsDto } from './dto/query-calls.dto';

@ApiTags('تماس‌ها')
@ApiBearerAuth()
@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post('events')
  @Permissions('calls:manage')
  @ApiOperation({
    summary: 'ثبت رویداد تماس (idempotent) با تطبیق خودکار مشتری و ساخت سرنخ',
  })
  ingest(@Body() dto: IngestCallDto): Promise<CallIngestResult> {
    return this.calls.ingest(dto);
  }

  @Get()
  @Permissions('calls:read')
  @ApiOperation({ summary: 'فهرست تماس‌ها با فیلتر (جهت/وضعیت/اپراتور/مشتری/بازه زمانی)' })
  list(@Query() query: QueryCallsDto): Promise<PaginatedResult<CallResponseDto>> {
    return this.calls.list(query);
  }

  @Get(':id')
  @Permissions('calls:read')
  @ApiOperation({ summary: 'جزئیات تماس' })
  findOne(@Param('id') id: string): Promise<CallResponseDto> {
    return this.calls.findOne(id);
  }

  @Patch(':id/link')
  @Permissions('calls:manage')
  @ApiOperation({ summary: 'اتصال تماس به معامله/تیکت' })
  link(@Param('id') id: string, @Body() dto: LinkCallDto): Promise<CallResponseDto> {
    return this.calls.link(id, dto);
  }
}
