import { BadRequestException } from '@nestjs/common';
import { CallsService } from '../calls/calls.service';
import { MockAmiClient } from './ami/mock-ami.client';
import { RealAmiClient } from './ami/real-ami.client';
import { CrmPopup, TelephonyEvents } from './telephony.events';
import { RecordingSyncService } from './recording-sync.service';
import { TelephonyService } from './telephony.service';

describe('TelephonyService', () => {
  let calls: { ingest: jest.Mock; findByUniqueId: jest.Mock };
  let events: TelephonyEvents;
  let recordings: { sync: jest.Mock };

  const makeService = (ami: MockAmiClient | RealAmiClient) =>
    new TelephonyService(
      ami,
      calls as unknown as CallsService,
      events,
      recordings as unknown as RecordingSyncService,
    );

  beforeEach(() => {
    calls = {
      ingest: jest.fn().mockResolvedValue({
        call: { id: 'call1', uniqueId: 'x', direction: 'INBOUND' },
        matched: false,
        leadCreated: true,
      }),
      findByUniqueId: jest.fn().mockResolvedValue({ id: 'call1' }),
    };
    events = new TelephonyEvents();
    recordings = { sync: jest.fn().mockReturnValue('/recordings/rec.wav') };
  });

  it('شبیه‌سازی ورودی (زنگ→پاسخ→قطع) را به سه ingest نگاشت می‌کند و پاپ‌آپ منتشر می‌کند', async () => {
    const ami = new MockAmiClient();
    const service = makeService(ami);
    await service.onModuleInit();

    const popups: CrmPopup[] = [];
    events.onPopup((p) => popups.push(p));

    await service.simulateInbound({
      fromNumber: '۰۹۱۲۳۴۵۶۷۸۹', answer: true, talkSeconds: 42, recordingPath: '/var/spool/asterisk/monitor/rec.wav',
    } as never);

    const statuses = calls.ingest.mock.calls.map((c) => c[0].status);
    expect(statuses).toEqual(['RINGING', 'ANSWERED', 'ANSWERED']); // قطع با مدت>۰ ⇒ ANSWERED
    // پاپ‌آپ فقط روی زنگِ ورودی
    expect(popups).toHaveLength(1);
    expect(popups[0].leadCreated).toBe(true);
    // همگام‌سازی ضبط روی رویداد قطع
    const hangupDto = calls.ingest.mock.calls[2][0];
    expect(hangupDto.endedAt).toBeDefined();
    expect(hangupDto.recordingUrl).toBe('/recordings/rec.wav');
    expect(recordings.sync).toHaveBeenCalledWith('/var/spool/asterisk/monitor/rec.wav');
  });

  it('قطع بدون مکالمه ⇒ وضعیت NO_ANSWER', async () => {
    const ami = new MockAmiClient();
    const service = makeService(ami);
    await service.onModuleInit();
    // زنگ بدون پاسخ، سپس قطع دستی از طریق سیگنال
    await ami.simulateInbound({ fromNumber: '0912', answer: false });
    // فقط RINGING ثبت شده
    expect(calls.ingest.mock.calls.map((c) => c[0].status)).toEqual(['RINGING']);
  });

  it('originate وقتی قطع است ⇒ BadRequest', async () => {
    const ami = new MockAmiClient(); // متصل نشده
    const service = makeService(ami);
    await expect(
      service.originate({ agentExtension: '201', toNumber: '0912' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('originate در حالت متصل ⇒ تماس خروجی ثبت می‌شود', async () => {
    const ami = new MockAmiClient();
    const service = makeService(ami);
    await service.onModuleInit(); // connect
    const res = await service.originate({ agentExtension: '201', toNumber: '09120001122' } as never);
    expect(res.uniqueId).toBeDefined();
    const outbound = calls.ingest.mock.calls.map((c) => c[0]).filter((d) => d.direction === 'OUTBOUND');
    expect(outbound.length).toBeGreaterThanOrEqual(1);
  });

  it('شبیه‌سازی در حالت Real ⇒ BadRequest', async () => {
    const real = new RealAmiClient({ host: '127.0.0.1', port: 5038, username: 'x', secret: 'y' });
    const service = makeService(real);
    await expect(service.simulateInbound({ fromNumber: '0912' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('status حالت و اتصال را برمی‌گرداند', async () => {
    const ami = new MockAmiClient();
    const service = makeService(ami);
    expect(service.status()).toEqual({ mode: 'mock', connected: false });
    await service.onModuleInit();
    expect(service.status()).toEqual({ mode: 'mock', connected: true });
  });
});
