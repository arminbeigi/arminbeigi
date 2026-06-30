# فاز ۴ — یکپارچگی Issabel/Asterisk (AMI)

> وضعیت: **اجراشده و اعتبارسنجی‌شده (حالت Mock).** build سبز، ۴۸ تست واحد سبز،
> و ۱۵ سنجش end-to-end روی اپ واقعی + PostgreSQL واقعی سبز.
> طبق تصمیم فاز ۰، Issabel هنوز راه‌اندازی نشده؛ با اینترفیس قابل‌تعویض ساخته شد.

## ۱) چه ساخته شد
لایه‌ی تلفنی کامل پشت یک اینترفیس واحد (`IAmiClient`):
- **MockAmiClient** — رویدادهای تماس را شبیه‌سازی می‌کند (زنگ/پاسخ/قطع و click-to-call)؛
  کل خط لوله بدون Issabel قابل‌اجرا و آزمون است.
- **RealAmiClient** — پیاده‌سازی واقعی پروتکل AMI روی TCP پورت ۵۰۳۸ (Login/Originate،
  بافر و پارس بسته‌ها، ترجمه‌ی Newchannel/Newstate/Hangup/VarSet → سیگنال نرمال‌شده، اتصال مجدد خودکار).
- **TelephonyService** — سیگنال‌های نرمال‌شده را به `CallsService.ingest` (فاز ۳) نگاشت می‌کند،
  پاپ‌آپ CRM را برای فاز ۷ منتشر می‌کند، و click-to-call را اجرا می‌کند.
- **RecordingSyncService** — مسیر فایل ضبط روی Asterisk را به آدرس عمومی نگاشت می‌کند.
- **TelephonyEvents** — ناقل رویداد پاپ‌آپ (نقطه‌ی اتصال WebSocket فاز ۷).

## ۲) معماری قابل‌تعویض
```
Asterisk/Issabel ──AMI──▶ RealAmiClient ─┐
                                          ├─(CallSignal نرمال‌شده)─▶ TelephonyService ─▶ CallsService.ingest
        (شبیه‌سازی)        MockAmiClient ─┘                                │
                                                                          └─▶ TelephonyEvents.emitPopup ─▶ (فاز ۷ WebSocket)
انتخاب کلاینت با AMI_MOCK در پیکربندی (factory). هنگام راه‌اندازی Issabel:
AMI_MOCK=false + تنظیم host/port/user/secret — بدون تغییر هیچ منطق CRM.
```

## ۳) جریان‌ها (پیاده‌سازی‌شده و آزمون‌شده)
- **تماس ورودی**: سیگنال RINGING → ingest (تطبیق مشتری/ساخت سرنخ) → انتشار پاپ‌آپ →
  ANSWERED → HANGUP (وضعیت ANSWERED/NO_ANSWER، مدت، همگام‌سازی ضبط).
- **click-to-call**: `POST /telephony/originate` → Originate به داخلی اپراتور و شماره مقصد →
  تماس OUTBOUND ثبت و با مشتری مقصد تطبیق می‌یابد.
- **شبیه‌سازی** (فقط Mock): `POST /telephony/simulate/inbound` برای دمو/آزمون کل زنجیره.
- **idempotency**: همان `uniqueId` در رویدادهای متوالی، همان رکورد را به‌روزرسانی می‌کند (از فاز ۳).

## ۴) Endpointها (تحت RBAC)
| متد | مسیر | مجوز |
|---|---|---|
| GET | `/api/telephony/status` | `calls:read` |
| POST | `/api/telephony/originate` | `calls:manage` |
| POST | `/api/telephony/simulate/inbound` | `calls:manage` (فقط Mock) |

## ۵) شواهد اعتبارسنجی
- `nest build` ⇒ بدون خطا.
- `jest` ⇒ **۴۸/۴۸** (۶ تست جدید: نگاشت سیگنال→ingest، انتشار پاپ‌آپ، همگام‌سازی ضبط،
  NO_ANSWER، گارد originate قطع، گارد شبیه‌سازی در حالت Real، status).
- اجرای واقعی + **۱۵ سنجش HTTP**: وضعیت mock/connected، **شبیه‌سازی ورودی** (INBOUND/ANSWERED،
  مدت ۷۳، **ضبط `/recordings/in-12345.wav`**، **سرنخ خودکار**، **اپراتور داخلی ۲۰۱**)،
  ثبت در `/calls`، **تماس مجدد ⇒ همان سرنخ**، **click-to-call** (OUTBOUND تطبیق‌یافته با مشتری)،
  RBAC (viewer status/originate ۴۰۳)، و originate ناقص ۴۰۰.

## ۶) راه‌اندازی Issabel واقعی (هنگام آماده‌شدن)
1. در `manager.conf` اَستریسک یک کاربر AMI بسازید (read=call,all / write=originate,call).
2. در env: `AMI_MOCK=false`، `AMI_HOST`، `AMI_PORT=5038`، `AMI_USERNAME`، `AMI_SECRET`.
3. در صورت نیاز `inboundContexts`/`outboundContext` را با dialplan شرکت در `RealAmiClient` هماهنگ کنید.
4. داخلی هر اپراتور را در فیلد `User.extension` ثبت کنید (برای تطبیق تماس).

## ۷) Impact Analysis
- ایزوله در `modules/telephony` + یک خط در `app.module.ts` + متغیرهای env.
- بدون وابستگی npm جدید (پیاده‌سازی AMI با `net` خام).
- خروجی پاپ‌آپ از طریق `TelephonyEvents` آماده‌ی مصرف در فاز ۷ (WebSocket) است.
