# فاز ۳ — ماژول ۶: ثبت تماس (Calls) — پایه‌ی Issabel

> وضعیت: **اجراشده و اعتبارسنجی‌شده.** build سبز، ۴۲ تست واحد سبز،
> و ۱۸ سنجش end-to-end روی اپ واقعی + PostgreSQL واقعی سبز.
> این ماژول، **هسته‌ی منطقی فاز ۴ (Issabel/AMI)** است.

## ۱) چه ساخته شد
ثبت و مدیریت تماس با منطق مرکز تماس:
- **ingest رویداد تماس** (`POST /calls/events`) — **idempotent روی `uniqueId`** (Asterisk Uniqueid)؛
  ارسال چندباره برای یک تماس (زنگ → پاسخ → قطع) همان رکورد را به‌روزرسانی می‌کند.
- **تطبیق خودکار مشتری** با شماره (نرمال‌سازی فارسی/عربی): ورودی بر اساس `fromNumber`، خروجی `toNumber`.
- **ساخت خودکار سرنخ** برای تماس‌گیرنده‌ی ناشناس (نوع خانگی، وضعیت LEAD، منبع PHONE_INBOUND/OUTBOUND).
- **تطبیق اپراتور** بر اساس داخلی تلفن (`User.extension`).
- اتصال تماس به **معامله/تیکت**، فهرست با فیلتر جهت/وضعیت/اپراتور/مشتری/بازه‌ی زمانی.
- خروجی ingest شامل `matched` و `leadCreated` — دقیقاً داده‌ی موردنیاز **پاپ‌آپ CRM** فاز ۷.

## ۲) Endpointها (تحت RBAC)
| متد | مسیر | مجوز |
|---|---|---|
| POST | `/api/calls/events` | `calls:manage` |
| GET | `/api/calls` (فیلتر + بازه) | `calls:read` |
| GET | `/api/calls/:id` | `calls:read` |
| PATCH | `/api/calls/:id/link` | `calls:manage` |

## ۳) جریان تماس ورودی (پیاده‌سازی‌شده)
```
رویداد AMI → POST /calls/events (uniqueId)
  → نرمال‌سازی شماره → یافتن اپراتور با داخلی
  → تطبیق مشتری با شماره
       ├ یافت شد → matched=true
       └ نیافت → ساخت سرنخ → leadCreated=true
  → upsert تماس (idempotent) + اتصال مشتری/اپراتور
  → پاسخ {call, matched, leadCreated}  ← مصرف‌کننده‌ی پاپ‌آپ فاز ۷
رویداد بعدی (پاسخ/قطع) همان uniqueId → به‌روزرسانی وضعیت/مدت/ضبط
```

## ۴) وابستگی بین‌ماژولی (تمیز)
- `CallsModule` → `CustomersModule` (`findRawByPhone`, `createLeadFromCall`) و `UsersModule`
  (`findByExtension`). متدهای کمکی به سرویس‌های موجود افزوده شد، بدون شکستن کپسوله‌سازی.

## ۵) شواهد اعتبارسنجی
- `nest build` ⇒ بدون خطا.
- `jest` ⇒ **۴۲/۴۲** (۷ تست جدید: ساخت سرنخ، تطبیق موجود، مقصد خروجی، داخلی اپراتور، داخلی بدون مشتری، idempotency).
- اجرای واقعی + **۱۸ سنجش HTTP**: تماس ناشناس → **ساخت سرنخ** (شماره نرمال‌شده)،
  **idempotency** (رویداد دوم همان رکورد، به‌روزرسانی وضعیت/مدت)، **اپراتور با داخلی ۲۰۱**،
  یافتن سرنخ با شماره، تطبیق مشتری شناخته‌شده، **تطبیق خروجی روی toNumber**، داخلی بدون مشتری،
  فیلتر جهت، اتصال به معامله، RBAC (viewer ingest/list ۴۰۳)، enum نامعتبر ۴۰۰.

## ۶) Impact Analysis — پایان فاز ۳
- ایزوله در `modules/calls` + دو متد کمکی در Customers/Users + یک خط در `app.module.ts`.
- **آماده‌ی فاز ۴**: سرویس AMI فقط رویدادهای Asterisk را به `CallsService.ingest` نگاشت می‌کند؛
  کل منطق تطبیق/سرنخ/idempotency همین‌جا پیاده و اثبات شده است.
- خروجی `{matched, leadCreated}` برای پاپ‌آپ بلادرنگ فاز ۷ آماده است.

> **فاز ۳ کامل شد:** Auth/RBAC, Customers, Products, Projects, Deals, Calls — مجموعاً ۴۲ تست واحد
> و ۸۸ سنجش end-to-end روی PostgreSQL واقعی، همگی سبز.
