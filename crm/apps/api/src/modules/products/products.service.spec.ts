import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: Record<string, jest.Mock>;

  const product = (over: Record<string, unknown> = {}) =>
    ({
      id: 'p1',
      sku: 'BDR-G124',
      name: 'دیگ چدنی بودروس G124',
      category: 'BOILER',
      boilerKind: 'CAST_IRON',
      fuelType: 'GAS',
      brandId: 'b1',
      brand: { id: 'b1', name: 'Buderus', nameFa: 'بودروس' },
      description: null,
      capacityKcal: 30000,
      capacityKw: null,
      efficiency: null,
      pressureBar: null,
      flowRate: null,
      headMeter: null,
      capacityLit: null,
      material: 'چدن',
      sections: 8,
      specs: null,
      priceIrr: new Prisma.Decimal('250000000'),
      stockQty: 5,
      warrantyMo: 18,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    }) as never;

  beforeEach(() => {
    repo = {
      createBrand: jest.fn(),
      listBrands: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn(),
      fuzzySearchIds: jest.fn(),
      findManyByIdsOrdered: jest.fn(),
    };
    service = new ProductsService(repo as unknown as ProductsRepository, {
      record: jest.fn(),
    } as never);
  });

  it('create: برند را connect می‌کند و قیمت Decimal را رشته برمی‌گرداند', async () => {
    repo.create.mockResolvedValue(product());
    const res = await service.create({
      sku: 'BDR-G124', name: 'دیگ چدنی بودروس', category: 'BOILER', brandId: 'b1', priceIrr: 250000000,
    } as never);
    const data = repo.create.mock.calls[0][0];
    expect(data.brand.connect.id).toBe('b1');
    expect(res.priceIrr).toBe('250000000'); // Decimal → string
    expect(res.brandName).toBe('بودروس');
  });

  it('create: SKU تکراری (P2002) ⇒ ConflictException', async () => {
    repo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
    );
    await expect(
      service.create({ sku: 'X', name: 'تست محصول', category: 'PUMP' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('search: با q از مسیر فازی، بدون q از فهرست', async () => {
    repo.fuzzySearchIds.mockResolvedValue({ ids: ['p1'], total: 1 });
    repo.findManyByIdsOrdered.mockResolvedValue([product()]);
    const fz = await service.search({ q: 'بودروس چدنی', page: 1, limit: 20, skip: 0 } as never);
    expect(repo.fuzzySearchIds).toHaveBeenCalled();
    expect(fz.data[0].sku).toBe('BDR-G124');

    repo.list.mockResolvedValue({ data: [product()], total: 1 });
    await service.search({ category: 'BOILER', page: 1, limit: 20, skip: 0 } as never);
    expect(repo.list).toHaveBeenCalled();
  });

  it('findOne: محصول ناموجود ⇒ NotFoundException', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
