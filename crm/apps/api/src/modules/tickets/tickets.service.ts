import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditService } from '../../modules/audit/audit.service';
import { AiService } from '../../modules/ai/ai.service';
import { DomainEventBus } from '../../events/domain-event-bus';
import { DomainEvents } from '../../events/event-names';
import { TicketsRepository } from './tickets.repository';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

/** انتقال‌های مجاز وضعیت تیکت (گردش‌کار پشتیبانی) */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'CLOSED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'], // بازگشایی ممکن است
  CLOSED: ['IN_PROGRESS'], // بازگشایی تیکت بسته
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly audit: AuditService,
    private readonly ai: AiService,
    private readonly events: DomainEventBus,
  ) {}

  async create(dto: CreateTicketDto, actorId: string): Promise<TicketResponseDto> {
    if (!(await this.repo.customerExists(dto.customerId))) {
      throw new NotFoundException('مشتری یافت نشد');
    }
    if (dto.projectId && !(await this.repo.projectExists(dto.projectId))) {
      throw new NotFoundException('پروژه یافت نشد');
    }
    if (dto.assigneeId && !(await this.repo.userExists(dto.assigneeId))) {
      throw new NotFoundException('کاربر مسئول یافت نشد');
    }

    // دسته‌بندی هوشمند: مقادیر داده‌نشده از روی موضوع/توضیحات تکمیل می‌شوند.
    const classification = this.ai.classifyTicketText(`${dto.subject}\n${dto.description ?? ''}`);

    const data: Prisma.TicketCreateInput = {
      subject: dto.subject,
      description: dto.description ?? null,
      category: dto.category ?? classification.category,
      priority: dto.priority ?? classification.priority,
      slaDueAt: dto.slaDueAt ? new Date(dto.slaDueAt) : null,
      customer: { connect: { id: dto.customerId } },
      ...(dto.projectId ? { project: { connect: { id: dto.projectId } } } : {}),
      ...(dto.assigneeId ? { assignee: { connect: { id: dto.assigneeId } } } : {}),
    };

    const ticket = await this.repo.create(data);

    await this.ai.recordTicketInsight(ticket.id, ticket.customerId, classification);
    await this.audit.record({
      actorId,
      action: 'created',
      entityType: 'TICKET',
      entityId: ticket.id,
      metadata: { code: ticket.code, autoCategory: !dto.category, autoPriority: !dto.priority },
    });
    this.events.publish({
      name: DomainEvents.TicketCreated,
      actorId,
      entityType: 'TICKET',
      entityId: ticket.id,
      title: `تیکت «${ticket.subject}» ایجاد شد`,
      payload: {
        code: ticket.code,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category,
        status: ticket.status,
        customerId: ticket.customerId,
        assigneeId: ticket.assigneeId,
      },
    });
    return TicketResponseDto.from(ticket);
  }

  async findOne(id: string): Promise<TicketResponseDto> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('تیکت یافت نشد');
    return TicketResponseDto.from(ticket);
  }

  async list(query: QueryTicketsDto, currentUserId: string): Promise<PaginatedResult<TicketResponseDto>> {
    const where: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.mine === 'true' ? { assigneeId: currentUserId } : {}),
      ...(query.open === 'true' ? { status: { notIn: ['RESOLVED', 'CLOSED'] } } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q, mode: 'insensitive' } },
              { code: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { rows, total } = await this.repo.list({ where, skip: query.skip, take: query.limit });
    return new PaginatedResult(
      rows.map((r) => TicketResponseDto.fromList(r)),
      total,
      query.page,
      query.limit,
    );
  }

  async update(id: string, dto: UpdateTicketDto): Promise<TicketResponseDto> {
    await this.ensureExists(id);
    if (dto.projectId && !(await this.repo.projectExists(dto.projectId))) {
      throw new NotFoundException('پروژه یافت نشد');
    }

    const data: Prisma.TicketUpdateInput = {
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.slaDueAt !== undefined
        ? { slaDueAt: dto.slaDueAt ? new Date(dto.slaDueAt) : null }
        : {}),
      ...(dto.projectId !== undefined
        ? dto.projectId
          ? { project: { connect: { id: dto.projectId } } }
          : { project: { disconnect: true } }
        : {}),
    };

    const ticket = await this.repo.update(id, data);
    this.events.publish({
      name: DomainEvents.TicketUpdated,
      entityType: 'TICKET',
      entityId: id,
      title: `تیکت «${ticket.subject}» ویرایش شد`,
      payload: { assigneeId: ticket.assigneeId },
    });
    return TicketResponseDto.from(ticket);
  }

  async changeStatus(id: string, status: TicketStatus, actorId: string): Promise<TicketResponseDto> {
    const core = await this.repo.findCore(id);
    if (!core) throw new NotFoundException('تیکت یافت نشد');

    if (core.status === status) {
      throw new BadRequestException('تیکت در همین وضعیت قرار دارد');
    }
    if (!TRANSITIONS[core.status].includes(status)) {
      throw new BadRequestException(`انتقال از «${core.status}» به «${status}» مجاز نیست`);
    }

    const now = new Date();
    const data: Prisma.TicketUpdateInput = {
      status,
      resolvedAt: status === 'RESOLVED' ? now : status === 'IN_PROGRESS' ? null : undefined,
      closedAt: status === 'CLOSED' ? now : status === 'IN_PROGRESS' ? null : undefined,
    };

    const ticket = await this.repo.update(id, data);
    await this.audit.record({
      actorId,
      action: 'status_changed',
      entityType: 'TICKET',
      entityId: id,
      metadata: { from: core.status, to: status },
    });
    this.events.publish({
      name: status === 'CLOSED' ? DomainEvents.TicketClosed : DomainEvents.TicketUpdated,
      actorId,
      entityType: 'TICKET',
      entityId: id,
      title: `وضعیت تیکت «${ticket.subject}» به «${status}» تغییر کرد`,
      payload: { from: core.status, to: status, status, assigneeId: ticket.assigneeId },
    });
    return TicketResponseDto.from(ticket);
  }

  async assign(id: string, dto: AssignTicketDto, actorId: string): Promise<TicketResponseDto> {
    const core = await this.repo.findCore(id);
    if (!core) throw new NotFoundException('تیکت یافت نشد');
    if (dto.assigneeId && !(await this.repo.userExists(dto.assigneeId))) {
      throw new NotFoundException('کاربر مسئول یافت نشد');
    }

    const data: Prisma.TicketUpdateInput = dto.assigneeId
      ? { assignee: { connect: { id: dto.assigneeId } } }
      : { assignee: { disconnect: true } };

    const ticket = await this.repo.update(id, data);
    await this.audit.record({
      actorId,
      action: 'assigned',
      entityType: 'TICKET',
      entityId: id,
      metadata: { from: core.assigneeId, to: dto.assigneeId },
    });
    this.events.publish({
      name: DomainEvents.TicketAssigned,
      actorId,
      entityType: 'TICKET',
      entityId: id,
      title: dto.assigneeId
        ? `تیکت «${ticket.subject}» واگذار شد`
        : `تخصیص تیکت «${ticket.subject}» لغو شد`,
      payload: { from: core.assigneeId, to: dto.assigneeId, assigneeId: dto.assigneeId ?? core.assigneeId },
    });
    return TicketResponseDto.from(ticket);
  }

  async addComment(
    id: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<TicketResponseDto> {
    const core = await this.repo.findCore(id);
    if (!core) throw new NotFoundException('تیکت یافت نشد');

    await this.repo.addComment({
      body: dto.body,
      isInternal: dto.isInternal ?? false,
      ticket: { connect: { id } },
      author: { connect: { id: authorId } },
    });

    const ticket = await this.repo.findById(id);
    this.events.publish({
      name: DomainEvents.TicketUpdated,
      actorId: authorId,
      entityType: 'TICKET',
      entityId: id,
      title: `پاسخ جدید روی تیکت «${ticket!.subject}»`,
      payload: { event: 'comment', isInternal: dto.isInternal ?? false, assigneeId: core.assigneeId },
    });
    return TicketResponseDto.from(ticket!);
  }

  async remove(id: string, actorId: string): Promise<{ success: true }> {
    const core = await this.repo.findCore(id);
    if (!core) throw new NotFoundException('تیکت یافت نشد');
    await this.repo.delete(id);
    await this.audit.record({ actorId, action: 'deleted', entityType: 'TICKET', entityId: id });
    this.events.publish({
      name: DomainEvents.TicketUpdated,
      actorId,
      entityType: 'TICKET',
      entityId: id,
      title: 'تیکت حذف شد',
      payload: { deleted: true, assigneeId: core.assigneeId },
    });
    return { success: true };
  }

  stats(): Promise<{ byStatus: Record<string, number>; overdue: number }> {
    return this.repo.stats();
  }

  private async ensureExists(id: string): Promise<void> {
    if (!(await this.repo.findCore(id))) throw new NotFoundException('تیکت یافت نشد');
  }
}
