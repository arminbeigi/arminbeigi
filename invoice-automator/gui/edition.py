"""
نسخه‌بندی محصول (Edition) — یک کد، دو محصول.

دو نسخه از این نرم‌افزار وجود دارد:

  • yarapro  : نسخه‌ی تجاری برای فروش از طریق yarapro.ir
               (لایسنس‌دار، هاست فایل و فعال‌سازی روی yarapro.ir)
  • shofazh  : نسخه‌ی شخصیِ خودِ توسعه‌دهنده (shofazh.com)
               (بدون لایسنس، هاست فایل روی shofazh.com)

نسخه با متغیر محیطی YARA_EDITION یا فایل assets/edition.txt تعیین می‌شود؛
پیش‌فرض «yarapro» است. در زمان ساخت نصاب می‌توان آن را تغییر داد.

این لایه باعث می‌شود کاربر نهایی هیچ‌گاه «هاست مرجع» را نبیند — او فقط
پنل پیامکِ خودش را تنظیم می‌کند؛ آپلود فایل و ساخت لینک پشت‌صحنه روی
هاست ما انجام می‌شود.
"""

import os
from pathlib import Path


# ── تعریف نسخه‌ها ────────────────────────────────────────────────
EDITIONS = {
    "yarapro": {
        "brand":          "یارا",
        "brand_en":       "YaraPro",
        # هاست مرجع برای آپلود پیش‌فاکتور و ساخت لینک کوتاه (پشت‌صحنه)
        "relay_host":     "https://yarapro.ir",
        # آدرس فروشگاه/فعال‌سازی لایسنس
        "store_url":      "https://yarapro.ir",
        # آیا فعال‌سازی لایسنس لازم است؟
        "require_license": True,
    },
    "shofazh": {
        "brand":          "یارا",
        "brand_en":       "Shofazh",
        "relay_host":     "https://shofazh.com",
        "store_url":      "https://shofazh.com",
        "require_license": False,
    },
}

DEFAULT_EDITION = "yarapro"


def _detect_edition() -> str:
    # ۱) متغیر محیطی (برای ساخت نصاب)
    env = os.environ.get("YARA_EDITION", "").strip().lower()
    if env in EDITIONS:
        return env
    # ۲) فایل کنار برنامه (assets/edition.txt) — برای جداسازی بیلدها
    try:
        here = Path(__file__).resolve().parent.parent
        f = here / "assets" / "edition.txt"
        if f.exists():
            val = f.read_text(encoding="utf-8").strip().lower()
            if val in EDITIONS:
                return val
    except Exception:
        pass
    return DEFAULT_EDITION


EDITION = _detect_edition()
_CFG = EDITIONS[EDITION]


def brand() -> str:
    return _CFG["brand"]


def relay_host() -> str:
    """هاست مرجع برای آپلود فایل و ساخت لینک کوتاه (بدون اسلش انتهایی)."""
    return _CFG["relay_host"].rstrip("/")


def store_url() -> str:
    return _CFG["store_url"].rstrip("/")


def require_license() -> bool:
    return bool(_CFG["require_license"])
