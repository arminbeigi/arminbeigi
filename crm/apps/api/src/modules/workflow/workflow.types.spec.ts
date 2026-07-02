import { evaluateConditions } from './workflow.types';
import type { DomainEvent } from '../../events/domain-event';

/** تست واحد ارزیابی شرط‌های گردش‌کار */
describe('evaluateConditions', () => {
  const event: DomainEvent = {
    name: 'ticket.created' as DomainEvent['name'],
    occurredAt: new Date(),
    actorId: 'u1',
    entityType: 'TICKET',
    entityId: 't1',
    payload: { priority: 'HIGH', category: 'BREAKDOWN', nested: { level: 3 }, subject: 'پکیج خراب' },
  };

  it('آرایه‌ی خالی ⇒ همیشه برقرار', () => {
    expect(evaluateConditions([], event)).toBe(true);
  });

  it('eq روی فیلد payload', () => {
    expect(evaluateConditions([{ field: 'priority', op: 'eq', value: 'HIGH' }], event)).toBe(true);
    expect(evaluateConditions([{ field: 'priority', op: 'eq', value: 'LOW' }], event)).toBe(false);
  });

  it('AND چند شرط', () => {
    expect(
      evaluateConditions(
        [
          { field: 'priority', op: 'eq', value: 'HIGH' },
          { field: 'category', op: 'eq', value: 'BREAKDOWN' },
        ],
        event,
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: 'priority', op: 'eq', value: 'HIGH' },
          { field: 'category', op: 'eq', value: 'INQUIRY' },
        ],
        event,
      ),
    ).toBe(false);
  });

  it('in / contains / gt / ne', () => {
    expect(evaluateConditions([{ field: 'priority', op: 'in', value: ['HIGH', 'URGENT'] }], event)).toBe(true);
    expect(evaluateConditions([{ field: 'subject', op: 'contains', value: 'خراب' }], event)).toBe(true);
    expect(evaluateConditions([{ field: 'nested.level', op: 'gt', value: 2 }], event)).toBe(true);
    expect(evaluateConditions([{ field: 'priority', op: 'ne', value: 'LOW' }], event)).toBe(true);
  });

  it('فیلدهای سطح‌بالا (entityType/actorId)', () => {
    expect(evaluateConditions([{ field: 'entityType', op: 'eq', value: 'TICKET' }], event)).toBe(true);
    expect(evaluateConditions([{ field: 'actorId', op: 'eq', value: 'u1' }], event)).toBe(true);
  });

  it('فیلد ناموجود ⇒ برقرار نیست', () => {
    expect(evaluateConditions([{ field: 'missing', op: 'eq', value: 'x' }], event)).toBe(false);
  });
});
