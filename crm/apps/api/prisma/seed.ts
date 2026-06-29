/**
 * شفازح CRM — Seed (PHASE 2)
 * داده‌های پایه: مجوزها، نقش‌ها (RBAC)، پایپ‌لاین پیش‌فرض فروش و مراحل آن،
 * و چند برند/محصول نمونه‌ی HVAC.
 *
 * اجرا:  prisma db seed   (یا)   node --experimental-strip-types prisma/seed.ts
 * idempotent است: با upsert نوشته شده و چندبار اجرا مشکلی ندارد.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── مجوزها (Permissions) — کلید: «گروه:عملیات» ────────────────────────────────
const PERMISSIONS: { key: string; group: string; name: string }[] = [
  { key: 'customers:read', group: 'مشتریان', name: 'مشاهده مشتریان' },
  { key: 'customers:write', group: 'مشتریان', name: 'ایجاد/ویرایش مشتری' },
  { key: 'customers:delete', group: 'مشتریان', name: 'حذف مشتری' },
  { key: 'products:read', group: 'محصولات', name: 'مشاهده محصولات' },
  { key: 'products:write', group: 'محصولات', name: 'ایجاد/ویرایش محصول' },
  { key: 'products:delete', group: 'محصولات', name: 'حذف محصول' },
  { key: 'projects:read', group: 'پروژه‌ها', name: 'مشاهده پروژه‌ها' },
  { key: 'projects:write', group: 'پروژه‌ها', name: 'ایجاد/ویرایش پروژه' },
  { key: 'deals:read', group: 'فروش', name: 'مشاهده معاملات' },
  { key: 'deals:write', group: 'فروش', name: 'ایجاد/ویرایش معامله' },
  { key: 'calls:read', group: 'تماس‌ها', name: 'مشاهده تماس‌ها' },
  { key: 'calls:manage', group: 'تماس‌ها', name: 'مدیریت تماس و کلیک‌تو‌کال' },
  { key: 'tickets:read', group: 'تیکت‌ها', name: 'مشاهده تیکت‌ها' },
  { key: 'tickets:write', group: 'تیکت‌ها', name: 'ایجاد/ویرایش تیکت' },
  { key: 'reports:read', group: 'گزارش‌ها', name: 'مشاهده گزارش‌ها' },
  { key: 'ai:use', group: 'دستیار هوشمند', name: 'استفاده از دستیار هوشمند' },
  { key: 'users:manage', group: 'تنظیمات', name: 'مدیریت کاربران و نقش‌ها' },
  { key: 'settings:manage', group: 'تنظیمات', name: 'مدیریت تنظیمات سیستم' },
];

// ── نقش‌ها (Roles) و نگاشت مجوزها ─────────────────────────────────────────────
const ALL = PERMISSIONS.map((p) => p.key);
const ROLES: { key: string; name: string; permissions: string[] }[] = [
  { key: 'admin', name: 'مدیر سیستم', permissions: ALL },
  {
    key: 'sales_manager',
    name: 'مدیر فروش',
    permissions: [
      'customers:read', 'customers:write', 'products:read', 'projects:read',
      'projects:write', 'deals:read', 'deals:write', 'calls:read',
      'tickets:read', 'reports:read', 'ai:use',
    ],
  },
  {
    key: 'sales_agent',
    name: 'کارشناس فروش',
    permissions: [
      'customers:read', 'customers:write', 'products:read', 'deals:read',
      'deals:write', 'calls:read', 'calls:manage', 'ai:use',
    ],
  },
  {
    key: 'call_center',
    name: 'اپراتور مرکز تماس',
    permissions: [
      'customers:read', 'customers:write', 'calls:read', 'calls:manage',
      'tickets:read', 'tickets:write', 'ai:use',
    ],
  },
  {
    key: 'technician',
    name: 'تکنسین خدمات',
    permissions: ['customers:read', 'projects:read', 'tickets:read', 'tickets:write'],
  },
  { key: 'viewer', name: 'فقط مشاهده', permissions: ['customers:read', 'deals:read', 'reports:read'] },
];

// ── پایپ‌لاین پیش‌فرض فروش و مراحل ────────────────────────────────────────────
const DEFAULT_PIPELINE = {
  name: 'فروش تجهیزات و موتورخانه',
  stages: [
    { key: 'new', name: 'سرنخ جدید', order: 1, probability: 10 },
    { key: 'qualified', name: 'ارزیابی‌شده', order: 2, probability: 25 },
    { key: 'survey', name: 'بازدید فنی', order: 3, probability: 40 },
    { key: 'proposal', name: 'ارائه پیش‌فاکتور', order: 4, probability: 60 },
    { key: 'negotiation', name: 'مذاکره', order: 5, probability: 80 },
    { key: 'won', name: 'موفق', order: 6, probability: 100, isWon: true },
    { key: 'lost', name: 'ناموفق', order: 7, probability: 0, isLost: true },
  ],
};

async function main() {
  // مجوزها
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: p.key }, update: { group: p.group, name: p.name }, create: p });
  }
  // نقش‌ها + اتصال مجوز
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, isSystem: true },
      create: { key: r.key, name: r.name, isSystem: true },
    });
    const perms = await prisma.permission.findMany({ where: { key: { in: r.permissions } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  // پایپ‌لاین + مراحل
  const existing = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  const pipeline =
    existing ??
    (await prisma.pipeline.create({ data: { name: DEFAULT_PIPELINE.name, isDefault: true } }));
  for (const s of DEFAULT_PIPELINE.stages) {
    await prisma.dealStage.upsert({
      where: { pipelineId_key: { pipelineId: pipeline.id, key: s.key } },
      update: { name: s.name, order: s.order, probability: s.probability, isWon: !!s.isWon, isLost: !!s.isLost },
      create: {
        pipelineId: pipeline.id, key: s.key, name: s.name, order: s.order,
        probability: s.probability, isWon: !!s.isWon, isLost: !!s.isLost,
      },
    });
  }

  const counts = {
    permissions: await prisma.permission.count(),
    roles: await prisma.role.count(),
    rolePermissions: await prisma.rolePermission.count(),
    stages: await prisma.dealStage.count(),
  };
  console.log('✅ seed کامل شد:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error('❌ seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
