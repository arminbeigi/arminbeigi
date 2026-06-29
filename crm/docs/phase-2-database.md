# فاز ۲ — طراحی دیتابیس (PostgreSQL · HVAC-optimized)

> وضعیت: **اعتبارسنجی‌شده روی PostgreSQL 16 واقعی.** اسکیمای Prisma معتبر است،
> هر دو مهاجرت روی دیتابیس تازه اجرا شد، داده‌ی فارسی درج و جست‌وجوی فازی آزمایش شد،
> و seed با موفقیت اجرا شد.

## ۱) خروجی‌های واقعی (Validation Evidence)

| سنجه | مقدار |
|---|---|
| اعتبارسنجی اسکیمای Prisma | ✅ `The schema is valid` (۳/۳ اجرا) |
| تولید Prisma Client | ✅ v6.19.3 |
| جدول‌ها | **۲۷** |
| Enumها | **۱۸** |
| کلیدهای خارجی | **۴۶** |
| ایندکس‌ها (کل) | **۱۱۷** |
| ایندکس GIN trigram (جست‌وجوی فازی) | **۸** |
| اکستنشن‌ها | `pg_trgm`, `unaccent`, `pgcrypto` |
| Seed | ۱۸ مجوز · ۶ نقش · ۵۱ نگاشت مجوز · ۷ مرحله‌ی فروش |

## ۲) موجودیت‌ها و نقشه‌ی ERD

```
                       ┌────────────┐        ┌──────────────┐
                       │   Role     │◀──────▶│  Permission  │   (RBAC: M:N)
                       └─────┬──────┘  Role  └──────────────┘
                             │ M:N    Permission
                       ┌─────▼──────┐        ┌──────────────┐
                       │   User     │───────▶│ RefreshToken │  (rotation/ابطال)
                       └─────┬──────┘ 1:N    └──────────────┘
        owner/manager/agent  │
   ┌──────────────┬──────────┼───────────┬──────────────┬───────────┐
   ▼              ▼          ▼           ▼              ▼           ▼
┌────────┐   ┌─────────┐ ┌────────┐  ┌────────┐    ┌────────┐  ┌──────────┐
│Customer│   │ Project │ │  Deal  │  │  Call  │    │ Ticket │  │ActivityLog│
└───┬────┘   └────┬────┘ └───┬────┘  └───┬────┘    └───┬────┘  └──────────┘
    │ 1:N         │ 1:N      │ 1:N       │             │ 1:N
    ├─CustomerPhone│─ProjectItem ─DealItem│             ├─TicketComment
    ├─CustomerContact          (Product) (Product)      │
    ├─Address ◀───────┘ (محل اجرا)        │             │
    ├─CustomerTag ─▶ Tag                  │             │
    └──────────── همه به ───────────────▶ │ ◀───────────┘
                                    ┌─────────────┐
                                    │  AIInsight  │ (polymorphic: FK اختیاری به
                                    └─────────────┘  Customer/Project/Deal/Call/Ticket)
        ┌──────────┐   ┌───────────┐
        │ Pipeline │──▶│ DealStage │──▶ Deal   (کانبان فروش)
        └──────────┘   └───────────┘
        ┌──────────┐   ┌───────────┐
        │  Brand   │──▶│  Product  │           (boiler/burner/pump/tank/radiator)
        └──────────┘   └───────────┘
        Note (یادداشت آزاد) → Customer/Project/Deal
        Notification → User
```

### گروه‌بندی منطقی
- **هویت/دسترسی:** `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`
- **مشتری (B2B + خانگی + پیمانکار):** `Customer`, `CustomerPhone`, `CustomerContact`, `Address`, `Tag`, `CustomerTag`
- **کاتالوگ HVAC:** `Brand`, `Product`
- **عملیات:** `Project`, `ProjectItem`, `Deal`, `DealItem`, `Pipeline`, `DealStage`
- **مرکز تماس:** `Call`
- **خدمات:** `Ticket`, `TicketComment`
- **هوش مصنوعی:** `AIInsight`
- **مشترک:** `Note`, `ActivityLog`, `Notification`

## ۳) تصمیم‌های مدل‌سازی دامنه (HVAC)

1. **`Customer.type`** چهار نوع موردنیاز را پوشش می‌دهد: `RESIDENTIAL/CONTRACTOR/COMPANY/BUILDING_PROJECT`.
   فیلدهای B2B (`companyName`, `economicCode`, `CustomerContact`) فقط برای انواع شرکتی پر می‌شوند.
2. **`CustomerPhone` جدا از مشتری:** یک مشتری چند شماره دارد (موبایل/دفتر/کارگاه).
   تطبیق caller-id تماس ورودی روی این جدول با ایندکس انجام می‌شود — قلبِ منطق پاپ‌آپ مرکز تماس.
3. **`Product` با مشخصات فنی صریح + `specs Json`:** فیلدهای پرکاربردِ قابل‌فیلتر
   (`capacityKcal`, `fuelType`, `pressureBar`, `flowRate`, `capacityLit`, `sections`, `material`)
   ستون واقعی‌اند تا ایندکس و فیلتر شوند؛ بقیه در `specs` انعطاف‌پذیر می‌مانند.
   `boilerKind` انواع موردنیاز را مدل می‌کند: پکیج دیواری / چدنی / فولادی / زمینی.
4. **`Project.type`** دقیقاً اصطلاحات شما: موتورخانه، پکیج دیواری، دیگ چدنی/فولادی، نصب، سرویس.
   فیلدهای فنی موتورخانه (`heatLoadKcal`, `buildingArea`, `floors`, `units`) برای محاسبه‌ی بار حرارتی.
5. **پایپ‌لاین فروش انعطاف‌پذیر:** `Pipeline`+`DealStage` به‌جای enum سفت، تا مراحل از UI قابل‌تنظیم باشد
   (کانبان). مرحله‌ها `probability`/`isWon`/`isLost` دارند برای forecast.
6. **`Call`** هم متادیتای Asterisk (`uniqueId`, `channel`, `linkedId`, `queue`, `did`) و هم میدان‌های AI
   (`transcript`, `intent`) را دارد. `uniqueId @unique` ⇒ idempotency رویدادهای AMI.
7. **`AIInsight` نیمه‌polymorphic:** هم `entityType` دارد و هم FKهای اختیاری به موجودیت‌های پرکاربرد،
   تا کوئری‌ها سریع و دارای ارجاع صحیح (با `onDelete: Cascade`) باشند — بدون «polymorphic خام».
8. **`externalRef` روی Customer/Product:** آماده‌ی سینک آینده‌ی ووکامرس بدون مهاجرت سنگین
   (تصمیم فعلی: داده از صفر؛ اما درِ سینک باز است).

## ۴) استراتژی ایندکس

### الف) ایندکس‌های رابطه‌ای/فیلتر (Prisma `@@index`)
روی همه‌ی FKها و ستون‌های پرفیلتر: `Customer(type,status,ownerId,leadScore)`,
`Call(direction,status,fromNumber,toNumber,agentId,startedAt)`,
`Deal(stageId,ownerId,status)`, `Ticket(status,priority,assigneeId,slaDueAt)`, ...
این‌ها برای صفحه‌بندی، کانبان، صف‌های کاری و گزارش‌ها حیاتی‌اند.

### ب) یکتایی دامنه‌ای
`User.email`, `Customer.code`, `Product.sku`, `Call.uniqueId`,
`CustomerPhone(customerId,number)`, `DealStage(pipelineId,key)`،
و `Customer(type, externalRef)` برای سینک idempotent.

### ج) جست‌وجوی فازی فارسی + لاتین — **trigram GIN روی متنِ نرمال‌شده**
> یافته‌ی واقعی و آزمایش‌شده: در فارسی یک نام چند املا دارد (أ/إ/آ→ا، ي→ی، ك→ک، ة→ه، نیم‌فاصله).
> جست‌وجوی «تاسیسات اریا» روی «شرکت تأسیساتی آریا» بدون نرمال‌سازی similarity=**0.23** (زیر آستانه‌ی ۰٫۳ ⇒ بدون نتیجه)
> و با نرمال‌سازی **0.39** (⇒ تطبیق درست). پس تابع `fa_normalize()` (IMMUTABLE) ساخته و ایندکس‌های GIN
> **تابعی** روی `fa_normalize(column)` ساخته شد. `EXPLAIN` استفاده از `Customer_displayName_fa_trgm_idx` را تأیید کرد.

ستون‌های دارای GIN trigram نرمال‌شده: نام مشتری/شرکت، نام محصول، عنوان پروژه، موضوع تیکت، رونوشت تماس.
شماره تلفن GIN trigram خام دارد (برای جست‌وجوی «۴ رقم آخر»).

## ۵) روابط و قواعد حذف (Referential Integrity)
- **Cascade** (حذف والد ⇒ حذف فرزند وابسته): `Customer→Phone/Contact/Address`,
  `Project→ProjectItem`, `Deal→DealItem`, `Ticket→TicketComment`, `User→RefreshToken`,
  و `AIInsight`/`Note` وابسته به موجودیت پدر.
- **SetNull** (حفظ تاریخچه با ازدست‌رفتن ارجاع): `Customer.ownerId`, `Deal.ownerId`,
  `Call.agentId/customerId`, `Project.managerId`, `ProjectItem.productId`, `DealItem.productId`.
  ⇒ حذف یک کارمند یا یک محصول، رکوردهای تاریخی تماس/معامله را نمی‌شکند.
- **Restrict (پیش‌فرض)** روی `Deal.pipeline/stage` تا مرحله‌ی درحال‌استفاده حذف نشود.

## ۶) استراتژی مهاجرت (Migration Strategy)

```
prisma/
├── schema.prisma                 ← منبع حقیقت (source of truth)
├── migrations/
│   ├── migration_lock.toml       ← provider=postgresql (در VCS می‌ماند)
│   ├── 0001_init/migration.sql   ← اکستنشن‌ها + ۱۸ enum + ۲۷ جدول + ۴۶ FK + ایندکس‌ها
│   └── 0002_search_indexes/      ← تابع fa_normalize + ۸ ایندکس GIN trigram (SQL خام)
└── seed.ts                       ← مجوز/نقش/پایپ‌لاین (idempotent، با upsert)
```

- **توسعه:** `prisma migrate dev` (تولید مهاجرت از diff اسکیما).
- **تولید:** `prisma migrate deploy` (اعمال مهاجرت‌های نهایی‌شده، بدون reset).
- **ایندکس‌های خاص (GIN/تابعی)** که Prisma تولید نمی‌کند، به‌صورت مهاجرت SQL دستی
  (`0002`) نگه داشته می‌شوند و در همان زنجیره‌ی Prisma اجرا می‌شوند.
- **Seed:** `prisma db seed` پس از مهاجرت. idempotent است.
- **بازگشت:** هر مهاجرت اتمیک؛ در صورت خطا، تراکنش rollback و وضعیت در جدول `_prisma_migrations` ثبت می‌شود.

## ۷) نکته‌ی محیط (مستندِ سندباکس)
دانلودِ خودکارِ انجن Prisma از پروکسی عبور نمی‌کند (`ECONNRESET`). راه‌حل اعمال‌شده:
انجن‌ها با `curl` (که از پروکسی عبور می‌کند) pre-fetch و با
`PRISMA_SCHEMA_ENGINE_BINARY` / `PRISMA_QUERY_ENGINE_LIBRARY` به Prisma معرفی شدند.
در محیط عادی این کار لازم نیست.

## ۸) Impact Analysis
- کاملاً ایزوله در `crm/apps/api`. فایل‌های سئو/محتوای ریپو دست‌نخورده‌اند.
- آماده برای فاز ۳: ماژول‌های NestJS مستقیماً روی این مدل و Prisma Client سوار می‌شوند.
- درِ سینک ووکامرس و SSO و Issabel واقعی با فیلدها/اینترفیس‌های از پیش‌تعبیه‌شده باز است.
