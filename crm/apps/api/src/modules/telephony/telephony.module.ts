import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation';
import { CallsModule } from '../calls/calls.module';
import { AMI_CLIENT, IAmiClient } from './ami/ami-client.interface';
import { MockAmiClient } from './ami/mock-ami.client';
import { RealAmiClient } from './ami/real-ami.client';
import { RecordingSyncService } from './recording-sync.service';
import { TelephonyController } from './telephony.controller';
import { TelephonyEvents } from './telephony.events';
import { TelephonyService } from './telephony.service';

/** انتخاب کلاینت AMI بر اساس پیکربندی: Mock (پیش‌فرض) یا Real (هنگام راه‌اندازی Issabel) */
const amiClientProvider = {
  provide: AMI_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): IAmiClient => {
    if (config.get('AMI_MOCK', { infer: true })) {
      return new MockAmiClient();
    }
    const inbound = config.get('AMI_INBOUND_CONTEXTS', { infer: true }) ?? '';
    return new RealAmiClient({
      host: config.get('AMI_HOST', { infer: true }),
      port: config.get('AMI_PORT', { infer: true }),
      username: config.get('AMI_USERNAME', { infer: true }),
      secret: config.get('AMI_SECRET', { infer: true }),
      inboundContexts: inbound
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0),
      outboundContext: config.get('AMI_OUTBOUND_CONTEXT', { infer: true }),
    });
  },
};

@Module({
  imports: [CallsModule],
  controllers: [TelephonyController],
  providers: [TelephonyService, TelephonyEvents, RecordingSyncService, amiClientProvider],
  exports: [TelephonyEvents, TelephonyService],
})
export class TelephonyModule {}
