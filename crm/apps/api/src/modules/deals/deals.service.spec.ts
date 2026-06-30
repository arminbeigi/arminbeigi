import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DealsRepository } from './deals.repository';
import { DealsService } from './deals.service';

describe('DealsService', () => {
  let service: DealsService;
  let repo: Record<string, jest.Mock>;

  const deal = (over: Record<string, unknown> = {}) =>
    ({
      id: 'd1',
      code: 'D-1',
      title: 'فروش موتورخانه',
      status: 'OPEN',
      customerId: 'c1',
      pipelineId: 'pl1',
      stageId: 'st_new',
      ownerId: 'u1',
      projectId: null,
      amountIrr: new Prisma.Decimal('500000000'),
      score: 0,
      lostReason: null,
      expectedAt: null,
      closedAt: null,
      items: [],
      customer: { id: 'c1', displayName: 'آریا' },
      owner: { id: 'u1', fullName: 'کارشناس' },
      stage: { id: 'st_new', key: 'new', name: 'سرنخ جدید', order: 1, isWon: false, isLost: false },
      pipeline: { id: 'pl1', name: 'فروش' },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    }) as never;

  beforeEach(() => {
    repo = {
      listPipelines: jest.fn(),
      getDefaultPipeline: jest.fn().mockResolvedValue({ id: 'pl1', isDefault: true }),
      getFirstStage: jest.fn().mockResolvedValue({ id: 'st_new' }),
      getStage: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn(),
      fuzzySearchIds: jest.fn(),
      findManyByIdsOrdered: jest.fn(),
      addItem: jest.fn(),
      findItem: jest.fn(),
      deleteItem: jest.fn().mockResolvedValue(undefined),
      findItems: jest.fn(),
      setAmount: jest.fn(),
    };
    service = new DealsService(repo as unknown as DealsRepository, { record: jest.fn() } as never);
  });

  it('create: پایپ‌لاین/مرحله پیش‌فرض و مبلغ خودکار از اقلام', async () => {
    repo.create.mockResolvedValue(deal());
    await service.create(
      {
        title: 'فروش موتورخانه', customerId: 'c1',
        items: [{ title: 'دیگ', quantity: 2, unitIrr: 250000000, discount: 0 }],
      } as never,
      'u1',
    );
    const base = repo.create.mock.calls[0][0].base;
    expect(base.pipeline.connect.id).toBe('pl1');
    expect(base.stage.connect.id).toBe('st_new');
    expect(base.owner.connect.id).toBe('u1');
    expect(base.amountIrr.toString()).toBe('500000000'); // 2*250M - 0
  });

  it('computeAmount: مجموع quantity*unit - discount', async () => {
    repo.create.mockResolvedValue(deal());
    await service.create(
      {
        title: 'x یک', customerId: 'c1',
        items: [
          { title: 'a', quantity: 3, unitIrr: 100, discount: 50 }, // 250
          { title: 'b', quantity: 1, unitIrr: 200, discount: 0 }, // 200
        ],
      } as never,
      'u1',
    );
    expect(repo.create.mock.calls[0][0].base.amountIrr.toString()).toBe('450');
  });

  describe('move (کانبان)', () => {
    it('انتقال به مرحله‌ی برنده ⇒ WON + closedAt', async () => {
      repo.findById.mockResolvedValue(deal({ pipelineId: 'pl1' }));
      repo.getStage.mockResolvedValue({ id: 'st_won', pipelineId: 'pl1', isWon: true, isLost: false });
      repo.update.mockResolvedValue(deal({ status: 'WON' }));
      await service.move('d1', { stageId: 'st_won' } as never);
      const data = repo.update.mock.calls[0][1];
      expect(data.status).toBe('WON');
      expect(data.closedAt).toBeInstanceOf(Date);
    });

    it('انتقال به مرحله‌ی بازنده بدون دلیل ⇒ BadRequest', async () => {
      repo.findById.mockResolvedValue(deal({ pipelineId: 'pl1' }));
      repo.getStage.mockResolvedValue({ id: 'st_lost', pipelineId: 'pl1', isWon: false, isLost: true });
      await expect(service.move('d1', { stageId: 'st_lost' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('انتقال به مرحله‌ی بازنده با دلیل ⇒ LOST + lostReason', async () => {
      repo.findById.mockResolvedValue(deal({ pipelineId: 'pl1' }));
      repo.getStage.mockResolvedValue({ id: 'st_lost', pipelineId: 'pl1', isWon: false, isLost: true });
      repo.update.mockResolvedValue(deal({ status: 'LOST' }));
      await service.move('d1', { stageId: 'st_lost', lostReason: 'قیمت بالا' } as never);
      const data = repo.update.mock.calls[0][1];
      expect(data.status).toBe('LOST');
      expect(data.lostReason).toBe('قیمت بالا');
    });

    it('مرحله از پایپ‌لاین دیگر ⇒ BadRequest', async () => {
      repo.findById.mockResolvedValue(deal({ pipelineId: 'pl1' }));
      repo.getStage.mockResolvedValue({ id: 'x', pipelineId: 'OTHER', isWon: false, isLost: false });
      await expect(service.move('d1', { stageId: 'x' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('findOne: معامله‌ی ناموجود ⇒ NotFoundException', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
