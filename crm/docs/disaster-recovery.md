# پشتیبان‌گیری و بازیابی فاجعه (C3) — Runbook

> وضعیت: **اجراشده و اعتبارسنجی‌شده** — round-trip واقعی backup→delete→restore روی دیتابیس
> محلی تأیید شد (۱۸ ردیف → ۰ → ۱۸). اولویت: 🔴 Critical.

## ۱) چه ساخته شد
- **`scripts/backup.sh`** — `pg_dump` فشرده (`--clean --if-exists`) با نوشتن اتمیک، لینک
  `latest.sql.gz`، و چرخش نگه‌داری (حذف پشتیبان‌های قدیمی‌تر از `RETENTION_DAYS`).
- **`scripts/restore.sh`** — بازیابی از فایل `.sql.gz` با `psql -v ON_ERROR_STOP=1`.
- **`scripts/backup-loop.sh`** — حلقه‌ی دوره‌ای برای سرویس کانتینری.
- **سرویس `backup` در docker-compose** — image رسمی `postgres:16`، اجرای خودکار دوره‌ای
  (پیش‌فرض روزانه)، ذخیره در volume جداگانه‌ی `backups`.

## ۲) معماری پشتیبان‌گیری
```
سرویس backup (postgres:16)  ──pg_dump──►  /backups/shofazh-<db>-<timestamp>.sql.gz
  • هر BACKUP_INTERVAL ثانیه (پیش‌فرض ۸۶۴۰۰ = روزانه)
  • نگه‌داری BACKUP_RETENTION_DAYS روز (پیش‌فرض ۱۴)
  • volume جداگانه‌ی «backups» (مستقل از pgdata)
```

## ۳) متغیرهای محیطی (در `.env`)
| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `BACKUP_INTERVAL` | `86400` | فاصله‌ی پشتیبان‌گیری (ثانیه) |
| `BACKUP_RETENTION_DAYS` | `14` | چند روز پشتیبان نگه داشته شود |

## ۴) عملیات روزمره

### گرفتن پشتیبان دستی (فوری)
```bash
docker compose exec backup /scripts/backup.sh
```

### فهرست پشتیبان‌ها
```bash
docker compose exec backup ls -lh /backups
```

### کپی پشتیبان به خارج از سرور (مهم برای DR واقعی)
volume داخل سرور به‌تنهایی در برابر ازدست‌رفتن کل ماشین مقاوم نیست. پشتیبان‌ها را منظم به
مقصد خارج از سرور کپی کنید (مثلاً به مک خودتان):
```bash
# آخرین پشتیبان را از volume بیرون بکشید
docker compose cp backup:/backups/latest.sql.gz ./shofazh-latest.sql.gz
# سپس به فضای ابری/دیسک خارجی منتقل کنید (rsync/scp/فضای ابری)
```

## ۵) رویه‌ی بازیابی فاجعه (DR)

### الف) بازیابی روی همان استقرار (rollback داده)
```bash
# ۱) فایل پشتیبان را در دسترس سرویس backup قرار دهید (در /backups هست یا کپی کنید)
# ۲) بازیابی (داده‌های فعلی بازنویسی می‌شوند):
docker compose exec backup /scripts/restore.sh /backups/latest.sql.gz
# ۳) ری‌استارت API برای تازه‌سازی اتصال‌ها:
docker compose restart api
```

### ب) بازسازی کامل روی سرور تازه (از صفر)
```bash
# ۱) repo را clone و .env را بازسازی کنید (همان POSTGRES_PASSWORD مهم نیست؛ dump شامل داده است)
# ۲) فقط دیتابیس را بالا بیاورید
docker compose up -d postgres
# ۳) منتظر سالم‌شدن، سپس بازیابی از پشتیبانِ نگه‌داری‌شده‌ی خارج از سرور:
docker compose cp ./shofazh-latest.sql.gz backup:/backups/restore.sql.gz   # اگر سرویس backup بالاست
docker compose up -d backup
docker compose exec backup /scripts/restore.sh /backups/restore.sql.gz
# ۴) کل سیستم را بالا بیاورید
docker compose up -d
```
> توجه: مهاجرت‌ها به‌صورت خودکار توسط entrypoint اعمال می‌شوند؛ اما چون dump با `--clean`
> کل اسکیمای داده را بازمی‌سازد، بازیابی پس از بالا آمدن دیتابیس کافی است.

## ۶) اهداف بازیابی (RPO/RTO)
- **RPO** (بیشینه‌ی داده‌ی قابل‌ازدست‌رفتن): با پشتیبان روزانه ≈ ۲۴ ساعت. برای کاهش،
  `BACKUP_INTERVAL` را کمتر کنید (مثلاً ۲۱۶۰۰ = هر ۶ ساعت).
- **RTO** (زمان بازگشت): بازیابی یک dump کوچک چند ثانیه تا چند دقیقه است.

## ۷) آزمون دوره‌ای (توصیه‌ی جدی)
پشتیبانِ آزمایش‌نشده = پشتیبان نامعتبر. ماهانه یک بار restore را روی محیط آزمایشی اجرا و
صحت داده را بررسی کنید. (در توسعه‌ی این قابلیت، round-trip کامل با موفقیت اجرا و تأیید شد.)

## ۸) شواهد اعتبارسنجی
- `scripts/backup.sh` روی دیتابیس محلی ⇒ فایل `.sql.gz` معتبر با ۵۶ گزاره‌ی DDL/DML.
- **round-trip:** درج وضعیت معلوم → backup → حذف کامل جدول‌ها → `restore.sh` →
  بازگشت دقیق داده (۱۸ → ۰ → ۱۸).
- `docker compose config` با سرویس `backup` ⇒ معتبر.
