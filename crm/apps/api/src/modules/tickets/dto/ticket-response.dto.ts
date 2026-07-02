import {
  Prisma,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

/** ساختار کامنت در پاسخ */
export interface TicketCommentView {
  id: string;
  body: string;
  isInternal: boolean;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}

/** Prisma payload کامل برای نگاشت */
const ticketInclude = {
  customer: { select: { id: true, displayName: true } },
  assignee: { select: { id: true, fullName: true } },
  project: { select: { id: true, title: true } },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { fullName: true } } },
  },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
export const TICKET_INCLUDE = ticketInclude;

/** نمای خلاصه (برای فهرست) — بدون کامنت‌ها */
const ticketListInclude = {
  customer: { select: { id: true, displayName: true } },
  assignee: { select: { id: true, fullName: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;
export const TICKET_LIST_INCLUDE = ticketListInclude;
export type TicketListRow = Prisma.TicketGetPayload<{ include: typeof ticketListInclude }>;

export class TicketResponseDto {
  id!: string;
  code!: string;
  subject!: string;
  description!: string | null;
  category!: TicketCategory;
  priority!: TicketPriority;
  status!: TicketStatus;
  customerId!: string;
  customerName!: string | null;
  projectId!: string | null;
  projectTitle!: string | null;
  assigneeId!: string | null;
  assigneeName!: string | null;
  slaDueAt!: Date | null;
  resolvedAt!: Date | null;
  closedAt!: Date | null;
  commentsCount!: number;
  comments?: TicketCommentView[];
  createdAt!: Date;
  updatedAt!: Date;

  static fromList(t: TicketListRow): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = t.id;
    dto.code = t.code;
    dto.subject = t.subject;
    dto.description = t.description;
    dto.category = t.category;
    dto.priority = t.priority;
    dto.status = t.status;
    dto.customerId = t.customerId;
    dto.customerName = t.customer?.displayName ?? null;
    dto.projectId = t.projectId;
    dto.projectTitle = null;
    dto.assigneeId = t.assigneeId;
    dto.assigneeName = t.assignee?.fullName ?? null;
    dto.slaDueAt = t.slaDueAt;
    dto.resolvedAt = t.resolvedAt;
    dto.closedAt = t.closedAt;
    dto.commentsCount = t._count.comments;
    dto.createdAt = t.createdAt;
    dto.updatedAt = t.updatedAt;
    return dto;
  }

  static from(t: TicketWithRelations): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = t.id;
    dto.code = t.code;
    dto.subject = t.subject;
    dto.description = t.description;
    dto.category = t.category;
    dto.priority = t.priority;
    dto.status = t.status;
    dto.customerId = t.customerId;
    dto.customerName = t.customer?.displayName ?? null;
    dto.projectId = t.projectId;
    dto.projectTitle = t.project?.title ?? null;
    dto.assigneeId = t.assigneeId;
    dto.assigneeName = t.assignee?.fullName ?? null;
    dto.slaDueAt = t.slaDueAt;
    dto.resolvedAt = t.resolvedAt;
    dto.closedAt = t.closedAt;
    dto.commentsCount = t._count.comments;
    dto.comments = t.comments.map((c) => ({
      id: c.id,
      body: c.body,
      isInternal: c.isInternal,
      authorId: c.authorId,
      authorName: c.author?.fullName ?? null,
      createdAt: c.createdAt,
    }));
    dto.createdAt = t.createdAt;
    dto.updatedAt = t.updatedAt;
    return dto;
  }
}
