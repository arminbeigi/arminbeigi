import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DealStage, Pipeline } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateDealItemDto } from './dto/create-deal-item.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { DealResponseDto } from './dto/deal-response.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealsService } from './deals.service';

@ApiTags('فروش')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get('pipelines')
  @Permissions('deals:read')
  @ApiOperation({ summary: 'فهرست پایپ‌لاین‌ها و مراحل (ستون‌های کانبان)' })
  pipelines(): Promise<(Pipeline & { stages: DealStage[] })[]> {
    return this.deals.listPipelines();
  }

  @Post()
  @Permissions('deals:write')
  @ApiOperation({ summary: 'ایجاد معامله (پایپ‌لاین/مرحله پیش‌فرض، مبلغ خودکار از اقلام)' })
  create(@Body() dto: CreateDealDto, @CurrentUser('sub') userId: string): Promise<DealResponseDto> {
    return this.deals.create(dto, userId);
  }

  @Get()
  @Permissions('deals:read')
  @ApiOperation({ summary: 'فهرست معاملات با فیلتر و جست‌وجوی فازی' })
  list(@Query() query: QueryDealsDto): Promise<PaginatedResult<DealResponseDto>> {
    return this.deals.search(query);
  }

  @Get(':id')
  @Permissions('deals:read')
  @ApiOperation({ summary: 'جزئیات معامله' })
  findOne(@Param('id') id: string): Promise<DealResponseDto> {
    return this.deals.findOne(id);
  }

  @Patch(':id')
  @Permissions('deals:write')
  @ApiOperation({ summary: 'به‌روزرسانی معامله' })
  update(@Param('id') id: string, @Body() dto: UpdateDealDto): Promise<DealResponseDto> {
    return this.deals.update(id, dto);
  }

  @Post(':id/move')
  @Permissions('deals:write')
  @ApiOperation({ summary: 'انتقال معامله به مرحله‌ی دیگر (کانبان) با بستن خودکار برنده/بازنده' })
  move(@Param('id') id: string, @Body() dto: MoveDealDto): Promise<DealResponseDto> {
    return this.deals.move(id, dto);
  }

  @Delete(':id')
  @Permissions('deals:write')
  @ApiOperation({ summary: 'حذف معامله' })
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.deals.remove(id);
  }

  @Post(':id/items')
  @Permissions('deals:write')
  @ApiOperation({ summary: 'افزودن قلم (مبلغ خودکار بازمحاسبه می‌شود)' })
  addItem(@Param('id') id: string, @Body() dto: CreateDealItemDto): Promise<DealResponseDto> {
    return this.deals.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @Permissions('deals:write')
  @ApiOperation({ summary: 'حذف قلم (مبلغ خودکار بازمحاسبه می‌شود)' })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string): Promise<DealResponseDto> {
    return this.deals.removeItem(id, itemId);
  }
}
