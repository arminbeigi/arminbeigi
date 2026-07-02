import { NotificationsService } from './notifications.service';
import type { INotificationChannel } from './channels/notification-channel.interface';

describe('NotificationsService', () => {
  let prisma: { notification: Record<string, jest.Mock>; $transaction: jest.Mock };
  let inApp: INotificationChannel & { send: jest.Mock };
  let disabled: INotificationChannel & { send: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'n1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0, 0]),
    };
    inApp = { key: 'in_app', isEnabled: () => true, send: jest.fn().mockResolvedValue(undefined) };
    disabled = { key: 'sms', isEnabled: () => false, send: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(prisma as never, [inApp, disabled]);
  });

  it('فقط کانال‌های فعال را صدا می‌زند', async () => {
    await service.dispatch({ userId: 'u1', type: 'ticket:assigned', title: 'سلام' });
    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(disabled.send).not.toHaveBeenCalled();
    // مقادیر پیش‌فرض
    expect(inApp.send.mock.calls[0][0]).toMatchObject({ priority: 'NORMAL', userId: 'u1' });
  });

  it('خطای یک کانال، بقیه/سرویس را متوقف نمی‌کند', async () => {
    inApp.send.mockRejectedValueOnce(new Error('boom'));
    await expect(
      service.dispatch({ userId: 'u1', type: 't', title: 'x' }),
    ).resolves.toBeUndefined();
  });

  it('enabledChannels کلید کانال‌های فعال را برمی‌گرداند', () => {
    expect(service.enabledChannels()).toEqual(['in_app']);
  });

  it('markAllRead تعداد به‌روزشده را برمی‌گرداند', async () => {
    const res = await service.markAllRead('u1');
    expect(res).toEqual({ count: 3 });
  });
});
