#!/usr/bin/env python3
"""
گزارش تلگرام داده‌محور برای GSC Auto-Fixer.

از فایل gsc-last-run.json (که توسط gsc-auto-fixer.py در هر اجرا بازنویسی می‌شود)
یک گزارش کامل فارسی می‌سازد و به تلگرام می‌فرستد. برای هر صفحه:
  - لینک صفحه‌ای که روی آن کار شده
  - دقیقاً چه چیزی تغییر کرد (عنوان و متای Yoast: قبل ← بعد)
  - کلمه کلیدی کانونی و کلیک انتظاری
"""

import json
import os
import sys

try:
    import requests
except ImportError:
    requests = None

LAST_RUN_FILE = "gsc-last-run.json"


def _fmt_change(label: str, old: str, new: str) -> str:
    """یک خط تغییر: اگر مقدار قبلی موجود باشد قبل ← بعد، وگرنه فقط مقدار جدید."""
    old = (old or "").strip()
    new = (new or "").strip()
    if old and old != new:
        return f"   {label}:\n      قبل: {old}\n      بعد: {new}"
    if old and old == new:
        return f"   {label} (بدون تغییر): {new}"
    return f"   {label} (تنظیم شد): {new}"


def build_message(data: dict, run_url: str) -> str:
    results = data.get("results", [])
    ok = data.get("successful", 0)
    failed = data.get("failed", 0)

    lines = []
    lines.append("✅ گزارش GSC Auto-Fixer — موفق" if failed == 0 else "⚠️ گزارش GSC Auto-Fixer")
    lines.append("")
    lines.append(f"تعداد صفحات: {len(results)} | موفق: {ok} | ناموفق: {failed}")
    lines.append("─────────────────────")

    total_gain = 0
    for i, r in enumerate(results, 1):
        status = "✅ اعمال شد" if r.get("success") else "❌ ناموفق"
        gain = str(r.get("expected_gain", "")).strip()
        # جمع عددی کلیک‌های انتظاری
        digits = "".join(ch for ch in gain if ch.isdigit())
        if digits:
            total_gain += int(digits)

        lines.append("")
        lines.append(f"{i}) کوئری: {r.get('query', '—')}  {status}")
        lines.append(f"   🔗 صفحه: {r.get('page', '—')}")
        lines.append(f"   شناسه پست: {r.get('post_id', '—')}")
        lines.append(_fmt_change("📝 عنوان Yoast", r.get("current_title"), r.get("new_title")))
        lines.append(_fmt_change("🧾 متای Yoast", r.get("current_meta"), r.get("new_meta")))
        lines.append(f"   🎯 کلمه کلیدی: {r.get('focus_keyword', '—')}")
        if gain:
            lines.append(f"   📈 کلیک انتظاری: {gain}")

    lines.append("")
    lines.append("─────────────────────")
    if total_gain:
        lines.append(f"مجموع کلیک انتظاری (۷ تا ۱۴ روز): +{total_gain}")
    lines.append("فقط فیلدهای Yoast (عنوان، متا، کلمه کلیدی) تغییر کرد.")
    lines.append("محتوا و قیمت دست‌نخورده و کاملاً قابل بازگشت است.")
    lines.append("")
    lines.append(f"لاگ کامل: {run_url}")
    return "\n".join(lines)


def main():
    token = os.environ.get("TELEGRAM_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    run_url = os.environ.get("RUN_URL", "")

    if not os.path.exists(LAST_RUN_FILE):
        print(f"⚠ {LAST_RUN_FILE} not found — nothing applied this run, skipping report.")
        return

    with open(LAST_RUN_FILE, encoding="utf-8") as f:
        data = json.load(f)

    if not data.get("results"):
        print("⚠ No results in last run — skipping report.")
        return

    message = build_message(data, run_url)
    print(message)

    if not token or not chat_id:
        print("⚠ TELEGRAM_TOKEN/TELEGRAM_CHAT_ID not set — printed only.")
        return
    if requests is None:
        print("⚠ requests not available — printed only.")
        return

    resp = requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": message, "disable_web_page_preview": False},
        timeout=15,
    )
    print(f"Telegram → {resp.status_code}")


if __name__ == "__main__":
    main()
