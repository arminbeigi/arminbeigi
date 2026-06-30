#!/bin/sh
# ── شفازح CRM — پشتیبان‌گیری دیتابیس (pg_dump فشرده + چرخش نگه‌داری) ──────────
# قابل اجرا هم به‌صورت دستی روی میزبان و هم داخل سرویس backup در docker-compose.
#
# متغیرها (با مقادیر پیش‌فرض سازگار با compose):
#   PGHOST      (پیش‌فرض: postgres)
#   PGPORT      (پیش‌فرض: 5432)
#   POSTGRES_USER / POSTGRES_DB / POSTGRES_PASSWORD
#   BACKUP_DIR  (پیش‌فرض: /backups)
#   RETENTION_DAYS (پیش‌فرض: 14) — پشتیبان‌های قدیمی‌تر حذف می‌شوند
set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${POSTGRES_USER:-shofazh}"
PGDATABASE="${POSTGRES_DB:-shofazh}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD لازم است}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/shofazh-${PGDATABASE}-${TS}.sql.gz"
TMP="${OUT}.partial"

echo "[$(date -u +%FT%TZ)] شروع پشتیبان‌گیری از ${PGDATABASE}@${PGHOST}:${PGPORT} → ${OUT}"

# pg_dump فرمت متنی فشرده (قابل بازیابی با psql). از --clean --if-exists برای بازیابی تمیز.
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$TMP"

# نوشتن اتمیک: فقط در صورت موفقیت کامل، فایل نهایی ساخته می‌شود
mv "$TMP" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date -u +%FT%TZ)] ✅ پشتیبان ساخته شد (${SIZE})"

# چرخش: حذف پشتیبان‌های قدیمی‌تر از RETENTION_DAYS
find "$BACKUP_DIR" -name "shofazh-${PGDATABASE}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/[حذف قدیمی] /' || true

# نمادین به آخرین پشتیبان برای دسترسی ساده
ln -sf "$(basename "$OUT")" "$BACKUP_DIR/latest.sql.gz"
echo "[$(date -u +%FT%TZ)] آخرین پشتیبان: ${BACKUP_DIR}/latest.sql.gz"
