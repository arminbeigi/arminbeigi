import { Injectable, NotFoundException } from '@nestjs/common';
import { CallDirection, LeadSource, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { normalizePhone } from '../../common/utils/persian';
import { CustomersService } from '../customers/customers.service';
import { UsersService } from '../users/users.service';
import { CallFilters, CallsRepository } from './calls.repository';
import { CallResponseDto } from './dto/call-response.dto';
import { IngestCallDto } from './dto/ingest-call.dto';
import { LinkCallDto } from './dto/link-call.dto';
import { QueryCallsDto } from './dto/query-calls.dto';

export interface CallIngestResult {
  call: CallResponseDto;
  matched: boolean; // مشتری شناخته‌شده تطبیق یافت
  leadCreated: boolean; // سرنخ جدید ساخته شد
}

@Injectable()
export class CallsService {
  constructor(
    private readonly repo: CallsRepository,
    private readonly customers: CustomersService,
    private readonly users: UsersService,
  ) {}

  /**
   * ثبت/به‌روزرسانی رویداد تماس (idempotent روی uniqueId).
   * - اپراتور را با داخلی پیدا می‌کند
   * - مشتری را با شماره تطبیق می‌دهد؛ در صورت ناشناس‌بودن، سرنخ می‌سازد
   */
  async ingest(dto: IngestCallDto): Promise<CallIngestResult> {
    const fromNumber = normalizePhone(dto.fromNumber);
    const toNumber = normalizePhone(dto.toNumber);

    // اپراتور بر اساس داخلی
    let agentId: string | undefined;
    if (dto.agentExtension) {
      const agent = await this.users.findByExtension(dto.agentExtension);
      agentId = agent?.id;
    }

    // تطبیق مشتری
    let customerId = dto.customerId;
    let matched = false;
    let leadCreated = false;
    if (!customerId && dto.direction !== CallDirection.INTERNAL) {
      const matchNumber = dto.direction === CallDirection.INBOUND ? dto.fromNumber : dto.toNumber;
      const existing = await this.customers.findRawByPhone(matchNumber);
      if (existing) {
        customerId = existing.id;
        matched = true;
      } else {
        const source =
          dto.direction === CallDirection.INBOUND
            ? LeadSource.PHONE_INBOUND
            : LeadSource.PHONE_OUTBOUND;
        const lead = await this.customers.createLeadFromCall(matchNumber, source);
        customerId = lead.id;
        leadCreated = true;
      }
    } else if (customerId) {
      matched = true;
    }

    const mutable: Prisma.CallUpdateInput = {
      status: dto.status ?? undefined,
      did: dto.did,
      queue: dto.queue,
      channel: dto.channel,
      linkedId: dto.linkedId,
      waitSeconds: dto.waitSeconds,
      talkSeconds: dto.talkSeconds,
      recordingPath: dto.recordingPath,
      recordingUrl: dto.recordingUrl,
      ...(dto.answeredAt ? { answeredAt: new Date(dto.answeredAt) } : {}),
      ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
      ...(agentId ? { agent: { connect: { id: agentId } } } : {}),
      ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
    };

    const create: Prisma.CallCreateInput = {
      uniqueId: dto.uniqueId,
      direction: dto.direction,
      fromNumber,
      toNumber,
      ...(dto.status ? { status: dto.status } : {}),
      did: dto.did,
      queue: dto.queue,
      channel: dto.channel,
      linkedId: dto.linkedId,
      waitSeconds: dto.waitSeconds,
      talkSeconds: dto.talkSeconds,
      recordingPath: dto.recordingPath,
      recordingUrl: dto.recordingUrl,
      ...(dto.startedAt ? { startedAt: new Date(dto.startedAt) } : {}),
      ...(dto.answeredAt ? { answeredAt: new Date(dto.answeredAt) } : {}),
      ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
      ...(agentId ? { agent: { connect: { id: agentId } } } : {}),
      ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
    };

    const call = await this.repo.upsertByUniqueId(dto.uniqueId, create, mutable);
    return { call: CallResponseDto.from(call), matched, leadCreated };
  }

  async findOne(id: string): Promise<CallResponseDto> {
    const call = await this.repo.findById(id);
    if (!call) throw new NotFoundException('تماس یافت نشد');
    return CallResponseDto.from(call);
  }

  async findByUniqueId(uniqueId: string): Promise<CallResponseDto | null> {
    const call = await this.repo.findByUniqueId(uniqueId);
    return call ? CallResponseDto.from(call) : null;
  }

  async list(query: QueryCallsDto): Promise<PaginatedResult<CallResponseDto>> {
    const filters: CallFilters = {
      direction: query.direction,
      status: query.status,
      agentId: query.agentId,
      customerId: query.customerId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    const { data, total } = await this.repo.list({ filters, skip: query.skip, take: query.limit });
    return new PaginatedResult(data.map(CallResponseDto.from), total, query.page, query.limit);
  }

  async link(id: string, dto: LinkCallDto): Promise<CallResponseDto> {
    await this.ensureExists(id);
    const data: Prisma.CallUpdateInput = {};
    if (dto.dealId) data.deal = { connect: { id: dto.dealId } };
    if (dto.ticketId) data.ticket = { connect: { id: dto.ticketId } };
    try {
      const updated = await this.repo.update(id, data);
      return CallResponseDto.from(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('معامله یا تیکت مرتبط یافت نشد');
      }
      throw e;
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('تماس یافت نشد');
  }
}
