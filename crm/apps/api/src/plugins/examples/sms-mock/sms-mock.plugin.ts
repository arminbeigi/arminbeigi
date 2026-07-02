import { Controller, Get, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { DomainEvent } from '../../../events/domain-event';
import {
  INotificationChannel,
  NotificationPayload,
} from '../../../modules/notifications/channels/notification-channel.interface';
import {
  ActionResult,
  IWorkflowAction,
} from '../../../modules/workflow/actions/workflow-action.interface';
import { WorkflowAction } from '../../../modules/workflow/workflow.types';
import { PluginRegistry } from '../../plugin-registry.service';
import { ShofazhPlugin } from '../../plugin.interface';

/**
 * افزونه‌ی نمونه: پیامک (Mock) — الگوی مرجع برای افزونه‌های واقعی (کاوه‌نگار/ملی‌پیامک/…).
 * همه‌ی نقاط قرارداد افزونه را نشان می‌دهد: کانال اعلان + اکشن گردش‌کار + مسیر HTTP +
 * مجوز + تنظیمات + هوک مهاجرت.
 */

/** کانال پیامک (شبیه‌ساز: فقط لاگ می‌کند؛ افزونه‌ی واقعی HTTP به سرویس‌دهنده می‌زند) */
@Injectable()
export class SmsMockChannel implements INotificationChannel {
  readonly key = 'sms';
  private readonly logger = new Logger('SmsMock');
  readonly sent: { userId: string; title: string }[] = []; // برای آزمون/عیب‌یابی

  isEnabled(): boolean {
    return process.env.SMS_MOCK_ENABLED !== 'false'; // پیش‌فرض فعال (شبیه‌ساز)
  }

  async send(payload: NotificationPayload): Promise<void> {
    this.sent.push({ userId: payload.userId, title: payload.title });
    this.logger.log(`📱 SMS (mock) → کاربر ${payload.userId}: ${payload.title}`);
  }
}

/** اکشن گردش‌کار «sms» — در گردش‌کارها قابل‌استفاده: { type: 'sms', params: { message } } */
@Injectable()
export class SmsWorkflowAction implements IWorkflowAction {
  readonly type = 'sms';
  constructor(private readonly channel: SmsMockChannel) {}

  async execute(action: WorkflowAction, event: DomainEvent): Promise<ActionResult> {
    const userId = (action.params?.userId as string) ?? event.actorId ?? 'unknown';
    await this.channel.send({
      userId,
      type: 'sms',
      title: (action.params?.message as string) ?? event.title ?? event.name,
      priority: 'NORMAL',
    });
    return { ok: true, detail: `sms → ${userId}` };
  }
}

/** مسیر HTTP افزونه — وضعیت کانال پیامک */
@ApiTags('افزونه: پیامک')
@ApiBearerAuth()
@Controller('plugins/sms-mock')
export class SmsMockController {
  constructor(private readonly channel: SmsMockChannel) {}

  @Get('status')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'وضعیت کانال پیامک (شبیه‌ساز)' })
  status(): { enabled: boolean; sentCount: number } {
    return { enabled: this.channel.isEnabled(), sentCount: this.channel.sent.length };
  }
}

/** ماژول افزونه — سرویس‌ها را در PluginRegistry ثبت می‌کند */
@Module({
  controllers: [SmsMockController],
  providers: [SmsMockChannel, SmsWorkflowAction],
})
export class SmsMockModule implements OnModuleInit {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly channel: SmsMockChannel,
    private readonly action: SmsWorkflowAction,
  ) {}

  onModuleInit(): void {
    this.registry.registerNotificationChannel(this.channel);
    this.registry.registerWorkflowAction(this.action);
  }
}

/** مانیفست افزونه */
export const SmsMockPlugin: ShofazhPlugin = {
  key: 'sms-mock',
  name: 'پیامک (شبیه‌ساز)',
  version: '1.0.0',
  description: 'کانال پیامک نمونه + اکشن گردش‌کار sms — الگوی مرجع افزونه‌های واقعی',
  module: SmsMockModule,
  permissions: [{ key: 'sms:send', group: 'پیامک', name: 'ارسال پیامک' }],
  settings: [{ key: 'SMS_MOCK_ENABLED', label: 'فعال‌بودن شبیه‌ساز پیامک', required: false }],
  migrate: async () => {
    // نمونه‌ی هوک مهاجرت — افزونه‌ی واقعی می‌تواند جدول/داده‌ی خود را آماده کند (idempotent)
  },
};
