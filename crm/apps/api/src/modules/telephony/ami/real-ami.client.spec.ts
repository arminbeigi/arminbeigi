import { CallDirection } from '@prisma/client';
import { RealAmiClient } from './real-ami.client';
import { CallSignal } from './ami-client.interface';

/**
 * تست واحد ترجمه‌ی رویداد خام Asterisk → سیگنال نرمال‌شده، با تمرکز روی تشخیص
 * جهت تماس از روی Context. رگرسیون واقعی: تماس ورودی Issabel در Context
 * «from-trunk-sip-sip» می‌آید و باید INBOUND تشخیص داده شود (وگرنه پاپ‌آپ نمی‌رود).
 */
describe('RealAmiClient — تشخیص جهت از روی Context', () => {
  const baseOpts = { host: '127.0.0.1', port: 5038, username: 'u', secret: 's' };

  /** یک بسته‌ی خام AMI را به کلاینت تزریق و سیگنال‌های حاصل را جمع می‌کند */
  function feed(client: RealAmiClient, fields: Record<string, string>): CallSignal[] {
    const signals: CallSignal[] = [];
    client.onSignal((s) => void signals.push(s));
    const raw =
      Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n\r\n';
    (client as unknown as { onData: (c: string) => void }).onData(raw);
    return signals;
  }

  const inboundChannel = {
    Event: 'Newchannel',
    Uniqueid: 'abc.1',
    Exten: '8888',
    CallerIDNum: '09121056345',
    Channel: 'SIP/sip-0000004b',
    ChannelStateDesc: 'Down',
  };

  it('پیش‌فرض هوشمند: Context ترانک «from-trunk-sip-sip» را INBOUND می‌شناسد', () => {
    const client = new RealAmiClient(baseOpts);
    const [signal] = feed(client, { ...inboundChannel, Context: 'from-trunk-sip-sip' });
    expect(signal).toBeDefined();
    expect(signal.phase).toBe('RINGING');
    expect(signal.direction).toBe(CallDirection.INBOUND);
    expect(signal.fromNumber).toBe('09121056345');
    expect(signal.toNumber).toBe('8888');
    expect(signal.did).toBe('8888');
  });

  it('پیش‌فرض هوشمند: Context داخلی «from-internal» را OUTBOUND می‌شناسد', () => {
    const client = new RealAmiClient(baseOpts);
    const [signal] = feed(client, { ...inboundChannel, Context: 'from-internal' });
    expect(signal.direction).toBe(CallDirection.OUTBOUND);
    expect(signal.did).toBeUndefined();
  });

  it('Context صریح: تطبیق پیشوندی «from-trunk» شامل «from-trunk-sip-sip» می‌شود', () => {
    const client = new RealAmiClient({ ...baseOpts, inboundContexts: ['from-trunk'] });
    const [signal] = feed(client, { ...inboundChannel, Context: 'from-trunk-sip-sip' });
    expect(signal.direction).toBe(CallDirection.INBOUND);
  });

  it('Context صریح: مقداری که در فهرست نیست INBOUND محسوب نمی‌شود', () => {
    const client = new RealAmiClient({ ...baseOpts, inboundContexts: ['from-pstn'] });
    const [signal] = feed(client, { ...inboundChannel, Context: 'from-trunk-sip-sip' });
    expect(signal.direction).toBe(CallDirection.OUTBOUND);
  });
});
