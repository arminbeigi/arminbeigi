import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CallResponseDto } from '../calls/dto/call-response.dto';
import { OriginateResult } from './ami/ami-client.interface';
import { OriginateDto } from './dto/originate.dto';
import { SimulateInboundDto } from './dto/simulate-inbound.dto';
import { TelephonyService } from './telephony.service';

@ApiTags('مرکز تماس')
@ApiBearerAuth()
@Controller('telephony')
export class TelephonyController {
  constructor(private readonly telephony: TelephonyService) {}

  @Get('status')
  @Permissions('calls:read')
  @ApiOperation({ summary: 'وضعیت اتصال AMI و حالت (Mock/Real)' })
  status(): { mode: 'mock' | 'real'; connected: boolean } {
    return this.telephony.status();
  }

  @Post('originate')
  @Permissions('calls:manage')
  @ApiOperation({ summary: 'تماس خروجی (کلیک برای تماس)' })
  originate(@Body() dto: OriginateDto): Promise<OriginateResult> {
    return this.telephony.originate(dto);
  }

  @Post('simulate/inbound')
  @Permissions('calls:manage')
  @ApiOperation({ summary: 'شبیه‌سازی تماس ورودی (فقط حالت Mock)' })
  simulateInbound(@Body() dto: SimulateInboundDto): Promise<CallResponseDto | null> {
    return this.telephony.simulateInbound(dto);
  }
}
