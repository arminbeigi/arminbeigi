import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Brand } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('محصولات')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ── برندها ──────────────────────────────────────────────────────────────────
  @Post('brands')
  @Permissions('products:write')
  @ApiOperation({ summary: 'ایجاد برند' })
  createBrand(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.products.createBrand(dto);
  }

  @Get('brands')
  @Permissions('products:read')
  @ApiOperation({ summary: 'فهرست برندها' })
  listBrands(): Promise<Brand[]> {
    return this.products.listBrands();
  }

  // ── محصولات ─────────────────────────────────────────────────────────────────
  @Post()
  @Permissions('products:write')
  @ApiOperation({ summary: 'ایجاد محصول HVAC' })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.products.create(dto);
  }

  @Get()
  @Permissions('products:read')
  @ApiOperation({ summary: 'فهرست محصولات با فیلتر (دسته/سوخت/نوع دیگ/برند) و جست‌وجوی فازی' })
  list(@Query() query: QueryProductsDto): Promise<PaginatedResult<ProductResponseDto>> {
    return this.products.search(query);
  }

  @Get(':id')
  @Permissions('products:read')
  @ApiOperation({ summary: 'جزئیات محصول' })
  findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.products.findOne(id);
  }

  @Patch(':id')
  @Permissions('products:write')
  @ApiOperation({ summary: 'به‌روزرسانی محصول' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Permissions('products:delete')
  @ApiOperation({ summary: 'حذف محصول' })
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ): Promise<{ success: true }> {
    return this.products.remove(id, actorId);
  }
}
