# معماری رویدادهای دامنه (Domain Event Bus)

> وضعیت: **اجراشده و اعتبارسنجی‌شده.** بنیانِ ارتباط بین‌ماژولی برای همه‌ی ماژول‌های آینده.
> ماژول‌ها به‌جای فراخوانی مستقیم سرویس یکدیگر، **رویداد منتشر** می‌کنند و شنونده‌ها واکنش می‌دهند.

## ۱) چرا؟
کاهش وابستگی مستقیم (coupling) بین ماژول‌ها. مثال: پیش‌تر `TicketsService` مستقیماً
`RealtimeGateway` را صدا می‌زد. اکنون تیکت فقط `ticket.created` را منتشر می‌کند و
`RealtimeEventsListener` (در ماژول realtime) آن را می‌گیرد و به سوکت پخش می‌کند. Timeline،
Notification و Workflow نیز بدون هیچ تغییری در ماژول تیکت، همان رویداد را مصرف می‌کنند.

## ۲) اجزا
- **`DomainEventBus`** (`src/events/domain-event-bus.ts`): متد `publish(input)` که رویداد را
  با `occurredAt` مهر می‌زند و روی **دو کانال** منتشر می‌کند:
  1. کانال اختصاصی (نام رویداد، مثل `ticket.created`) — برای شنونده‌های خاص.
  2. کانال catch-all (`domain.event`) — برای شنونده‌های عمومی (Timeline/Audit/Workflow).
  انتشار **شکست‌ناپذیر** است: خطای هیچ شنونده‌ای به publisher یا سایر شنونده‌ها نمی‌رسد.
- **پاکت رویداد** (`DomainEvent`): `{ name, occurredAt, actorId?, entityType, entityId, title?, payload, correlationId? }`.
- **`EventsModule`** (Global): بر پایه‌ی `@nestjs/event-emitter` (EventEmitter2).
- **کاتالوگ نام‌ها** (`src/events/event-names.ts`): ثابت‌های `DomainEvents` + برچسب‌های فارسی.

## ۳) الگوی انتشار و مصرف
```ts
// انتشار (در سرویس ماژول)
this.events.publish({
  name: DomainEvents.TicketCreated,
  actorId, entityType: 'TICKET', entityId: ticket.id,
  title: `تیکت «${ticket.subject}» ایجاد شد`,
  payload: { code, subject, priority, category, status, customerId, assigneeId },
});

// مصرف (شنونده)
@OnEvent(DomainEvents.TicketCreated)
onTicketCreated(e: DomainEvent) { /* ... */ }

// مصرف عمومی (همه‌ی رویدادها)
@OnEvent(ALL_DOMAIN_EVENTS)
onAny(e: DomainEvent) { /* Timeline/Audit/Workflow */ }
```

## ۴) کاتالوگ رویدادها (Event Catalog)
| رویداد | کانال | ماژول منتشرکننده | payload کلیدی | وضعیت |
|---|---|---|---|---|
| CustomerCreated | `customer.created` | مشتریان | customerId, type | آماده (اتصال در به‌روزرسانی ماژول) |
| CustomerUpdated | `customer.updated` | مشتریان | changed fields | آماده |
| LeadCreated | `lead.created` | مشتریان | source | آماده |
| DealCreated | `deal.created` | فروش | dealId, amount | آماده |
| DealStageChanged | `deal.stage_changed` | فروش | from, to | آماده |
| IncomingCallReceived | `call.incoming` | تلفن | callId, from | آماده |
| OutgoingCallCompleted | `call.outgoing_completed` | تلفن | callId, duration | آماده |
| **TicketCreated** | `ticket.created` | پشتیبانی | code, priority, category, assigneeId | **فعال** |
| **TicketUpdated** | `ticket.updated` | پشتیبانی | assigneeId, event? | **فعال** |
| **TicketAssigned** | `ticket.assigned` | پشتیبانی | from, to | **فعال** |
| **TicketClosed** | `ticket.closed` | پشتیبانی | from, to | **فعال** |
| MaintenanceScheduled | `maintenance.scheduled` | نگهداری | assetId, dueAt | آماده (ماژول بعدی) |
| MaintenanceCompleted | `maintenance.completed` | نگهداری | assetId | آماده |
| InvoiceCreated | `invoice.created` | مالی | invoiceId, amount | آماده |
| PaymentReceived | `payment.received` | مالی | amount, method | آماده |
| WarrantyActivated | `warranty.activated` | گارانتی | assetId, until | آماده |
| AssetCreated | `asset.created` | دارایی | assetId, kind | فعال با ماژول Asset |
| AssetUpdated | `asset.updated` | دارایی | changed | فعال با ماژول Asset |
| WorkflowExecuted | `workflow.executed` | اتوماسیون | workflowId, result | آماده |

> «فعال» = هم‌اکنون منتشر می‌شود. «آماده» = نام و پاکت تعریف شده؛ ماژول مربوط هنگام ساخت/به‌روزرسانی
> فقط یک `publish()` اضافه می‌کند (بدون تغییر معماری).

## ۵) شنونده‌های فعلی
- **`RealtimeEventsListener`** (realtime): `ticket.*` → پخش سوکت (`ticket:created`/`ticket:updated`).
- (در ادامه‌ی H7.5) TimelineListener، NotificationListener، WorkflowListener روی `domain.event`.

## ۶) شواهد اعتبارسنجی
- `npx jest` ⇒ **۹۳/۹۳** سبز (شامل ۳ تست جدید ناقل رویداد: انتشار دو‌کاناله، occurredAt خودکار، شکست‌ناپذیری).
- **رگرسیون زنده:** پس از refactor تیکت به مدل رویدادی، e2e تیکت **۱۷/۱۷** و **push زنده‌ی realtime**
  (تیکتِ ساخته‌شده از بیرون بدون رفرش ظاهر شد) — یعنی مسیر جدید event→listener→socket کار می‌کند.
- سازگاری عقب‌رو کامل: قرارداد سوکت فرانت (`ticket:created`/`ticket:updated`) بدون تغییر ماند.

## ۷) توسعه به مقیاس بالا
EventEmitter2 in-process است (مناسب مونولیت ماژولار). برای پردازش پس‌زمینه/توزیع‌شده، بعداً
می‌توان یک پل به صف (BullMQ روی همان Redis) افزود بدون تغییر امضای `publish()`.
