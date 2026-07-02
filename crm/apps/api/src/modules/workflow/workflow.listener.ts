import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../events/domain-event';
import { ALL_DOMAIN_EVENTS } from '../../events/event-names';
import { WorkflowService } from './workflow.service';

/**
 * شنونده‌ی موتور گردش‌کار — هر رویداد دامنه را به موتور می‌دهد تا گردش‌کارهای
 * فعالِ منطبق (trigger + شرط‌ها) اجرا شوند. اتوماسیون AI آینده از همین مسیر می‌آید.
 */
@Injectable()
export class WorkflowListener {
  constructor(private readonly workflow: WorkflowService) {}

  @OnEvent(ALL_DOMAIN_EVENTS, { async: true })
  async onDomainEvent(event: DomainEvent): Promise<void> {
    await this.workflow.handleEvent(event);
  }
}
