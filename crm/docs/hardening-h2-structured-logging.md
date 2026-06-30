# سخت‌سازی H2 — لاگ ساخت‌یافته + Correlation-ID

> وضعیت: **اجراشده و اعتبارسنجی‌شده** (۳ تست واحد + بررسی زنده‌ی JSON/هدر/redaction).
> اولویت: 🟠 High.

## ۱) مسئله
لاگ‌ها فقط متن آزاد از `console`/`Logger` بودند؛ بدون ساختار، بدون شناسه‌ی همبستگی برای
ردگیری یک درخواست در سراسر لاگ‌ها، و بدون پنهان‌سازی اطلاعات حساس.

## ۲) راهکار
- **`nestjs-pino` + `pino-http`**: لاگ خروجی همیشه **JSON ساخت‌یافته** (مناسب جمع‌آوری/جست‌وجو).
- **Correlation-ID**: هر درخواست شناسه می‌گیرد — از هدر ورودی `X-Request-Id` یا UUID تولیدشده —
  و همان شناسه در هدر **پاسخ** هم برمی‌گردد ⇒ ردگیری end-to-end بین فرانت/Nginx/بک‌اند.
- **سطح لاگ پویا**: پاسخ‌های ۵xx ⇒ error، ۴xx ⇒ warn، بقیه ⇒ info.
- **پنهان‌سازی (redaction)**: `Authorization`، `cookie`، `set-cookie`، و
  `password`/`refreshToken` در بدنه حذف می‌شوند؛ به‌علاوه serializer درخواست فقط
  `id/method/url` را لاگ می‌کند (بدنه‌ی درخواست اصلاً لاگ نمی‌شود).
- **کاهش نویز**: مسیر `/api/health` از auto-logging مستثناست.
- سطح از `LOG_LEVEL` (پیش‌فرض `info`) خوانده می‌شود.

## ۳) فایل‌های افزوده/تغییر
- جدید: `src/config/logger.config.ts` (+ `logger.config.spec.ts`).
- `src/app.module.ts` — `LoggerModule.forRootAsync` با خواندن `LOG_LEVEL`.
- `src/main.ts` — `bufferLogs: true` + `app.useLogger(app.get(Logger))`.
- `src/config/env.validation.ts` — افزودن `LOG_LEVEL`.
- `docker-compose.yml` + `.env.example` — متغیر `LOG_LEVEL`.

## ۴) شواهد اعتبارسنجی
- `npm run build` ⇒ بدون خطا. `npx jest` ⇒ **۶۸/۶۸** سبز.
- **زنده:** هدر `X-Request-Id` ارسالی بازتاب شد؛ نبودِ هدر ⇒ UUID تولید و در پاسخ ست شد؛
  لاگ یک ورود ناموفق به‌صورت JSON با `req.id` و `res.statusCode=401` در سطح warn ثبت شد و
  **هیچ رمزی** در لاگ ظاهر نشد.

## ۵) سازگاری عقب‌رو
افزودنی و بدون تغییر رفتار API. لاگ‌های داخلی Nest نیز اکنون از مسیر pino عبور می‌کنند.
برای خواندن خواناتر در توسعه می‌توان خروجی را به `pino-pretty` لوله کرد
(`... | npx pino-pretty`).
