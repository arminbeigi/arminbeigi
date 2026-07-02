import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LogAction, NotifyAction } from './actions/builtin-actions';
import { WORKFLOW_ACTIONS } from './actions/workflow-action.interface';
import { WorkflowController } from './workflow.controller';
import { WorkflowListener } from './workflow.listener';
import { WorkflowService } from './workflow.service';

/**
 * موتور گردش‌کار خودکار. اکشن‌های داخلی: notify (مرکز اعلان) و log.
 * افزونه‌ها اکشن‌های بیشتری (sms/whatsapp/create-task/ai-summary/…) به registry
 * WORKFLOW_ACTIONS اضافه می‌کنند — بدون تغییر هسته.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowListener,
    NotifyAction,
    LogAction,
    {
      provide: WORKFLOW_ACTIONS,
      inject: [NotifyAction, LogAction],
      useFactory: (notify: NotifyAction, log: LogAction) => [notify, log],
    },
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
