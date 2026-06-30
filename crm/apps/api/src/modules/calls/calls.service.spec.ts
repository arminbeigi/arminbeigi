import { NotFoundException } from '@nestjs/common';
import { CallsRepository } from './calls.repository';
import { CallsService } from './calls.service';
import { CustomersService } from '../customers/customers.service';
import { UsersService } from '../users/users.service';

describe('CallsService', () => {
  let service: CallsService;
  let repo: Record<string, jest.Mock>;
  let customers: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;

  const call = (over: Record<string, unknown> = {}) =>
    ({
      id: 'call1',
      uniqueId: 'u-1',
      direction: 'INBOUND',
      status: 'RINGING',
      fromNumber: '09123456789',
      toNumber: '02191000000',
      did: null,
      queue: null,
      agentId: null,
      customerId: 'c1',
      dealId: null,
      ticketId: null,
      waitSeconds: null,
      talkSeconds: null,
      startedAt: new Date(),
      answeredAt: null,
      endedAt: null,
      recordingUrl: null,
      transcript: null,
      intent: 'UNKNOWN',
      customer: { id: 'c1', displayName: 'علی', type: 'RESIDENTIAL', status: 'LEAD', leadScore: 0 },
      agent: null,
      ...over,
    }) as never;

  beforeEach(() => {
    repo = {
      upsertByUniqueId: jest.fn().mockResolvedValue(call()),
      findByUniqueId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    };
    customers = { findRawByPhone: jest.fn(), createLeadFromCall: jest.fn() };
    users = { findByExtension: jest.fn() };
    service = new CallsService(
      repo as unknown as CallsRepository,
      customers as unknown as CustomersService,
      users as unknown as UsersService,
    );
  });

  describe('ingest', () => {
    it('تماس ورودی از شماره‌ی ناشناس ⇒ ساخت سرنخ + اتصال', async () => {
      customers.findRawByPhone.mockResolvedValue(null);
      customers.createLeadFromCall.mockResolvedValue({ id: 'lead1' });
      const res = await service.ingest({
        uniqueId: 'u-1', direction: 'INBOUND', fromNumber: '۰۹۱۲۳۴۵۶۷۸۹', toNumber: '02191000000',
      } as never);
      expect(customers.createLeadFromCall).toHaveBeenCalledWith('۰۹۱۲۳۴۵۶۷۸۹', 'PHONE_INBOUND');
      expect(res.leadCreated).toBe(true);
      expect(res.matched).toBe(false);
      // شماره در رکورد تماس نرمال‌شده ذخیره می‌شود
      expect(repo.upsertByUniqueId.mock.calls[0][1].fromNumber).toBe('09123456789');
      expect(repo.upsertByUniqueId.mock.calls[0][1].customer.connect.id).toBe('lead1');
    });

    it('تماس ورودی از مشتری شناخته‌شده ⇒ تطبیق، بدون ساخت سرنخ', async () => {
      customers.findRawByPhone.mockResolvedValue({ id: 'c1' });
      const res = await service.ingest({
        uniqueId: 'u-1', direction: 'INBOUND', fromNumber: '09123456789', toNumber: '02191000000',
      } as never);
      expect(res.matched).toBe(true);
      expect(res.leadCreated).toBe(false);
      expect(customers.createLeadFromCall).not.toHaveBeenCalled();
    });

    it('تماس خروجی ⇒ تطبیق بر اساس مقصد (toNumber)', async () => {
      customers.findRawByPhone.mockResolvedValue({ id: 'c2' });
      await service.ingest({
        uniqueId: 'u-2', direction: 'OUTBOUND', fromNumber: '1001', toNumber: '09120001122',
      } as never);
      expect(customers.findRawByPhone).toHaveBeenCalledWith('09120001122');
    });

    it('داخلی اپراتور را به کاربر تبدیل می‌کند', async () => {
      customers.findRawByPhone.mockResolvedValue({ id: 'c1' });
      users.findByExtension.mockResolvedValue({ id: 'agent7' });
      await service.ingest({
        uniqueId: 'u-3', direction: 'INBOUND', fromNumber: '0912', toNumber: '021', agentExtension: '۲۰۱',
      } as never);
      expect(users.findByExtension).toHaveBeenCalledWith('۲۰۱');
      expect(repo.upsertByUniqueId.mock.calls[0][1].agent.connect.id).toBe('agent7');
    });

    it('تماس داخلی ⇒ بدون تطبیق/ساخت سرنخ', async () => {
      await service.ingest({
        uniqueId: 'u-4', direction: 'INTERNAL', fromNumber: '1001', toNumber: '1002',
      } as never);
      expect(customers.findRawByPhone).not.toHaveBeenCalled();
      expect(customers.createLeadFromCall).not.toHaveBeenCalled();
    });

    it('idempotent: از upsert روی uniqueId استفاده می‌کند', async () => {
      customers.findRawByPhone.mockResolvedValue({ id: 'c1' });
      await service.ingest({
        uniqueId: 'u-1', direction: 'INBOUND', fromNumber: '0912', toNumber: '021',
      } as never);
      expect(repo.upsertByUniqueId).toHaveBeenCalledWith('u-1', expect.any(Object), expect.any(Object));
    });
  });

  it('findOne: تماس ناموجود ⇒ NotFoundException', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
