import { Injectable, Logger } from '@nestjs/common';
import { NotificationPriority } from '@prisma/client';
import { DomainEvent } from '../../../events/domain-event';
import { NotificationsService } from '../../notifications/notifications.service';
import { WorkflowAction } from '../workflow.types';
import { ActionResult, IWorkflowAction } from './workflow-action.interface';

/** خواندن مقدار از payload بر اساس نام فیلد. */
function fromPayload(event: DomainEvent, field?: string): unknown {
  if (!field) return undefined;
  const p = event.payload as Record<string, unknown>;
  return p?.[field];
}

/**
 * اکشن اعلان — به کاربر مشخص (params.userId) یا کاربری که شناسه‌اش در فیلدی از payload
 * است (params.userIdField مثل assigneeId) و در نبود هر دو، به عاملِ رویداد اعلان می‌فرستد.
 */
@Injectable()
export class NotifyAction implements IWorkflowAction {
  readonly type = 'notify';
  constructor(private readonly notifications: NotificationsService) {}

  async execute(action: WorkflowAction, event: DomainEvent): Promise<ActionResult> {
    const p = action.params ?? {};
    const userId =
      (p.userId as string | undefined) ??
      (fromPayload(event, p.userIdField as string | undefined) as string | undefined) ??
      event.actorId ??
      undefined;
    if (!userId) return { ok: false, detail: 'کاربر مقصد یافت نشد' };
    await this.notifications.dispatch({
      userId,
      type: (p.type as string) ?? 'workflow',
      priority: (p.priority as NotificationPriority) ?? 'NORMAL',
      title: (p.title as string) ?? event.title ?? 'اعلان گردش‌کار',
      body: (p.body as string) ?? null,
      link: (p.link as string) ?? null,
      data: { workflow: true, eventName: event.name, entityId: event.entityId },
    });
    return { ok: true, detail: `notify → ${userId}` };
  }
}

/** اکشن لاگ — صرفاً یک ورودی لاگ (برای دیباگ/آزمون گردش‌کار). */
@Injectable()
export class LogAction implements IWorkflowAction {
  readonly type = 'log';
  private readonly logger = new Logger('Workflow');

  async execute(action: WorkflowAction, event: DomainEvent): Promise<ActionResult> {
    const msg = (action.params?.message as string) ?? event.title ?? event.name;
    this.logger.log(`[workflow] ${msg}`);
    return { ok: true, detail: msg };
  }
}
