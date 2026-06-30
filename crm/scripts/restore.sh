#!/bin/sh
# ── شفازح CRM — بازیابی دیتابیس از فایل پشتیبان ───────────────────────────────
# هشدار: این عملیات داده‌های فعلی را بازنویسی می‌کند (dump با --clean ساخته شده).
#
# استفاده:
#   ./restore.sh <مسیر-فایل.sql.gz>
#   (یا) BACKUP_FILE=/backups/latest.sql.gz ./restore.sh
#
# متغیرها مثل backup.sh: PGHOST/PGPORT/POSTGRES_USER/POSTGRES_DB/POSTGRES_PASSWORD
set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${POSTGRES_USER:-shofazh}"
PGDATABASE="${POSTGRES_DB:-shofazh}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD لازم است}"

FILE="${1:-${BACKUP_FILE:-}}"
if [ -z "$FILE" ]; then
  echo "خطا: فایل پشتیبان مشخص نشده. استفاده: ./restore.sh <file.sql.gz>" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "خطا: فایل یافت نشد: $FILE" >&2
  exit 1
fi

echo "⚠️  بازیابی ${PGDATABASE}@${PGHOST}:${PGPORT} از ${FILE}"
echo "    داده‌های فعلی بازنویسی می‌شوند. ۵ ثانیه فرصت لغو (Ctrl-C)…"
sleep 5

# باز کردن gzip و تزریق با psql. ON_ERROR_STOP تا اولین خطا متوقف شود.
gunzip -c "$FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1

echo "✅ بازیابی کامل شد. توصیه: سرویس api را ری‌استارت کنید تا اتصال‌ها تازه شوند."
