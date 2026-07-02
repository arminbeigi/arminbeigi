import { PluginRegistry } from './plugin-registry.service';
import type { ShofazhPlugin } from './plugin.interface';

/** تست واحد رجیستری افزونه‌ها — ثبت idempotent و نقاط توسعه */
describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  const manifest: ShofazhPlugin = {
    key: 'sms-mock',
    name: 'پیامک (شبیه‌ساز)',
    version: '1.0.0',
    module: class {} as never,
    permissions: [{ key: 'sms:send', group: 'پیامک', name: 'ارسال پیامک' }],
  };

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('مانیفست را ثبت و در list (بدون module/migrate) برمی‌گرداند', () => {
    registry.registerPlugin(manifest);
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0].key).toBe('sms-mock');
    expect((list[0] as Record<string, unknown>).module).toBeUndefined();
  });

  it('ثبت تکراری مانیفست idempotent است', () => {
    registry.registerPlugin(manifest);
    registry.registerPlugin(manifest);
    expect(registry.list()).toHaveLength(1);
  });

  it('کانال اعلان/اکشن گردش‌کار/provider جست‌وجو را با کلید یکتا ثبت می‌کند', () => {
    const channel = { key: 'sms', isEnabled: () => true, send: jest.fn() };
    registry.registerNotificationChannel(channel);
    registry.registerNotificationChannel(channel); // تکراری
    expect(registry.notificationChannels).toHaveLength(1);

    const action = { type: 'sms', execute: jest.fn() };
    registry.registerWorkflowAction(action);
    expect(registry.workflowActions.map((a) => a.type)).toEqual(['sms']);

    const provider = { entityType: 'INVOICE', label: 'فاکتورها', search: jest.fn() };
    registry.registerSearchProvider(provider);
    expect(registry.searchProviders.map((p) => p.entityType)).toEqual(['INVOICE']);
  });
});
