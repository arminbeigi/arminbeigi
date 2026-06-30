# سخت‌سازی C2 — سخت‌سازی امنیتی HTTP

> وضعیت: **اجراشده و اعتبارسنجی‌شده** (۳ تست واحد جدید + بررسی زنده‌ی هدرها/۴۱۳/رگرسیون).
> اولویت: 🔴 Critical.

## ۱) چه چیزهایی اضافه شد
1. **هدرهای امنیتی (helmet):** افزودن `helmet` به‌عنوان میدلور سراسری. هدرهای فعال‌شده‌ی
   تأییدشده در اجرای زنده:
   `X-Frame-Options: SAMEORIGIN`، `X-Content-Type-Options: nosniff`،
   `Strict-Transport-Security`، `X-DNS-Prefetch-Control: off`،
   `X-Download-Options: noopen`، `X-Permitted-Cross-Domain-Policies: none`،
   `Cross-Origin-Resource-Policy: cross-origin`.
   - CSP در این لایه **غیرفعال** است (با Swagger UI ناسازگار است و چون API/فرانت هم‌مبدأ
     پشت Nginx سرو می‌شوند، CSP صفحه در لایه‌ی فرانت/Nginx مناسب‌تر است).
2. **محدودیت حجم بدنه:** `json`/`urlencoded` با سقف **۱MB**. bodyParser پیش‌فرض Nest غیرفعال شد
   تا این سقف واقعاً اعمال شود. بدنه‌ی بزرگ‌تر ⇒ **413 Payload Too Large** (به‌جای ۵۰۰).
3. **سخت‌سازی CORS برای تولید:** اگر `CORS_ORIGINS='*'` در تولید بماند، `credentials` خودکار
   خاموش می‌شود (ترکیب wildcard + credentials ناامن است). برای cross-origin با credentials،
   دامنه‌های مجاز را صریح در `CORS_ORIGINS` بدهید. هم‌مبدأ پشت Nginx نیازی به این ندارد.
4. **گیت‌کردن Swagger در تولید:** مستندات `/api/docs` به‌صورت پیش‌فرض فقط در توسعه فعال است؛
   در تولید مگر `SWAGGER_ENABLED=true` تنظیم شود.
5. **بهبود فیلتر خطا:** خطاهای سبک `http-errors` (دارای `status` عددی، مثل PayloadTooLarge)
   که `HttpException` نیستند، حالا به همان کد وضعیت درست نگاشت می‌شوند (نه ۵۰۰ عمومی).

## ۲) فایل‌های تغییر/افزوده
- `src/main.ts` — helmet، body limit (با `bodyParser: false`)، CORS تولید، گیت Swagger.
- `src/common/filters/all-exceptions.filter.ts` — شناسایی خطاهای http-errors.
- `src/common/filters/all-exceptions.filter.spec.ts` — تست جدید (۳ سناریو).
- `package.json` — افزودن `helmet`.

## ۳) شواهد اعتبارسنجی
- `npm run build` ⇒ بدون خطا. `npx jest` ⇒ **۶۲/۶۲** سبز.
- **زنده:** هدرهای helmet روی `/api/health` دیده شدند؛ payload بزرگ‌تر از ۱MB ⇒ **413**
  (`PayloadTooLargeError`)؛ ورود و مسیرهای عادی سالم.
- **رگرسیون:** اسکریپت e2e مشتریان ⇒ **۲۰/۲۰** سبز (بدون اثر منفی از تغییر body-parser).

## ۴) متغیرهای محیطی جدید/مرتبط
- `SWAGGER_ENABLED` (اختیاری) — در تولید برای فعال‌کردن `/api/docs` روی `true` تنظیم شود.
- `CORS_ORIGINS` — برای تولیدِ cross-origin، دامنه‌های مجاز جداشده با کاما (مثل
  `https://crm.shofazh.com`)؛ پیش‌فرض `*`.

## ۵) سازگاری عقب‌رو
افزودنی و بدون تغییر قرارداد API. تنها تغییر رفتاری مثبت: خطاهای حجم بدنه اکنون ۴۱۳ برمی‌گردانند
(پیش‌تر ۵۰۰). در توسعه، Swagger مثل قبل فعال است.
