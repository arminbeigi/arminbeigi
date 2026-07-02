import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventBus } from './domain-event-bus';
import { ALL_DOMAIN_EVENTS, DomainEvents } from './event-names';

/** تست واحد ناقل رویداد — انتشار روی کانال اختصاصی و catch-all، و شکست‌ناپذیری. */
describe('DomainEventBus', () => {
  let emitter: EventEmitter2;
  let bus: DomainEventBus;

  beforeEach(() => {
    emitter = new EventEmitter2();
    bus = new DomainEventBus(emitter);
  });

  it('رویداد را روی کانال اختصاصی و کانال catch-all منتشر می‌کند', async () => {
    const specific = jest.fn();
    const all = jest.fn();
    emitter.on(DomainEvents.TicketCreated, specific);
    emitter.on(ALL_DOMAIN_EVENTS, all);

    const evt = bus.publish({
      name: DomainEvents.TicketCreated,
      entityType: 'TICKET',
      entityId: 't1',
      payload: { code: 'X' },
    });

    // emitAsync در همان microtask اجرا می‌شود
    await Promise.resolve();
    expect(specific).toHaveBeenCalledWith(expect.objectContaining({ entityId: 't1' }));
    expect(all).toHaveBeenCalledWith(expect.objectContaining({ name: 'ticket.created' }));
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });

  it('occurredAt در صورت نبود به‌صورت خودکار مقداردهی می‌شود', () => {
    const evt = bus.publish({
      name: DomainEvents.CustomerCreated,
      entityType: 'CUSTOMER',
      entityId: 'c1',
      payload: {},
    });
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });

  it('خطای یک شنونده، publisher را متوقف نمی‌کند', () => {
    emitter.on(DomainEvents.DealCreated, () => {
      throw new Error('boom');
    });
    expect(() =>
      bus.publish({ name: DomainEvents.DealCreated, entityType: 'DEAL', entityId: 'd1', payload: {} }),
    ).not.toThrow();
  });
});
