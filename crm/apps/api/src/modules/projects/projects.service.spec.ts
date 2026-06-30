import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: Record<string, jest.Mock>;

  const project = (over: Record<string, unknown> = {}) =>
    ({
      id: 'pr1',
      code: 'P-1',
      title: 'موتورخانه آرین',
      type: 'ENGINE_ROOM',
      status: 'DRAFT',
      customerId: 'c1',
      customer: { id: 'c1', displayName: 'شرکت آریا' },
      manager: null,
      address: null,
      managerId: null,
      addressId: null,
      description: null,
      buildingArea: null,
      floors: null,
      units: null,
      heatLoadKcal: null,
      estimatedIrr: new Prisma.Decimal('500000000'),
      finalIrr: null,
      scheduledAt: null,
      completedAt: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    }) as never;

  beforeEach(() => {
    repo = {
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
    };
    service = new ProjectsService(repo as unknown as ProjectsRepository);
  });

  it('create: مشتری را connect و اقلام را می‌سازد', async () => {
    repo.create.mockResolvedValue(project());
    await service.create({
      title: 'موتورخانه آرین', type: 'ENGINE_ROOM', customerId: 'c1',
      items: [{ title: 'دیگ چدنی', quantity: 1, unitIrr: 250000000 }],
    } as never);
    const arg = repo.create.mock.calls[0][0];
    expect(arg.base.customer.connect.id).toBe('c1');
    expect(arg.items).toHaveLength(1);
  });

  describe('انتقال وضعیت', () => {
    it('انتقال مجاز DRAFT→SURVEY انجام می‌شود', async () => {
      repo.findById.mockResolvedValue(project({ status: 'DRAFT' }));
      repo.update.mockResolvedValue(project({ status: 'SURVEY' }));
      const res = await service.update('pr1', { status: 'SURVEY' } as never);
      expect(repo.update.mock.calls[0][1].status).toBe('SURVEY');
      expect(res.status).toBe('SURVEY');
    });

    it('انتقال نامجاز DRAFT→COMPLETED ⇒ BadRequest و update صدا زده نمی‌شود', async () => {
      repo.findById.mockResolvedValue(project({ status: 'DRAFT' }));
      await expect(service.update('pr1', { status: 'COMPLETED' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('IN_PROGRESS→COMPLETED به‌طور خودکار completedAt را ست می‌کند', async () => {
      repo.findById.mockResolvedValue(project({ status: 'IN_PROGRESS' }));
      repo.update.mockResolvedValue(project({ status: 'COMPLETED' }));
      await service.update('pr1', { status: 'COMPLETED' } as never);
      expect(repo.update.mock.calls[0][1].completedAt).toBeInstanceOf(Date);
    });
  });

  it('findOne: پروژه‌ی ناموجود ⇒ NotFoundException', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('search: q ⇒ مسیر فازی، بدون q ⇒ فهرست', async () => {
    repo.fuzzySearchIds.mockResolvedValue({ ids: ['pr1'], total: 1 });
    repo.findManyByIdsOrdered.mockResolvedValue([project()]);
    await service.search({ q: 'موتورخانه', page: 1, limit: 20, skip: 0 } as never);
    expect(repo.fuzzySearchIds).toHaveBeenCalled();

    repo.list.mockResolvedValue({ data: [project()], total: 1 });
    await service.search({ page: 1, limit: 20, skip: 0 } as never);
    expect(repo.list).toHaveBeenCalled();
  });
});
