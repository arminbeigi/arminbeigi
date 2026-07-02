import { SearchService } from './search.service';
import type { ISearchProvider } from './search-provider.interface';

describe('SearchService', () => {
  const providerA: ISearchProvider = {
    entityType: 'CUSTOMER',
    label: 'مشتریان',
    search: jest.fn().mockResolvedValue([
      { entityType: 'CUSTOMER', id: 'c1', title: 'آریا', link: '/x', score: 45 },
      { entityType: 'CUSTOMER', id: 'c2', title: 'آریا تهویه', link: '/y', score: 100 },
    ]),
  };
  const providerB: ISearchProvider = {
    entityType: 'TICKET',
    label: 'تیکت‌ها',
    search: jest.fn().mockResolvedValue([{ entityType: 'TICKET', id: 't1', title: 'خرابی', link: '/t', score: 70 }]),
  };

  it('کوئری کوتاه‌تر از ۲ نویسه نتیجه‌ی خالی می‌دهد', async () => {
    const s = new SearchService([providerA]);
    expect((await s.search('a')).hits).toHaveLength(0);
  });

  it('نتایج همه‌ی provider‌ها را بر اساس score نزولی ادغام می‌کند', async () => {
    const s = new SearchService([providerA, providerB]);
    const res = await s.search('آریا');
    expect(res.hits.map((h) => h.id)).toEqual(['c2', 't1', 'c1']); // 100, 70, 45
    expect(res.groups).toEqual(
      expect.arrayContaining([
        { entityType: 'CUSTOMER', label: 'مشتریان', count: 2 },
        { entityType: 'TICKET', label: 'تیکت‌ها', count: 1 },
      ]),
    );
  });

  it('فیلتر types فقط provider‌های انتخابی را اجرا می‌کند', async () => {
    const s = new SearchService([providerA, providerB]);
    const res = await s.search('آریا', { types: ['TICKET'] });
    expect(res.hits.every((h) => h.entityType === 'TICKET')).toBe(true);
  });

  it('خطای یک provider کل جست‌وجو را نمی‌شکند', async () => {
    const bad: ISearchProvider = { entityType: 'X', label: 'x', search: jest.fn().mockRejectedValue(new Error('boom')) };
    const s = new SearchService([bad, providerB]);
    const res = await s.search('خراب');
    expect(res.hits.some((h) => h.entityType === 'TICKET')).toBe(true);
  });
});
