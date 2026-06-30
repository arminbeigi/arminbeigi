#!/bin/sh
# ── شفازح CRM — نقطه‌ی ورود کانتینر API ──────────────────────────────────────
# ۱) منتظر آماده‌شدن دیتابیس
# ۲) اعمال مهاجرت‌ها (migrate deploy — بدون تعامل، مناسب تولید)
# ۳) seed یک‌بارمصرف و idempotent (با upsert؛ خطا متوقف‌کننده نیست)
# ۴) اجرای سرور
set -e

echo "⏳ در انتظار دیتابیس…"
# تلاش برای مهاجرت تا زمانی که دیتابیس بالا بیاید (حداکثر ~۶۰ ثانیه)
i=0
until node ./node_modules/prisma/build/index.js migrate deploy 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "❌ دیتابیس در دسترس نشد؛ تلاش نهایی برای مهاجرت (با نمایش خطا):"
    node ./node_modules/prisma/build/index.js migrate deploy
    break
  fi
  echo "  …تلاش $i/30"
  sleep 2
done
echo "✅ مهاجرت‌ها اعمال شد."

echo "🌱 seed داده‌های پایه (idempotent)…"
node --experimental-strip-types prisma/seed.ts || echo "⚠️  seed با خطا مواجه شد (احتمالاً قبلاً اجرا شده) — ادامه می‌دهیم."

echo "🚀 اجرای API روی پورت ${PORT:-4000}…"
exec node dist/main.js
