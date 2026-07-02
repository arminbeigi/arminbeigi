import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('تیکت‌ها')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @Permissions('tickets:write')
  @ApiOperation({ summary: 'ایجاد تیکت (دسته/اولویت در صورت نبود، خودکار تشخیص داده می‌شود)' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser('sub') actorId: string,
  ): Promise<TicketResponseDto> {
    return this.tickets.create(dto, actorId);
  }

  @Get()
  @Permissions('tickets:read')
  @ApiOperation({ summary: 'فهرست تیکت‌ها (فیلتر + صفحه‌بندی)' })
  list(
    @Query() query: QueryTicketsDto,
    @CurrentUser('sub') userId: string,
  ): Promise<PaginatedResult<TicketResponseDto>> {
    return this.tickets.list(query, userId);
  }

  @Get('stats')
  @Permissions('tickets:read')
  @ApiOperation({ summary: 'آمار خلاصه‌ی تیکت‌ها (برای داشبورد پشتیبانی)' })
  stats(): Promise<{ byStatus: Record<string, number>; overdue: number }> {
    return this.tickets.stats();
  }

  @Get(':id')
  @Permissions('tickets:read')
  @ApiOperation({ summary: 'جزئیات تیکت با کامنت‌ها' })
  findOne(@Param('id') id: string): Promise<TicketResponseDto> {
    return this.tickets.findOne(id);
  }

  @Patch(':id')
  @Permissions('tickets:write')
  @ApiOperation({ summary: 'ویرایش فیلدهای تیکت' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto): Promise<TicketResponseDto> {
    return this.tickets.update(id, dto);
  }

  @Patch(':id/status')
  @Permissions('tickets:write')
  @ApiOperation({ summary: 'تغییر وضعیت تیکت (با اعتبارسنجی انتقال)' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser('sub') actorId: string,
  ): Promise<TicketResponseDto> {
    return this.tickets.changeStatus(id, dto.status, actorId);
  }

  @Patch(':id/assign')
  @Permissions('tickets:write')
  @ApiOperation({ summary: 'تخصیص/لغو تخصیص مسئول تیکت' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser('sub') actorId: string,
  ): Promise<TicketResponseDto> {
    return this.tickets.assign(id, dto, actorId);
  }

  @Post(':id/comments')
  @Permissions('tickets:write')
  @ApiOperation({ summary: 'افزودن پاسخ/یادداشت به تیکت' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('sub') authorId: string,
  ): Promise<TicketResponseDto> {
    return this.tickets.addComment(id, dto, authorId);
  }

  @Delete(':id')
  @Permissions('tickets:delete')
  @ApiOperation({ summary: 'حذف تیکت' })
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ): Promise<{ success: true }> {
    return this.tickets.remove(id, actorId);
  }
}
