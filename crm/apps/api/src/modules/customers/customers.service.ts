import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Customer, CustomerStatus, CustomerType, LeadSource, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { normalizePhone } from '../../common/utils/persian';
import { AuditService } from '../../modules/audit/audit.service';
import { CustomersRepository, NormalizedPhoneInput } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCustomerDto, currentUserId: string): Promise<CustomerResponseDto> {
    const { phones, ownerId, ...rest } = dto;
    const base: Prisma.CustomerCreateInput = {
      ...rest,
      owner: { connect: { id: ownerId ?? currentUserId } },
    };
    try {
      const created = await this.repo.create({
        base,
        phones: (phones ?? []).map((p) => this.toPhoneInput(p)),
      });
      return CustomerResponseDto.from(created);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.repo.findById(id);
    if (!customer) throw new NotFoundException('مشتری یافت نشد');
    return CustomerResponseDto.from(customer);
  }

  async search(query: QueryCustomersDto): Promise<PaginatedResult<CustomerResponseDto>> {
    const q = query.q?.trim();
    if (q) {
      const { ids, total } = await this.repo.fuzzySearchIds({
        q,
        type: query.type,
        status: query.status,
        skip: query.skip,
        take: query.limit,
      });
      const rows = await this.repo.findManyByIdsOrdered(ids);
      return new PaginatedResult(rows.map(CustomerResponseDto.from), total, query.page, query.limit);
    }

    const { data, total } = await this.repo.list({
      type: query.type,
      status: query.status,
      skip: query.skip,
      take: query.limit,
    });
    return new PaginatedResult(data.map(CustomerResponseDto.from), total, query.page, query.limit);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    await this.ensureExists(id);
    const { ownerId, ...rest } = dto;
    const data: Prisma.CustomerUpdateInput = {
      ...rest,
      ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
    };
    try {
      const updated = await this.repo.update(id, data);
      return CustomerResponseDto.from(updated);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async remove(id: string, actorId?: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.repo.delete(id);
    await this.audit.record({
      actorId,
      action: 'deleted',
      entityType: 'CUSTOMER',
      entityId: id,
    });
    return { success: true };
  }

  async addPhone(customerId: string, dto: CreatePhoneDto): Promise<CustomerResponseDto> {
    await this.ensureExists(customerId);
    try {
      await this.repo.addPhone(customerId, this.toPhoneInput(dto));
    } catch (e) {
      throw this.translatePrismaError(e);
    }
    return this.findOne(customerId);
  }

  async removePhone(customerId: string, phoneId: string): Promise<CustomerResponseDto> {
    const phone = await this.repo.findPhone(customerId, phoneId);
    if (!phone) throw new NotFoundException('شماره تلفن یافت نشد');
    await this.repo.deletePhone(phoneId);
    return this.findOne(customerId);
  }

  async lookupByPhone(
    number: string,
  ): Promise<{ found: boolean; customer: CustomerResponseDto | null }> {
    const customer = await this.findRawByPhone(number);
    return { found: Boolean(customer), customer: customer ? CustomerResponseDto.from(customer) : null };
  }

  /** تطبیق خام مشتری با شماره (برای لایه‌ی تلفنی) — موجودیت برمی‌گرداند نه DTO */
  findRawByPhone(number: string): Promise<Customer | null> {
    return this.repo.findCustomerByPhone(normalizePhone(number));
  }

  /**
   * ساخت خودکار «سرنخ» برای تماس‌گیرنده‌ی ناشناس (استفاده در لایه‌ی تلفنی/Issabel).
   * نام نمایشی موقت = شماره‌ی نرمال‌شده؛ بعداً اپراتور تکمیل می‌کند.
   */
  async createLeadFromCall(rawNumber: string, source: LeadSource): Promise<Customer> {
    const normalized = normalizePhone(rawNumber);
    return this.repo.create({
      base: {
        type: CustomerType.RESIDENTIAL,
        status: CustomerStatus.LEAD,
        displayName: `تماس‌گیرنده ${normalized}`,
        source,
      },
      phones: [{ number: normalized, rawNumber, isPrimary: true }],
    });
  }

  // ── کمکی‌ها ─────────────────────────────────────────────────────────────────
  private toPhoneInput(p: CreatePhoneDto): NormalizedPhoneInput {
    return {
      number: normalizePhone(p.number),
      rawNumber: p.number,
      label: p.label,
      isPrimary: p.isPrimary ?? false,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('مشتری یافت نشد');
  }

  private translatePrismaError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return new ConflictException('این شماره تلفن قبلاً ثبت شده است');
      if (e.code === 'P2025') return new NotFoundException('رکورد یافت نشد');
    }
    return e instanceof Error ? e : new Error('خطای ناشناخته');
  }
}
