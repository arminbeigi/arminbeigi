import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { WorkflowService } from './workflow.service';

@ApiTags('گردش‌کار')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post()
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'ساخت گردش‌کار خودکار (trigger + شرط‌ها + اکشن‌ها)' })
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflow.create({
      name: dto.name,
      description: dto.description,
      triggerEvent: dto.triggerEvent,
      conditions: dto.conditions,
      actions: dto.actions,
      isActive: dto.isActive,
    });
  }

  @Get()
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'فهرست گردش‌کارها' })
  list() {
    return this.workflow.list();
  }

  @Get('actions')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'انواع اکشن‌های در دسترس موتور' })
  actions(): { types: string[] } {
    return { types: this.workflow.availableActions() };
  }

  @Get(':id')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'جزئیات گردش‌کار + ۲۰ اجرای اخیر' })
  findOne(@Param('id') id: string) {
    return this.workflow.findOne(id);
  }

  @Get(':id/runs')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'لاگ اجراهای گردش‌کار' })
  runs(@Param('id') id: string) {
    return this.workflow.runs(id);
  }

  @Patch(':id')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'ویرایش گردش‌کار' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflow.update(id, dto as never);
  }

  @Delete(':id')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'حذف گردش‌کار' })
  remove(@Param('id') id: string) {
    return this.workflow.remove(id);
  }
}
