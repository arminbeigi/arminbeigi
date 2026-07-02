import { PrismaService } from '../../prisma/prisma.service';
import { ISearchProvider, SearchHit } from './search-provider.interface';

/** امتیازدهی ساده: تطابق دقیق کد/سریال/شماره > شروع‌با > شامل. */
function score(query: string, ...fields: (string | null | undefined)[]): number {
  const q = query.trim().toLowerCase();
  let best = 0;
  for (const f of fields) {
    if (!f) continue;
    const v = f.toLowerCase();
    if (v === q) best = Math.max(best, 100);
    else if (v.startsWith(q)) best = Math.max(best, 70);
    else if (v.includes(q)) best = Math.max(best, 45);
  }
  return best;
}

const contains = (q: string) => ({ contains: q, mode: 'insensitive' as const });

/**
 * ارائه‌دهنده‌های داخلی جست‌وجو. هر کدام مستقل با Prisma می‌خوانند (بدون وابستگی به سرویس
 * ماژول‌ها) تا سبک و decoupled بمانند. افزونه‌ها می‌توانند provider بیشتری اضافه کنند.
 */
export function buildSearchProviders(prisma: PrismaService): ISearchProvider[] {
  return [
    {
      entityType: 'CUSTOMER',
      label: 'مشتریان',
      async search(q, limit): Promise<SearchHit[]> {
        const rows = await prisma.customer.findMany({
          where: {
            OR: [
              { displayName: contains(q) },
              { companyName: contains(q) },
              { code: contains(q) },
              { phones: { some: { number: contains(q.replace(/\D/g, '') || q) } } },
            ],
          },
          take: limit,
          select: { id: true, displayName: true, companyName: true, code: true, type: true },
        });
        return rows.map((r) => ({
          entityType: 'CUSTOMER',
          id: r.id,
          title: r.displayName,
          subtitle: r.companyName ?? r.code,
          link: `/dashboard/customers/${r.id}`,
          score: score(q, r.displayName, r.companyName, r.code) || 40,
        }));
      },
    },
    {
      entityType: 'PROJECT',
      label: 'پروژه‌ها',
      async search(q, limit) {
        const rows = await prisma.project.findMany({
          where: { OR: [{ title: contains(q) }, { code: contains(q) }] },
          take: limit,
          select: { id: true, title: true, code: true },
        });
        return rows.map((r) => ({ entityType: 'PROJECT', id: r.id, title: r.title, subtitle: r.code, link: `/dashboard/projects/${r.id}`, score: score(q, r.title, r.code) || 40 }));
      },
    },
    {
      entityType: 'DEAL',
      label: 'معاملات',
      async search(q, limit) {
        const rows = await prisma.deal.findMany({
          where: { title: contains(q) },
          take: limit,
          select: { id: true, title: true },
        });
        return rows.map((r) => ({ entityType: 'DEAL', id: r.id, title: r.title, link: `/dashboard/deals`, score: score(q, r.title) || 40 }));
      },
    },
    {
      entityType: 'TICKET',
      label: 'تیکت‌ها',
      async search(q, limit) {
        const rows = await prisma.ticket.findMany({
          where: { OR: [{ subject: contains(q) }, { code: contains(q) }] },
          take: limit,
          select: { id: true, subject: true, code: true },
        });
        return rows.map((r) => ({ entityType: 'TICKET', id: r.id, title: r.subject, subtitle: r.code, link: `/dashboard/tickets/${r.id}`, score: score(q, r.subject, r.code) || 40 }));
      },
    },
    {
      entityType: 'PRODUCT',
      label: 'محصولات',
      async search(q, limit) {
        const rows = await prisma.product.findMany({
          where: { OR: [{ name: contains(q) }, { sku: contains(q) }] },
          take: limit,
          select: { id: true, name: true, sku: true },
        });
        return rows.map((r) => ({ entityType: 'PRODUCT', id: r.id, title: r.name, subtitle: r.sku, link: `/dashboard/products`, score: score(q, r.name, r.sku) || 40 }));
      },
    },
    {
      entityType: 'CALL',
      label: 'تماس‌ها',
      async search(q, limit) {
        const digits = q.replace(/\D/g, '');
        if (!digits) return [];
        const rows = await prisma.call.findMany({
          where: { OR: [{ fromNumber: contains(digits) }, { toNumber: contains(digits) }] },
          take: limit,
          orderBy: { startedAt: 'desc' },
          select: { id: true, fromNumber: true, toNumber: true, direction: true },
        });
        return rows.map((r) => ({ entityType: 'CALL', id: r.id, title: r.fromNumber, subtitle: r.toNumber, link: `/dashboard/calls/${r.id}`, score: score(digits, r.fromNumber, r.toNumber) || 50 }));
      },
    },
    {
      entityType: 'ASSET',
      label: 'تجهیزات',
      async search(q, limit) {
        const rows = await prisma.asset.findMany({
          where: { OR: [{ name: contains(q) }, { serialNumber: contains(q) }, { code: contains(q) }] },
          take: limit,
          select: { id: true, name: true, serialNumber: true, code: true },
        });
        return rows.map((r) => ({ entityType: 'ASSET', id: r.id, title: r.name, subtitle: r.serialNumber ?? r.code, link: `/dashboard/assets`, score: score(q, r.name, r.serialNumber, r.code) || 40 }));
      },
    },
  ];
}
