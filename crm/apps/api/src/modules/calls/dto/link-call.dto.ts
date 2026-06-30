import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LinkCallDto {
  @ApiPropertyOptional({ description: 'اتصال به معامله' })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional({ description: 'اتصال به تیکت' })
  @IsOptional()
  @IsString()
  ticketId?: string;
}
