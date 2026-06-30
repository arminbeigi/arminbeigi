import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditRepository, AuditLogView } from './audit.repository';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('ممیزی')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly repo: AuditRepository) {}

  @Get()
  @Permissions('settings:manage') // فقط مدیر سیستم به دنباله‌ی ممیزی دسترسی دارد
  @ApiOperation({ summary: 'فهرست رویدادهای ممیزی (با فیلتر و صفحه‌بندی)' })
  async list(@Query() query: QueryAuditDto): Promise<PaginatedResult<AuditLogView>> {
    const { rows, total } = await this.repo.list(query);
    return new PaginatedResult(rows, total, query.page, query.limit);
  }
}
