import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateProjectItemDto } from './dto/create-project-item.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('پروژه‌ها')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @Permissions('projects:write')
  @ApiOperation({ summary: 'ایجاد پروژه (موتورخانه/نصب/سرویس) با اقلام اختیاری' })
  create(@Body() dto: CreateProjectDto): Promise<ProjectResponseDto> {
    return this.projects.create(dto);
  }

  @Get()
  @Permissions('projects:read')
  @ApiOperation({ summary: 'فهرست پروژه‌ها با فیلتر و جست‌وجوی فازی' })
  list(@Query() query: QueryProjectsDto): Promise<PaginatedResult<ProjectResponseDto>> {
    return this.projects.search(query);
  }

  @Get(':id')
  @Permissions('projects:read')
  @ApiOperation({ summary: 'جزئیات پروژه (اقلام، مشتری، مدیر، آدرس)' })
  findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.projects.findOne(id);
  }

  @Patch(':id')
  @Permissions('projects:write')
  @ApiOperation({ summary: 'به‌روزرسانی پروژه (با اعتبارسنجی انتقال وضعیت)' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @Permissions('projects:write')
  @ApiOperation({ summary: 'حذف پروژه' })
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ): Promise<{ success: true }> {
    return this.projects.remove(id, actorId);
  }

  @Post(':id/items')
  @Permissions('projects:write')
  @ApiOperation({ summary: 'افزودن قلم به پروژه' })
  addItem(@Param('id') id: string, @Body() dto: CreateProjectItemDto): Promise<ProjectResponseDto> {
    return this.projects.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @Permissions('projects:write')
  @ApiOperation({ summary: 'حذف قلم پروژه' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ): Promise<ProjectResponseDto> {
    return this.projects.removeItem(id, itemId);
  }
}
