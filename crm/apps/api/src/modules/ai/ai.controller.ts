import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AiService, CallAnalysis } from './ai.service';
import { AssistantDto } from './dto/assistant.dto';

@ApiTags('دستیار هوشمند')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @Permissions('ai:use')
  @ApiOperation({ summary: 'وضعیت ارائه‌دهنده‌های AI/STT (Mock یا واقعی)' })
  status(): { llm: 'mock' | 'real'; stt: 'mock' | 'real' } {
    return this.ai.status();
  }

  @Post('calls/:id/process')
  @Permissions('ai:use')
  @ApiOperation({ summary: 'تحلیل تماس: رونویسی → خلاصه → نیت → امتیاز سرنخ → پیشنهاد محصول' })
  processCall(@Param('id') id: string): Promise<CallAnalysis> {
    return this.ai.processCall(id);
  }

  @Get('insights')
  @Permissions('ai:use')
  @ApiOperation({ summary: 'فهرست بینش‌های هوش مصنوعی' })
  insights(
    @Query('callId') callId?: string,
    @Query('customerId') customerId?: string,
    @Query('type') type?: string,
  ) {
    return this.ai.listInsights({ callId, customerId, type });
  }

  @Get('recommend')
  @Permissions('ai:use')
  @ApiOperation({ summary: 'پیشنهاد محصول بر اساس آخرین تماس مشتری' })
  recommend(@Query('customerId') customerId: string) {
    return this.ai.recommendForCustomer(customerId);
  }

  @Post('assistant')
  @Permissions('ai:use')
  @ApiOperation({ summary: 'دستیار فروش فارسی (پرسش زبان طبیعی روی داده)' })
  assistant(@Body() dto: AssistantDto): Promise<{ answer: string; data?: unknown }> {
    return this.ai.assistant(dto.query);
  }
}
