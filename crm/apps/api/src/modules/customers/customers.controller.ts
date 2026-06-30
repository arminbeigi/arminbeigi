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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('مشتریان')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @Permissions('customers:write')
  @ApiOperation({ summary: 'ایجاد مشتری جدید (به‌همراه شماره‌های اختیاری)' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser('sub') userId: string,
  ): Promise<CustomerResponseDto> {
    return this.customers.create(dto, userId);
  }

  @Get()
  @Permissions('customers:read')
  @ApiOperation({ summary: 'فهرست مشتریان با فیلتر، صفحه‌بندی و جست‌وجوی فازی فارسی' })
  list(@Query() query: QueryCustomersDto): Promise<PaginatedResult<CustomerResponseDto>> {
    return this.customers.search(query);
  }

  @Get('lookup/by-phone')
  @Permissions('calls:manage')
  @ApiOperation({ summary: 'تطبیق مشتری با شماره تلفن (برای مرکز تماس / پاپ‌آپ)' })
  @ApiQuery({ name: 'number', example: '09123456789' })
  lookupByPhone(
    @Query('number') number: string,
  ): Promise<{ found: boolean; customer: CustomerResponseDto | null }> {
    return this.customers.lookupByPhone(number ?? '');
  }

  @Get(':id')
  @Permissions('customers:read')
  @ApiOperation({ summary: 'جزئیات یک مشتری (شماره‌ها، مخاطبین، آدرس‌ها)' })
  findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customers.findOne(id);
  }

  @Patch(':id')
  @Permissions('customers:write')
  @ApiOperation({ summary: 'به‌روزرسانی مشتری' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @Permissions('customers:delete')
  @ApiOperation({ summary: 'حذف مشتری' })
  remove(@Param('id') id: string): Promise<{ success: true }> {
    return this.customers.remove(id);
  }

  @Post(':id/phones')
  @Permissions('customers:write')
  @ApiOperation({ summary: 'افزودن شماره تلفن به مشتری' })
  addPhone(@Param('id') id: string, @Body() dto: CreatePhoneDto): Promise<CustomerResponseDto> {
    return this.customers.addPhone(id, dto);
  }

  @Delete(':id/phones/:phoneId')
  @Permissions('customers:write')
  @ApiOperation({ summary: 'حذف شماره تلفن مشتری' })
  removePhone(
    @Param('id') id: string,
    @Param('phoneId') phoneId: string,
  ): Promise<CustomerResponseDto> {
    return this.customers.removePhone(id, phoneId);
  }
}
