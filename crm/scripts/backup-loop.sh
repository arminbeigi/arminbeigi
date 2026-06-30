#!/bin/sh
# ── حلقه‌ی پشتیبان‌گیری دوره‌ای (برای سرویس backup در docker-compose) ──────────
# هر BACKUP_INTERVAL ثانیه یک‌بار backup.sh را اجرا می‌کند. یک پشتیبان اولیه هم
# بلافاصله می‌گیرد. پیش‌فرض: روزانه (86400 ثانیه).
set -eu
INTERVAL="${BACKUP_INTERVAL:-86400}"
echo "[backup] حلقه‌ی پشتیبان‌گیری فعال شد — هر ${INTERVAL} ثانیه."
while true; do
  # اگر دیتابیس هنوز بالا نیامده، صبر کوتاه و تلاش مجدد
  if /scripts/backup.sh; then
    :
  else
    echo "[backup] پشتیبان‌گیری ناموفق بود؛ ۶۰ ثانیه دیگر تلاش می‌شود." >&2
    sleep 60
    continue
  fi
  sleep "$INTERVAL"
done
