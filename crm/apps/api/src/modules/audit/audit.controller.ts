import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { auditToCsv } from './audit-csv';
import { AuditRepository, AuditLogView } from './audit.repository';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('ممیزی')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly repo: AuditRepository) {}

  @Get()
  @Permissions('settings:manage') // فقط مدیر سیستم به دنباله‌ی ممیزی دسترسی دارد
  @ApiOperation({ summary: 'فهرست رویدادهای ممیزی (با فیلتر، بازه‌ی زمانی و صفحه‌بندی)' })
  async list(@Query() query: QueryAuditDto): Promise<PaginatedResult<AuditLogView>> {
    const { rows, total } = await this.repo.list(query);
    return new PaginatedResult(rows, total, query.page, query.limit);
  }

  @Get('export')
  @Permissions('settings:manage')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-log.csv"')
  @ApiOperation({ summary: 'خروجی CSV دنباله‌ی ممیزی (با همان فیلترها)' })
  async export(@Query() query: QueryAuditDto, @Res() res: Response): Promise<void> {
    const rows = await this.repo.listForExport(query);
    res.send(auditToCsv(rows));
  }
}
