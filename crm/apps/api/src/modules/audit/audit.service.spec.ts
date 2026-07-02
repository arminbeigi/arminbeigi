import { AuditService } from './audit.service';

/**
 * تست واحد AuditService — تضمین ثبت رویداد و اصل «شکست‌ناپذیری»:
 * خطای ثبت ممیزی نباید به فراخواننده پرتاب شود.
 */
describe('AuditService', () => {
  let prisma: { activityLog: { create: jest.Mock } };
  let service: AuditService;

  beforeEach(() => {
    prisma = { activityLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) } };
    service = new AuditService(prisma as never);
  });

  it('رویداد را با مقادیر درست در ActivityLog می‌نویسد', async () => {
    await service.record({
      actorId: 'u1',
      action: 'deleted',
      entityType: 'CUSTOMER',
      entityId: 'c1',
      metadata: { note: 'test' },
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'u1',
        action: 'deleted',
        entityType: 'CUSTOMER',
        entityId: 'c1',
        metadata: { note: 'test' },
      }),
    });
  });

  it('فیلدهای سازمانی (oldValue/newValue/ip/reason) را ثبت می‌کند', async () => {
    await service.record({
      actorId: 'u1',
      action: 'status_changed',
      entityType: 'TICKET',
      entityId: 't1',
      oldValue: { status: 'OPEN' },
      newValue: { status: 'IN_PROGRESS' },
      ip: '1.2.3.4',
      reason: 'پیگیری مشتری',
    });
    const data = prisma.activityLog.create.mock.calls[0][0].data;
    expect(data.oldValue).toEqual({ status: 'OPEN' });
    expect(data.newValue).toEqual({ status: 'IN_PROGRESS' });
    expect(data.ip).toBe('1.2.3.4');
    expect(data.reason).toBe('پیگیری مشتری');
  });

  it('actorId نداشته ⇒ null ذخیره می‌شود', async () => {
    await service.record({ action: 'login_failed', entityType: 'AUTH', entityId: 'unknown' });
    expect(prisma.activityLog.create.mock.calls[0][0].data.actorId).toBeNull();
  });

  it('خطای دیتابیس را بلعیده و throw نمی‌کند (شکست‌ناپذیری)', async () => {
    prisma.activityLog.create.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.record({ action: 'x', entityType: 'AUTH', entityId: 'y' }),
    ).resolves.toBeUndefined();
  });
});
