/**
 * کاتالوگ نام رویدادهای دامنه (Domain Events).
 * نام‌ها dot-notation‌اند تا با EventEmitter2 سازگار باشند. هر ماژول به‌جای فراخوانی
 * مستقیم سرویس ماژول دیگر، رویداد منتشر می‌کند و شنونده‌ها (Timeline/Notification/
 * Workflow/Realtime/Audit) واکنش نشان می‌دهند.
 */
export const DomainEvents = {
  // مشتری / سرنخ
  CustomerCreated: 'customer.created',
  CustomerUpdated: 'customer.updated',
  LeadCreated: 'lead.created',
  // فروش
  DealCreated: 'deal.created',
  DealStageChanged: 'deal.stage_changed',
  // تماس
  IncomingCallReceived: 'call.incoming',
  OutgoingCallCompleted: 'call.outgoing_completed',
  // پشتیبانی
  TicketCreated: 'ticket.created',
  TicketUpdated: 'ticket.updated',
  TicketAssigned: 'ticket.assigned',
  TicketClosed: 'ticket.closed',
  // نگهداری
  MaintenanceScheduled: 'maintenance.scheduled',
  MaintenanceCompleted: 'maintenance.completed',
  // مالی
  InvoiceCreated: 'invoice.created',
  PaymentReceived: 'payment.received',
  // گارانتی
  WarrantyActivated: 'warranty.activated',
  // دارایی (تجهیزات HVAC)
  AssetCreated: 'asset.created',
  AssetUpdated: 'asset.updated',
  // اتوماسیون
  WorkflowExecuted: 'workflow.executed',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];

/** کانال catch-all که همه‌ی رویدادها روی آن هم منتشر می‌شوند (برای Timeline/Audit/Workflow). */
export const ALL_DOMAIN_EVENTS = 'domain.event';

/** برچسب فارسی هر رویداد — برای نمایش در Timeline و مستندات. */
export const DOMAIN_EVENT_LABELS: Record<string, string> = {
  'customer.created': 'مشتری ایجاد شد',
  'customer.updated': 'مشتری به‌روزرسانی شد',
  'lead.created': 'سرنخ جدید ایجاد شد',
  'deal.created': 'معامله ایجاد شد',
  'deal.stage_changed': 'مرحله‌ی معامله تغییر کرد',
  'call.incoming': 'تماس ورودی دریافت شد',
  'call.outgoing_completed': 'تماس خروجی پایان یافت',
  'ticket.created': 'تیکت ایجاد شد',
  'ticket.updated': 'تیکت به‌روزرسانی شد',
  'ticket.assigned': 'تیکت واگذار شد',
  'ticket.closed': 'تیکت بسته شد',
  'maintenance.scheduled': 'سرویس دوره‌ای زمان‌بندی شد',
  'maintenance.completed': 'سرویس دوره‌ای انجام شد',
  'invoice.created': 'فاکتور صادر شد',
  'payment.received': 'پرداخت دریافت شد',
  'warranty.activated': 'گارانتی فعال شد',
  'asset.created': 'تجهیز ثبت شد',
  'asset.updated': 'تجهیز به‌روزرسانی شد',
  'workflow.executed': 'گردش‌کار اجرا شد',
};
