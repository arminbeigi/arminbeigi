import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** تغییر وضعیت تیکت (با اعتبارسنجی انتقال‌های مجاز در سرویس). */
export class ChangeStatusDto {
  @ApiProperty({ enum: TicketStatus, description: 'وضعیت مقصد' })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
