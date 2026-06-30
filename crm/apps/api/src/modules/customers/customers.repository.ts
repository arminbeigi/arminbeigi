import { Injectable } from '@nestjs/common';
import { Customer, CustomerStatus, CustomerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const LIST_INCLUDE = {
  phones: true,
  owner: { select: { id: true, fullName: true } },
} satisfies Prisma.CustomerInclude;

const DETAIL_INCLUDE = {
  phones: true,
  contacts: true,
  addresses: true,
  owner: { select: { id: true, fullName: true } },
} satisfies Prisma.CustomerInclude;

export interface NormalizedPhoneInput {
  number: string; // normalized
  rawNumber: string;
  label?: string;
  isPrimary?: boolean;
}

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    base: Prisma.CustomerCreateInput;
    phones: NormalizedPhoneInput[];
  }): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        ...data.base,
        phones: data.phones.length ? { createMany: { data: data.phones } } : undefined,
      },
      include: DETAIL_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.customer.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  /** فهرست استاندارد (بدون جست‌وجوی فازی) با فیلتر و صفحه‌بندی */
  async list(params: {
    type?: CustomerType;
    status?: CustomerStatus;
    skip: number;
    take: number;
  }): Promise<{ data: Customer[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {
      ...(params.type ? { type: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total };
  }

  /**
   * جست‌وجوی فازی فارسی روی نام/نام شرکت با fa_normalize + trigram.
   * شناسه‌ها به‌ترتیب شباهت برمی‌گردند؛ هیدریت کامل جداگانه انجام می‌شود.
   */
  async fuzzySearchIds(params: {
    q: string;
    type?: CustomerType;
    status?: CustomerStatus;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`(fa_normalize("displayName") % fa_normalize(${params.q}) OR fa_normalize(coalesce("companyName",'')) % fa_normalize(${params.q}))`,
    ];
    if (params.type) conditions.push(Prisma.sql`"type" = ${params.type}::"CustomerType"`);
    if (params.status) conditions.push(Prisma.sql`"status" = ${params.status}::"CustomerStatus"`);
    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id
      FROM "Customer"
      WHERE ${where}
      ORDER BY GREATEST(
        similarity(fa_normalize("displayName"), fa_normalize(${params.q})),
        similarity(fa_normalize(coalesce("companyName",'')), fa_normalize(${params.q}))
      ) DESC
      LIMIT ${params.take} OFFSET ${params.skip}
    `);

    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS count FROM "Customer" WHERE ${where}
    `);

    return { ids: rows.map((r) => r.id), total: Number(countRows[0]?.count ?? 0) };
  }

  /** هیدریت کامل با حفظ ترتیب ورودی ids */
  async findManyByIdsOrdered(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
      include: LIST_INCLUDE,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id }, data, include: DETAIL_INCLUDE });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  // ── شماره‌ها ────────────────────────────────────────────────────────────────
  addPhone(customerId: string, data: NormalizedPhoneInput) {
    return this.prisma.customerPhone.create({ data: { ...data, customerId } });
  }

  findPhone(customerId: string, phoneId: string) {
    return this.prisma.customerPhone.findFirst({ where: { id: phoneId, customerId } });
  }

  async deletePhone(phoneId: string): Promise<void> {
    await this.prisma.customerPhone.delete({ where: { id: phoneId } });
  }

  /** تطبیق تماس: ابتدا تطبیق دقیق شماره‌ی نرمال‌شده، سپس پسوند (caller-id) */
  async findCustomerByPhone(normalized: string): Promise<Customer | null> {
    const exact = await this.prisma.customerPhone.findFirst({
      where: { number: normalized },
      include: { customer: { include: LIST_INCLUDE } },
    });
    if (exact) return exact.customer;

    const suffix = normalized.slice(-7); // ۷ رقم آخر برای مقاومت در برابر پیش‌شماره
    if (suffix.length < 7) return null;
    const bySuffix = await this.prisma.customerPhone.findFirst({
      where: { number: { endsWith: suffix } },
      include: { customer: { include: LIST_INCLUDE } },
    });
    return bySuffix?.customer ?? null;
  }
}
