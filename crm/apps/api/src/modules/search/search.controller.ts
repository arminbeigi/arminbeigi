import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchResult, SearchService } from './search.service';

@ApiTags('جست‌وجوی سراسری')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'جست‌وجوی سراسری (مشتری/پروژه/معامله/تیکت/محصول/تماس/تجهیز)' })
  query(@Query('q') q: string, @Query('types') types?: string): Promise<SearchResult> {
    return this.search.search(q ?? '', { types: types ? types.split(',') : undefined });
  }

  @Get('types')
  @ApiOperation({ summary: 'انواع موجودیت‌های قابل‌جست‌وجو' })
  types(): { entityType: string; label: string }[] {
    return this.search.searchableTypes();
  }
}
