import { DomainEvent } from '../../../events/domain-event';
import { WorkflowAction } from '../workflow.types';

/** نتیجه‌ی اجرای یک اکشن (برای ثبت در لاگ اجرا). */
export interface ActionResult {
  ok: boolean;
  detail?: string;
}

/**
 * قرارداد اکشن گردش‌کار. اکشن‌های داخلی (notify/log) و اکشن‌های افزونه‌ای (sms/whatsapp/
 * create-task/ai-summary) این قرارداد را پیاده می‌کنند و در registry ثبت می‌شوند.
 */
export interface IWorkflowAction {
  readonly type: string;
  execute(action: WorkflowAction, event: DomainEvent): Promise<ActionResult>;
}

export const WORKFLOW_ACTIONS = 'WORKFLOW_ACTIONS';
