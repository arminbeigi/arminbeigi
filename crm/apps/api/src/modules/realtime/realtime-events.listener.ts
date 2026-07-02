import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../events/domain-event';
import { DomainEvents } from '../../events/event-names';
import { RealtimeGateway } from './realtime.gateway';

interface TicketEventPayload {
  assigneeId?: string | null;
  [key: string]: unknown;
}

/**
 * پل رویدادهای دامنه → Socket.IO.
 * به‌جای اینکه ماژول تیکت مستقیم به gateway وابسته باشد، این شنونده رویدادهای دامنه‌ی
 * تیکت را گرفته و به کلاینت‌های realtime پخش می‌کند (decoupling کامل).
 */
@Injectable()
export class RealtimeEventsListener {
  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(DomainEvents.TicketCreated)
  onTicketCreated(e: DomainEvent<TicketEventPayload>): void {
    this.gateway.emitTicketEvent(
      'ticket:created',
      { ticketId: e.entityId, ...e.payload },
      e.payload.assigneeId,
    );
  }

  @OnEvent(DomainEvents.TicketUpdated)
  @OnEvent(DomainEvents.TicketAssigned)
  @OnEvent(DomainEvents.TicketClosed)
  onTicketUpdated(e: DomainEvent<TicketEventPayload>): void {
    this.gateway.emitTicketEvent(
      'ticket:updated',
      { ticketId: e.entityId, ...e.payload },
      e.payload.assigneeId,
    );
  }
}
