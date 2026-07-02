import { DomainEvent } from '../../events/domain-event';

export type ConditionOp = 'eq' | 'ne' | 'in' | 'contains' | 'gt' | 'lt';

export interface WorkflowCondition {
  field: string; // مسیر در payload رویداد (مثل "priority") یا "entityType"/"entityId"/"actorId"
  op: ConditionOp;
  value: unknown;
}

export interface WorkflowAction {
  type: string; // notify | log | … (از registry اکشن‌ها)
  params?: Record<string, unknown>;
  delayMs?: number; // تأخیر پیش از اجرا (best-effort در فرایند؛ سقف ۱۰ ثانیه — تأخیر بلند: صف)
  retries?: number; // تعداد تلاش مجدد در صورت خطا
}

/** خواندن یک فیلد از رویداد (payload یا فیلدهای سطح‌بالا؛ مسیر نقطه‌ای پشتیبانی می‌شود). */
function readField(event: DomainEvent, field: string): unknown {
  if (field === 'entityType') return event.entityType;
  if (field === 'entityId') return event.entityId;
  if (field === 'actorId') return event.actorId;
  const payload = event.payload as Record<string, unknown>;
  return field
    .split('.')
    .reduce<unknown>(
      (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
      payload,
    );
}

function compare(op: ConditionOp, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case 'eq':
      return actual === expected;
    case 'ne':
      return actual !== expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    default:
      return false;
  }
}

/** همه‌ی شرط‌ها باید برقرار باشند (AND). آرایه‌ی خالی ⇒ همیشه برقرار. */
export function evaluateConditions(conditions: WorkflowCondition[], event: DomainEvent): boolean {
  return conditions.every((c) => compare(c.op, readField(event, c.field), c.value));
}
