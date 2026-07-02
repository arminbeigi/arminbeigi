import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto, QueryAssetsDto, UpdateAssetDto } from './dto/asset.dto';

@ApiTags('تجهیزات')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'ثبت تجهیز جدید' })
  create(@Body() dto: CreateAssetDto, @CurrentUser('sub') actorId: string) {
    return this.assets.create(dto, actorId);
  }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'فهرست تجهیزات (فیلتر + جست‌وجو + صفحه‌بندی)' })
  list(@Query() query: QueryAssetsDto) {
    return this.assets.list(query);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'جزئیات تجهیز' })
  findOne(@Param('id') id: string) {
    return this.assets.findOne(id);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'ویرایش تجهیز' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @CurrentUser('sub') actorId: string) {
    return this.assets.update(id, dto, actorId);
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'حذف تجهیز' })
  remove(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    return this.assets.remove(id, actorId);
  }
}
