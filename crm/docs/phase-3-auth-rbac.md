# فاز ۳ — ماژول ۱: پایه NestJS + Auth + RBAC

> وضعیت: **اجراشده و اعتبارسنجی‌شده.** build سبز، ۱۰ تست واحد سبز،
> و ۱۶ سنجش end-to-end روی اپ واقعی + PostgreSQL واقعی سبز.

## ۱) چه ساخته شد
زیرساخت بک‌اند و لایه‌ی امنیت کامل:
- **بوت‌استرپ NestJS**: `main.ts` (prefix=`api`, ValidationPipe سراسری, CORS, Swagger در `/api/docs`).
- **Config**: اعتبارسنجی متغیرهای محیط با zod (fail-fast).
- **Prisma**: `PrismaModule`/`PrismaService` سراسری با اتصال/خاموشی تمیز.
- **Common**: فیلتر خطای یکنواخت، Guard احراز هویت، Guard مجوز (RBAC)، دکوریتورهای
  `@Public` / `@Permissions` / `@CurrentUser`, و DTO صفحه‌بندی.
- **Users**: repository + service + controller + DTO امن (بدون passwordHash).
- **Auth**: ثبت‌نام، ورود، چرخش توکن، خروج، پروفایل؛ JWT دوگانه (access+refresh).

## ۲) مدل امنیتی
- **رمز عبور**: bcryptjs (هزینه ۱۰).
- **Access token**: کوتاه‌عمر (۱۵ دقیقه)، حاوی `roles`+`permissions` ⇒ RBAC بدون کوئری دیتابیس در هر درخواست.
- **Refresh token**: ۳۰ روزه، فقط **هش SHA-256** در دیتابیس ذخیره می‌شود (خود توکن هرگز).
- **چرخش (rotation)**: هر refresh، توکن قبلی را باطل و توکن نو در همان `family` صادر می‌کند.
- **تشخیص استفاده‌ی مجدد**: ارائه‌ی توکن باطل‌شده ⇒ کل `family` باطل می‌شود (واکنش به نشت).
- **RBAC**: دو Guard سراسری به ترتیب (ابتدا JWT، سپس Permissions)؛ `admin` به‌صورت ضمنی همه‌ی مجوزها را دارد.

## ۳) Endpointها
| متد | مسیر | دسترسی | شرح |
|---|---|---|---|
| GET | `/api/health` | عمومی | سلامت سرویس + اتصال DB |
| POST | `/api/auth/register` | عمومی | ثبت‌نام (نقش پیش‌فرض viewer) |
| POST | `/api/auth/login` | عمومی | ورود |
| POST | `/api/auth/refresh` | عمومی | چرخش توکن |
| POST | `/api/auth/logout` | عمومی | ابطال refresh |
| GET | `/api/auth/me` | احراز هویت | پروفایل جاری |
| GET | `/api/users/:id` | `users:manage` | نمونه‌ی مسیر تحت RBAC |

## ۴) شواهد اعتبارسنجی
- `nest build` ⇒ بدون خطا.
- `jest` ⇒ **۱۰/۱۰** (هسته‌ی Auth: ورود/چرخش/تشخیص نشت؛ و PermissionsGuard).
- اجرای واقعی اپ روی PostgreSQL ۱۶ و **۱۶ سنجش HTTP**: ورود مدیر، `/auth/me`،
  ۴۰۱ بدون توکن، مجاز بودن مدیر، ثبت‌نام viewer، **۴۰۳** برای viewer،
  چرخش refresh (توکن نو ≠ کهنه)، **۴۰۱** برای توکن مجدد، ابطال family، و **۴۰۰**
  با پیام فارسی برای ورودی نامعتبر.

## ۵) ساختار فایل (افزوده‌ها)
```
apps/api/
├── nest-cli.json · tsconfig.json · tsconfig.build.json · jest.config.js
└── src/
    ├── main.ts · app.module.ts
    ├── config/env.validation.ts
    ├── prisma/{prisma.module,prisma.service}.ts
    ├── common/
    │   ├── decorators/{public,permissions,current-user}.decorator.ts
    │   ├── guards/{jwt-auth,permissions}.guard.ts (+ permissions.guard.spec.ts)
    │   ├── filters/all-exceptions.filter.ts
    │   ├── types/auth-user.ts · dto/pagination.dto.ts
    ├── health/health.controller.ts
    └── modules/
        ├── users/{users.module,users.service,users.repository,users.controller}.ts + dto/
        └── auth/{auth.module,auth.service,auth.controller}.ts + strategies/ + dto/
            └── auth.service.spec.ts
```

## ۶) یادداشت‌های مهندسی (تصمیم‌های واقعی حین ساخت)
- **import نسبی به‌جای alias `@/`**: چون `nest build` (tsc) aliasها را در زمان اجرا
  بازنویسی نمی‌کند و `node dist/main.js` می‌شکست؛ همه به import نسبی تبدیل شد (بدون وابستگی اضافه).
- **خروجی build**: `rootDir=src` و حذف `prisma` از build تا خروجی `dist/main.js` شود (نه `dist/src/...`).
- **seed با bcryptjs**: import پیش‌فرض (CommonJS) برای سازگاری با اجرای ESM/strip-types.

## ۷) موارد سخت‌سازی برای پاس بعدی (ثبت‌شده، نه فراموش‌شده)
- افزودن `helmet` و `@nestjs/throttler` (محدودسازی نرخ روی login/refresh).
- e2e خودکار با `supertest` در پوشه‌ی `test/` (الان به‌صورت اسکریپت اعتبارسنجی شد).
- مهاجرت به مونوریپو pnpm + Turborepo (فعلاً npm محلی برای اجرای ماژول).

## ۸) Impact Analysis
- ایزوله در `crm/apps/api`؛ بدون اثر روی فایل‌های سئو/محتوای ریپو.
- پایه‌ی آماده برای ماژول‌های بعدی (Customers/Products/Projects/Deals/Calls): همگی روی همین
  Prisma + Guardها + الگوی controller/service/repository/DTO سوار می‌شوند.
