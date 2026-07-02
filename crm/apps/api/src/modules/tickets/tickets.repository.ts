import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TICKET_INCLUDE,
  TICKET_LIST_INCLUDE,
  TicketListRow,
  TicketWithRelations,
} from './dto/ticket-response.dto';

export interface TicketListFilters {
  where: Prisma.TicketWhereInput;
  skip: number;
  take: number;
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TicketCreateInput): Promise<TicketWithRelations> {
    return this.prisma.ticket.create({ data, include: TICKET_INCLUDE });
  }

  findById(id: string): Promise<TicketWithRelations | null> {
    return this.prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
  }

  /** فقط فیلدهای موردنیاز برای منطق (سبک) */
  findCore(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, status: true, customerId: true, assigneeId: true },
    });
  }

  update(id: string, data: Prisma.TicketUpdateInput): Promise<TicketWithRelations> {
    return this.prisma.ticket.update({ where: { id }, data, include: TICKET_INCLUDE });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.ticket.delete({ where: { id }, select: { id: true } });
  }

  async list(filters: TicketListFilters): Promise<{ rows: TicketListRow[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where: filters.where,
        include: TICKET_LIST_INCLUDE,
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.ticket.count({ where: filters.where }),
    ]);
    return { rows, total };
  }

  addComment(data: Prisma.TicketCommentCreateInput): Promise<{ id: string }> {
    return this.prisma.ticketComment.create({ data, select: { id: true } });
  }

  customerExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
  }

  userExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true } });
  }

  projectExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.project.findUnique({ where: { id }, select: { id: true } });
  }

  /** آمار خلاصه برای داشبورد پشتیبانی */
  async stats(): Promise<{ byStatus: Record<string, number>; overdue: number }> {
    const grouped = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const g of grouped) byStatus[g.status] = g._count._all;
    const overdue = await this.prisma.ticket.count({
      where: {
        slaDueAt: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
    });
    return { byStatus, overdue };
  }
}
