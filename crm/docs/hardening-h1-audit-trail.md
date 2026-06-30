# سخت‌سازی H1 — دنباله‌ی ممیزی (Audit Trail)

> وضعیت: **اجراشده و اعتبارسنجی‌شده** (۳ تست واحد جدید + e2e زنده‌ی ۵ سنجه). اولویت: 🟠 High.

## ۱) مسئله
جدول `ActivityLog` در اسکیمای فاز ۲ وجود داشت اما **هرگز نوشته نمی‌شد** (جدول مرده). برای یک
محصول سازمانی، نبودِ ردِ حسابرسیِ عملیات حساس یک شکاف انطباق/امنیت است.

## ۲) راهکار
- **`AuditService`** (ماژول سراسری `AuditModule`): متد `record()` که رویداد را در `ActivityLog`
  می‌نویسد. اصل کلیدی **شکست‌ناپذیری**: خطای ثبت ممیزی هرگز جریان اصلی را نمی‌شکند (فقط لاگ
  هشدار). تست واحد این رفتار را تضمین می‌کند.
- **رویدادهای احراز هویت** (در `AuthService`): `login_success`، `login_failed`
  (با دلیل: user_not_found / bad_password)، و `account_locked` — همراه IP و user-agent در
  metadata. (IP/UA از کنترلر با `trust proxy` خوانده می‌شود.)
- **رویدادهای حذف موجودیت‌ها**: حذف مشتری/معامله/محصول/پروژه با `action='deleted'` و
  `actorId` کاربرِ عامل ثبت می‌شود.
- **خواندن دنباله** (`GET /api/audit`، فقط `settings:manage`): فهرست صفحه‌بندی‌شده با فیلتر
  `entityType`/`actorId`/`action` و نام عاملِ هر رویداد (`actorName`).
- **مقادیر enum جدید** `EntityType`: `AUTH`، `USER`، `ROLE` (مهاجرت `0004_audit_entity_types`،
  افزودنی با `ADD VALUE IF NOT EXISTS`).

## ۳) فایل‌های افزوده/تغییر
- جدید: `src/modules/audit/{audit.module,audit.service,audit.repository,audit.controller}.ts`،
  `dto/query-audit.dto.ts`، `audit.service.spec.ts`.
- `prisma/schema.prisma` + `migrations/0004_audit_entity_types/migration.sql`.
- `auth.service.ts`/`auth.controller.ts` — ثبت رویدادهای ورود + threading زمینه (IP/UA).
- `customers/deals/products/projects` (service + controller) — ثبت رویداد حذف با actorId.
- `app.module.ts` — ثبت `AuditModule` (سراسری).
- به‌روزرسانی ۵ spec برای تزریق mock ممیزی.

## ۴) شواهد اعتبارسنجی
- `npm run build` ⇒ بدون خطا. `npx jest` ⇒ **۶۵/۶۵** سبز.
- **e2e زنده:** ورود ناموفق و موفق و حذف مشتری انجام شد؛ سپس `GET /api/audit` هر سه رویداد
  (`login_failed/AUTH`، `login_success/AUTH`، `deleted/CUSTOMER`) را با `actorName='مدیر سیستم'`
  بازگرداند.

## ۵) سازگاری عقب‌رو
کاملاً افزودنی: مقادیر جدید enum، جدول موجود، و امضای `remove()` با پارامتر **اختیاری** actorId
(کد قدیمی همچنان کار می‌کند). هیچ قرارداد موجودی تغییر نکرد.

## ۶) توسعه‌های آینده (ثبت‌شده)
- صفحه‌ی نمایش دنباله‌ی ممیزی در رابط فارسی (زیر «تنظیمات») — در «گزارش‌گیری پیشرفته» تجمیع می‌شود.
- ثبت رویدادهای تغییر نقش/مجوز کاربران (`USER`/`ROLE`) هنگام افزودن ماژول مدیریت کاربران.
