import { NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  let prisma: {
    asset: Record<string, jest.Mock>;
    customer: { findUnique: jest.Mock };
    project: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let events: { publish: jest.Mock };
  let service: AssetsService;

  beforeEach(() => {
    prisma = {
      asset: {
        create: jest.fn().mockResolvedValue({ id: 'a1', code: 'AS1', name: 'پکیج', kind: 'WALL_BOILER', customerId: 'c1', status: 'ACTIVE' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'a1' }),
        update: jest.fn().mockResolvedValue({ id: 'a1', code: 'AS1', name: 'پکیج', status: 'UNDER_REPAIR' }),
        delete: jest.fn().mockResolvedValue({ id: 'a1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      customer: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'pr1' }) },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    audit = { record: jest.fn() };
    events = { publish: jest.fn() };
    service = new AssetsService(prisma as never, audit as never, events as never);
  });

  it('ساخت تجهیز رویداد asset.created منتشر می‌کند', async () => {
    await service.create({ name: 'پکیج', kind: 'WALL_BOILER', customerId: 'c1' } as never, 'admin');
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'asset.created', entityType: 'ASSET', entityId: 'a1' }),
    );
  });

  it('مشتری ناموجود ⇒ 404', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ name: 'x', kind: 'PUMP', customerId: 'bad' } as never, 'a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('به‌روزرسانی رویداد asset.updated منتشر می‌کند', async () => {
    await service.update('a1', { status: 'UNDER_REPAIR' } as never, 'admin');
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'asset.updated', entityType: 'ASSET' }),
    );
  });

  it('حذف، ممیزی ASSET ثبت می‌کند', async () => {
    await service.remove('a1', 'admin');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted', entityType: 'ASSET', entityId: 'a1' }),
    );
  });

  it('حذف تجهیز ناموجود ⇒ 404', async () => {
    prisma.asset.findUnique.mockResolvedValue(null);
    await expect(service.remove('bad', 'a')).rejects.toBeInstanceOf(NotFoundException);
  });
});
