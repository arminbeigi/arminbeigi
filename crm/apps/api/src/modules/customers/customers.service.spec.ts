import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: Record<string, jest.Mock>;

  const customer = (over: Record<string, unknown> = {}) =>
    ({
      id: 'c1',
      code: 'C-1',
      type: 'CONTRACTOR',
      status: 'LEAD',
      displayName: 'شرکت تأسیساتی آریا',
      companyName: 'شرکت تأسیساتی آریا',
      nationalId: null,
      economicCode: null,
      source: 'OTHER',
      leadScore: 0,
      notesText: null,
      ownerId: 'u1',
      phones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    }) as never;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      fuzzySearchIds: jest.fn(),
      findManyByIdsOrdered: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      addPhone: jest.fn(),
      findPhone: jest.fn(),
      deletePhone: jest.fn().mockResolvedValue(undefined),
      findCustomerByPhone: jest.fn(),
    };
    service = new CustomersService(repo as unknown as CustomersRepository);
  });

  describe('create', () => {
    it('شماره را نرمال می‌کند و مالک پیش‌فرض را کاربر جاری می‌گذارد', async () => {
      repo.create.mockResolvedValue(customer());
      await service.create(
        { type: 'CONTRACTOR', displayName: 'شرکت آریا', phones: [{ number: '۰۹۱۲۳۴۵۶۷۸۹' }] } as never,
        'u1',
      );
      const arg = repo.create.mock.calls[0][0];
      expect(arg.phones[0].number).toBe('09123456789'); // ارقام فارسی → لاتین
      expect(arg.phones[0].rawNumber).toBe('۰۹۱۲۳۴۵۶۷۸۹');
      expect(arg.base.owner.connect.id).toBe('u1');
    });

    it('شماره تکراری (P2002) ⇒ ConflictException', async () => {
      repo.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
      );
      await expect(
        service.create({ type: 'RESIDENTIAL', displayName: 'علی' } as never, 'u1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('search', () => {
    it('با q از مسیر فازی استفاده می‌کند', async () => {
      repo.fuzzySearchIds.mockResolvedValue({ ids: ['c1'], total: 1 });
      repo.findManyByIdsOrdered.mockResolvedValue([customer()]);
      const res = await service.search({ q: 'تاسیسات اریا', page: 1, limit: 20, skip: 0 } as never);
      expect(repo.fuzzySearchIds).toHaveBeenCalled();
      expect(repo.list).not.toHaveBeenCalled();
      expect(res.meta.total).toBe(1);
      expect(res.data[0].displayName).toContain('آریا');
    });

    it('بدون q از مسیر فهرست استاندارد استفاده می‌کند', async () => {
      repo.list.mockResolvedValue({ data: [customer()], total: 1 });
      await service.search({ page: 1, limit: 20, skip: 0 } as never);
      expect(repo.list).toHaveBeenCalled();
      expect(repo.fuzzySearchIds).not.toHaveBeenCalled();
    });
  });

  describe('findOne / update', () => {
    it('مشتری ناموجود ⇒ NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('به‌روزرسانی روی مشتری ناموجود ⇒ NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('x', { status: 'ACTIVE' } as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('lookupByPhone', () => {
    it('شماره را نرمال کرده و مشتری را برمی‌گرداند', async () => {
      repo.findCustomerByPhone.mockResolvedValue(customer());
      const res = await service.lookupByPhone('+98 912 345 6789');
      expect(repo.findCustomerByPhone).toHaveBeenCalledWith('09123456789');
      expect(res.found).toBe(true);
      expect(res.customer?.id).toBe('c1');
    });

    it('نبود مشتری ⇒ found=false', async () => {
      repo.findCustomerByPhone.mockResolvedValue(null);
      const res = await service.lookupByPhone('02112345678');
      expect(res.found).toBe(false);
      expect(res.customer).toBeNull();
    });
  });
});
