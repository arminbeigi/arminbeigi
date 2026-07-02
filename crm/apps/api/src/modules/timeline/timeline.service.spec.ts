import { TimelineService } from './timeline.service';
import { TimelineRepository } from './timeline.repository';
import type { DomainEvent } from '../../events/domain-event';

describe('TimelineService', () => {
  let repo: { create: jest.Mock; list: jest.Mock; actorName: jest.Mock };
  let service: TimelineService;

  beforeEach(() => {
    repo = {
      create: jest.fn().mockResolvedValue({ id: 'tl1' }),
      list: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      actorName: jest.fn().mockResolvedValue('مدیر سیستم'),
    };
    service = new TimelineService(repo as unknown as TimelineRepository);
  });

  const evt = (over: Partial<DomainEvent> = {}): DomainEvent => ({
    name: 'ticket.created' as DomainEvent['name'],
    occurredAt: new Date(),
    actorId: 'u1',
    entityType: 'TICKET',
    entityId: 't1',
    title: 'تیکت ایجاد شد',
    payload: { code: 'X' },
    ...over,
  });

  it('از رویداد دامنه یک ورودی تایم‌لاین با نام عامل می‌سازد', async () => {
    await service.recordFromEvent(evt());
    expect(repo.actorName).toHaveBeenCalledWith('u1');
    const arg = repo.create.mock.calls[0][0];
    expect(arg).toMatchObject({
      eventName: 'ticket.created',
      entityType: 'TICKET',
      entityId: 't1',
      actorName: 'مدیر سیستم',
      title: 'تیکت ایجاد شد',
    });
  });

  it('اگر title نباشد، از برچسب فارسی رویداد استفاده می‌کند', async () => {
    await service.recordFromEvent(evt({ title: undefined, name: 'ticket.closed' as DomainEvent['name'] }));
    expect(repo.create.mock.calls[0][0].title).toBe('تیکت بسته شد');
  });

  it('بدون actorId، actorName خوانده نمی‌شود', async () => {
    await service.recordFromEvent(evt({ actorId: null }));
    expect(repo.actorName).not.toHaveBeenCalled();
    expect(repo.create.mock.calls[0][0].actorName).toBeNull();
  });

  it('خطای ذخیره را بلعیده و null برمی‌گرداند (شکست‌ناپذیری)', async () => {
    repo.create.mockRejectedValueOnce(new Error('db'));
    await expect(service.recordFromEvent(evt())).resolves.toBeNull();
  });

  it('list فیلترها را به where نگاشت می‌کند', async () => {
    await service.list({ page: 1, limit: 20, skip: 0, entityType: 'TICKET', entityId: 't1' } as never);
    expect(repo.list.mock.calls[0][0].where).toMatchObject({ entityType: 'TICKET', entityId: 't1' });
  });
});
