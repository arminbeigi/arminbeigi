# فاز ۳ — ماژول ۲: مشتریان (Customers)

> وضعیت: **اجراشده و اعتبارسنجی‌شده.** build سبز، ۱۸ تست واحد سبز،
> و ۲۰ سنجش end-to-end روی اپ واقعی + PostgreSQL واقعی سبز.

## ۱) چه ساخته شد
ماژول کامل مشتریان روی الگوی controller/service/repository/DTO/test:
- CRUD مشتری (خانگی/پیمانکار/شرکت/پروژه ساختمانی) با فیلدهای B2B.
- فهرست با **صفحه‌بندی + فیلتر نوع/وضعیت**.
- **جست‌وجوی فازی فارسی** روی نام/نام‌شرکت با `fa_normalize()` + ایندکس GIN trigram (مهاجرت ۰۰۰۲).
- مدیریت **شماره تلفن** با نرمال‌سازی ارقام فارسی/عربی و پیش‌شماره‌ی ایران.
- **تطبیق تماس** (`lookup/by-phone`): تطبیق دقیق سپس پسوند ۷ رقمی — پایه‌ی پاپ‌آپ فاز ۴.

## ۲) Endpointها (همه تحت RBAC)
| متد | مسیر | مجوز |
|---|---|---|
| POST | `/api/customers` | `customers:write` |
| GET | `/api/customers` (فیلتر + `q` فازی) | `customers:read` |
| GET | `/api/customers/:id` | `customers:read` |
| PATCH | `/api/customers/:id` | `customers:write` |
| DELETE | `/api/customers/:id` | `customers:delete` |
| POST | `/api/customers/:id/phones` | `customers:write` |
| DELETE | `/api/customers/:id/phones/:phoneId` | `customers:write` |
| GET | `/api/customers/lookup/by-phone?number=` | `calls:manage` |

## ۳) تصمیم‌های کلیدی
- **جست‌وجوی فازی** با `prisma.$queryRaw` + `Prisma.sql`/`Prisma.join` (شرط‌های پویا)، مرتب‌سازی با
  `GREATEST(similarity(...))`؛ شناسه‌ها به‌ترتیب شباهت برمی‌گردند و هیدریت کامل با حفظ ترتیب انجام می‌شود.
  مسیر بدون `q` کاملاً Prisma خالص (`findMany`+`count` داخل `$transaction`).
- **نرمال‌سازی شماره** در `src/common/utils/persian.ts` (`normalizePhone`/`foldDigits`)؛ ذخیره‌ی
  `number` نرمال + `rawNumber` اصلی؛ یکتایی `@@unique([customerId, number])`؛ خطای P2002 → `409`.
- **مالک پیش‌فرض**: اگر `ownerId` داده نشود، کاربر جاری (`@CurrentUser('sub')`).
- ترتیب مسیرها: `lookup/by-phone` پیش از `:id` ثبت می‌شود تا با پارامتر اشتباه گرفته نشود.

## ۴) شواهد اعتبارسنجی
- `nest build` ⇒ بدون خطا.
- `jest` ⇒ **۱۸/۱۸** (۸ تست جدید سرویس مشتریان: نرمال‌سازی، مسیر فازی/فهرست، NotFound، Conflict، lookup).
- اجرای واقعی + **۲۰ سنجش HTTP**: ساخت با شماره‌ی فارسی (نرمال‌شده `09123456789`)،
  code/owner خودکار، فیلتر نوع، **جست‌وجوی فازی «تاسیسات اریا»→«آریا»**، تطبیق شماره دقیق و `+98`،
  PATCH، افزودن/حذف شماره + تکراری `409`، حذف + `404`، RBAC (viewer: read 200 / write 403 / delete 403)،
  و enum نامعتبر `400`.

## ۵) یادداشت مهندسی (باگ واقعی کشف‌شده حین اجرا)
**ناپایداری build**: ترکیب `incremental:true` + `deleteOutDir` در nest باعث می‌شد بعد از حذف `dist`،
به‌خاطر کش `tsbuildinfo` کهنه، خروجی دوباره تولید نشود و `node dist/main.js` بشکند. با انتقال
`tsBuildInfoFile` به داخل `dist/` رفع شد (در هر دو بار build پایدار ماند). این در CI/پروداکشن خطرناک بود.

## ۶) Impact Analysis
- ایزوله در `crm/apps/api/src/modules/customers`؛ افزودن یک خط به `app.module.ts`.
- `lookup/by-phone` آماده‌ی استفاده در فاز ۴ (Issabel/تطبیق تماس).
- خارج از این ماژول (برای بعد): CRUD مخاطبین/آدرس‌ها، برچسب‌ها، ورود انبوه، سینک ووکامرس.
