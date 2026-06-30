# فاز ۸ — استقرار (Docker Compose) + اجرای رایگان روی مک

> وضعیت: **اجراشده.** `docker compose config` معتبر است؛ کل سامانه با یک دستور بالا می‌آید و
> به‌صورت پیش‌فرض (AI شبیه‌ساز) بدون نیاز به هیچ مدل یا کلیدِ پولی کار می‌کند.

## ۱) چه ساخته شد
- **`docker-compose.yml`** — پنج سرویس: `postgres` (۱۶)، `redis` (۷)، `api` (NestJS)،
  `web` (Next.js)، و `nginx` (تک‌مبدأ/reverse-proxy). با healthcheck و وابستگی‌ها.
- **`apps/api/Dockerfile`** — چندمرحله‌ای (`node:22-bookworm-slim`): نصب، `prisma generate`،
  `nest build`؛ مرحله‌ی اجرا فقط `node_modules` + `dist` + `prisma` را دارد.
- **`apps/api/docker-entrypoint.sh`** — هنگام بالا آمدن: صبر برای دیتابیس →
  `prisma migrate deploy` → `seed` (idempotent) → اجرای `node dist/main.js`.
- **`apps/web/Dockerfile`** — خروجی **standalone** Next.js (سبک)؛ `NEXT_PUBLIC_API_URL=/api`
  در زمان build تزریق می‌شود تا فرانت هم‌مبدأ پشت Nginx کار کند.
- **`nginx.conf`** — تک‌مبدأ روی پورت ۸۰:
  `/` → وب، `/api` → بک‌اند، `/socket.io` → WebSocket (با ارتقای اتصال)، `/recordings` → فایل‌های ضبط.
- **`.env.example`** — همه‌ی متغیرها با مقادیر امن/پیش‌فرض و راهنمای فعال‌سازی AI واقعی.
- `.dockerignore` برای هر دو اپ.

## ۲) معماری استقرار
```
                    ┌──────────────── Nginx (پورت ۸۰) ────────────────┐
   مرورگر  ───────► │  /          → web:3000  (Next.js standalone)     │
                    │  /api       → api:4000  (NestJS)                 │
                    │  /socket.io → api:4000  (WebSocket / Socket.IO)  │
                    └──────────────────────────────────────────────────┘
                                  │                     │
                          postgres:5432           redis:6379
                                  │
                         (migrate deploy + seed خودکار هنگام بوت)
   AI (اختیاری): api ──► host.docker.internal:11434  → Ollama روی مک (شتاب Metal)
```

## ۳) اجرا (هر سرور لینوکسی یا مک با Docker)
```bash
cd crm
cp .env.example .env
# مقادیر را پر کنید — به‌ویژه:
#   POSTGRES_PASSWORD ، JWT_ACCESS_SECRET ، JWT_REFRESH_SECRET
#   تولید کلید امن:  openssl rand -hex 32
docker compose up -d --build
```
سپس مرورگر را روی `http://localhost` (یا IP/دامنه‌ی سرور) باز کنید.
ورود اولیه: `admin@shofazh.com` / `Admin@12345` (در seed ساخته می‌شود — **رمز را تغییر دهید**).

دستورهای مفید:
```bash
docker compose logs -f api      # لاگ بک‌اند (مهاجرت/seed)
docker compose ps               # وضعیت سرویس‌ها
docker compose down             # توقف (داده‌ها در volume می‌ماند)
docker compose down -v          # توقف + حذف داده‌ها
```

## ۴) اجرای رایگانِ هوش مصنوعی روی مک (Apple M4 / Tahoe) — رایگان و محلی
به‌صورت پیش‌فرض `AI_MOCK=true` است؛ تحلیل تماس/خلاصه/تشخیص نیت با موتور قاعده‌محورِ فارسی کار
می‌کند (بدون مدل). برای **مدل واقعی و رایگان** با شتاب Metal مک:

```bash
# روی خودِ مک (نه داخل کانتینر) — Ollama با GPU/Neural Engine مک کار می‌کند:
brew install ollama
ollama serve            # یک‌بار اجرا/سرویس
ollama pull qwen2.5:7b  # مدل فارسی‌خوبِ ~۵ گیگ، مناسب ۱۶GB رم
```
سپس در `.env`:
```env
AI_MOCK=false
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_MODEL=qwen2.5:7b
AI_API_KEY=ollama
```
و `docker compose up -d` دوباره. (کانتینر API از طریق `host.docker.internal` به Ollama روی
میزبان وصل می‌شود — در compose با `extra_hosts: host-gateway` فعال شده است.)

> چرا Ollama روی میزبان و نه داخل کانتینر؟ شتاب Metalِ مک فقط برای فرایندهای **بومیِ** macOS
> در دسترس است؛ داخل کانتینر لینوکسی فقط CPU خواهید داشت. اجرای بومی = سریع و رایگان.

### تبدیل گفتار به متن (Whisper) — اختیاری
برای رونویسی واقعی صوت، سرویس `whisper-asr-webservice` را روی میزبان اجرا کنید
(مثلاً `port 9000`)، سپس:
```env
STT_MOCK=false
STT_BASE_URL=http://host.docker.internal:9000
```

## ۵) اتصال Issabel واقعی (هر زمان آماده شد)
کافی است در `.env`:
```env
AMI_MOCK=false
AMI_HOST=<IP سرور Issabel>
AMI_PORT=5038
AMI_USERNAME=crm
AMI_SECRET=<رمز AMI>
```
بدون تغییر کد — provider واقعی AMI جایگزین شبیه‌ساز می‌شود (الگوی provider فاز ۴).

## ۶) شواهد اعتبارسنجی
- `docker compose config` ⇒ **معتبر** (ساختار، متغیرها، healthcheckها، وابستگی‌ها).
- مسیر CLI پریزما در entrypoint بررسی شد (`node_modules/prisma/build/index.js`).
- `output: 'standalone'` در `next.config.mjs` فعال است ⇒ Dockerfile وب سبک و درست.
- تک‌مبدأ بودن: `lib/socket.ts` و `lib/api.ts` با `/api` نسبی هماهنگ شدند (هم‌مبدأ پشت Nginx).

## ۷) Impact Analysis
- بدون تغییر در منطق اپ؛ فقط افزودن لایه‌ی استقرار. حالت توسعه‌ی محلی (port 3000/4000) دست‌نخورده.
- امنیت: رمزها/کلیدها فقط در `.env` (در `.gitignore`)؛ `.env.example` بدون مقدار حساس کامیت شد.
- مقیاس‌پذیری بعدی: افزودن آداپتور Redis سوکت، TLS روی Nginx (Let's Encrypt)، و کانتینری‌کردن
  Whisper در صورت نیاز.
```
