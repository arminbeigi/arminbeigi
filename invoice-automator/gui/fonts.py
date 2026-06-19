"""
بارگذاری فونت فارسی باندل‌شده (Vazirmatn).

این فونت همراه برنامه ارسال می‌شود تا نمایش فارسی مستقل از فونت‌های
نصب‌شده‌ی سیستم، همیشه یکدست و درست باشد. روی ویندوز فونت به‌صورت
خصوصی برای همین پردازه ثبت می‌شود (نیازی به نصب در سیستم نیست).
"""

import sys
from pathlib import Path

from customtkinter import FontManager

# نام خانواده‌ی فونت پس از ثبت
VAZIR_FAMILY = "Vazirmatn"
# فونت جایگزین در صورت نبود فونت باندل‌شده (روی همه‌ی نسخه‌های ویندوز هست)
FALLBACK_FAMILY = "Tahoma"

_loaded_family: str | None = None


def _assets_dir() -> Path:
    """مسیر پوشه‌ی منابع، چه در اجرای عادی و چه در حالت باندل‌شده‌ی PyInstaller."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).resolve().parent.parent
    return base / "gui" / "assets" / "fonts"


def load_persian_font() -> str:
    """
    فونت Vazirmatn را ثبت می‌کند و نام خانواده‌ی قابل‌استفاده را برمی‌گرداند.
    اگر ثبت ناموفق بود یا فایل نبود، فونت جایگزین (Tahoma) برگردانده می‌شود.
    """
    global _loaded_family
    if _loaded_family:
        return _loaded_family

    fonts_dir = _assets_dir()
    files = [
        fonts_dir / "Vazirmatn-Regular.ttf",
        fonts_dir / "Vazirmatn-Bold.ttf",
    ]

    ok = False
    for f in files:
        if f.exists():
            try:
                if FontManager.load_font(str(f)):
                    ok = True
            except Exception:
                pass

    _loaded_family = VAZIR_FAMILY if ok else FALLBACK_FAMILY
    return _loaded_family
