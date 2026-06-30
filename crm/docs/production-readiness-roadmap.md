# نقشه‌راه آمادگی تولید و توسعه‌ی سازمانی — شفازح CRM

> این سند نتیجه‌ی **ممیزی آمادگی تولید** روی کد موجود (نه ارزیابی عمومی) است و نقشه‌راه
> اولویت‌بندی‌شده برای تبدیل MVP به محصول سازمانی بلندمدت را تعریف می‌کند.
> اصل کار: **بدون بازنویسی ماژول‌های موجود مگر در صورت لزوم**، حفظ سازگاری عقب‌رو،
> و ثبات رابط فارسی/RTL.

تاریخ ممیزی: ۱۴۰۵/۰۴/۰۹ (2026-06-30) — مبنا: انتهای فاز ۸ (استقرار).

---

## ۱) خلاصه‌ی وضعیت فعلی (آنچه هست)
- بک‌اند NestJS + Prisma + PostgreSQL، ۹ ماژول کسب‌وکار، RBAC سراسری، فیلتر خطای یکنواخت،
  health ساده، Socket.IO با احراز هویت JWT، الگوی provider برای AMI/AI/STT.
- فرانت Next.js 14 RTL کامل، React Query، realtime popup.
- استقرار Docker Compose تک‌مبدأ (Nginx) + AI رایگان روی مک.
- ۹ فایل تست واحد (jest) + اسکریپت‌های e2e دستی. **بدون CI خودکار.**

## ۲) یافته‌های ممیزی (مبتنی بر بازرسی کد)

| حوزه | یافته | شدت |
|---|---|---|
| امنیت | مسیر `/auth/login` بدون rate-limit/lockout ⇒ مستعد brute-force/account-takeover | 🔴 Critical |
| امنیت | بدون `helmet` (هدرهای امنیتی)؛ `CORS_ORIGINS=*` پیش‌فرض با credentials | 🔴 Critical |
| پشتیبان/DR | هیچ پشتیبان‌گیری/بازیابی دیتابیس و رویه‌ی DR وجود ندارد | 🔴 Critical |
| تست/کیفیت | هیچ CI برای CRM نیست (workflowهای repo فقط SEO‌اند) | 🔴 Critical |
| امنیت/انطباق | جدول `ActivityLog` ساخته شده ولی هرگز نوشته نمی‌شود (audit trail غایب) | 🟠 High |
| مشاهده‌پذیری | بدون structured logging و correlation-id؛ فقط `console`/`Logger` | 🟠 High |
| قابلیت‌اطمینان | health سطحی (فقط DB)؛ بدون liveness/readiness و بررسی Redis | 🟠 High |
| مقیاس‌پذیری | Socket.IO تک‌اینستنس (بدون Redis adapter) ⇒ مانع scale-out | 🟠 High |
| قابلیت‌اطمینان | `enableShutdownHooks` با `beforeExit` نامطمئن ⇒ graceful shutdown ناقص | 🟠 High |
| عملکرد | بدون compression پاسخ‌ها | 🟡 Medium |
| امنیت | Swagger در تولید بدون محافظت باز است | 🟡 Medium |
| امنیت | رمز ادمین seed ضعیف و ثابت (`Admin@12345`) | 🟡 Medium |
| عملکرد | Redis موجود ولی برای cache استفاده نمی‌شود | 🟡 Medium |
| دسترس‌پذیری | `lang/dir` درست؛ نیاز به ممیزی aria/focus/کنتراست | 🟡 Medium |
| کیفیت کد | بدون pre-commit hook / coverage gate / CHANGELOG | 🟢 Low |
| مشاهده‌پذیری | بدون متریک Prometheus و error-tracking | 🟢 Low |

## ۳) نقشه‌راه اولویت‌بندی‌شده

### 🔴 Critical (مسدودکننده‌ی تولید — اول پیاده می‌شوند)
- **C1 — محافظت brute-force احراز هویت:** `@nestjs/throttler` سراسری + سقف سخت‌گیرانه روی
  `login/register/refresh` + قفل موقت حساب پس از چند تلاش ناموفق.
- **C2 — سخت‌سازی امنیتی HTTP:** `helmet`، سخت‌سازی CORS برای تولید، گیت‌کردن Swagger در تولید،
  محدودیت حجم بدنه.
- **C3 — پشتیبان‌گیری و بازیابی فاجعه (DR):** اسکریپت پشتیبان `pg_dump` زمان‌بندی‌شده + بازیابی +
  سرویس backup در compose + سند رویه‌ی DR.
- **C4 — خط‌لوله‌ی CI:** workflow گیت‌هاب برای lint/typecheck/build/test/`prisma validate` + build داکر.

### 🟠 High (پس از Critical)
- **H1 — Audit trail:** فعال‌سازی `ActivityLog` با interceptor/سرویس مرکزی برای عملیات حساس
  (ورود، تغییر مجوز، حذف/ویرایش رکوردهای کلیدی).
- **H2 — Structured logging + correlation-id:** `nestjs-pino` + middleware شناسه‌ی درخواست،
  لاگ یکنواخت JSON، پنهان‌سازی فیلدهای حساس.
- **H3 — Health/observability:** جداسازی liveness/readiness، بررسی Redis، `@nestjs/terminus`.
- **H4 — مقیاس‌پذیری realtime:** آداپتور Redis سوکت برای چنداینستنسی.
- **H5 — Graceful shutdown صحیح:** `app.enableShutdownHooks()` + مدیریت SIGTERM/SIGINT و
  drain اتصال‌ها.
- **H6 — compression + سخت‌سازی Prisma pool/timeouts.**

### 🟡 Medium
- کش Redis برای کوئری‌های پرتکرار؛ ممیزی دسترس‌پذیری؛ متریک Prometheus؛ گیت پوشش تست؛
  چرخش رمز ادمین/راهنمای راه‌اندازی امن.

### 🟢 Low
- pre-commit hooks، CHANGELOG، error-tracking (Sentry self-host)، بهینه‌سازی‌های جزئی.

## ۴) ماژول‌های سازمانی بعدی (پس از سخت‌سازی)
به‌ترتیب، هرکدام با کنترلر/سرویس/ریپازیتوری/DTO/تست/مستند کامل و UI فارسی/RTL:
پشتیبانی (تیکت‌ها)، نگهداری پیشگیرانه، قراردادها، انبار/موجودی، خرید، تأمین‌کنندگان،
گارانتی، Mobile API، اتوماسیون گردش‌کار، پایگاه دانش RAG، گزارش‌گیری پیشرفته، یکپارچگی ERP.

## ۵) اصول اجرا
1. هر تغییر منطقی = یک کامیت مجزا با **تست + مستند**.
2. بدون شکستن سازگاری عقب‌رو (افزودنی، نه تخریبی).
3. ثبات کامل رابط فارسی/RTL.
4. هر قابلیت پیش از رفتن به بعدی، کامل و آماده‌ی تولید شود.

## ۶) پیشرفت
- [x] C1 — Throttler + lockout — ✅ اجراشده (مهاجرت 0003، ۵۹ تست سبز، e2e زنده). سند: `hardening-c1-auth-bruteforce.md`
- [ ] C2 — Helmet + CORS + Swagger gate
- [ ] C3 — Backup/DR
- [ ] C4 — CI pipeline
- [ ] H1..H6
