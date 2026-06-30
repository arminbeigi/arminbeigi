import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/** به‌روزرسانی فیلدهای اسکالر؛ مدیریت شماره‌ها از طریق endpointهای جدا انجام می‌شود */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['phones'] as const),
) {}
