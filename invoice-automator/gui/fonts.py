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


def _base_dir() -> Path:
    """ریشه‌ی منابع، چه در اجرای عادی و چه در حالت باندل‌شده‌ی PyInstaller."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def _assets_dir() -> Path:
    """مسیر پوشه‌ی فونت‌ها."""
    return _base_dir() / "gui" / "assets" / "fonts"


def app_icon_path() -> str | None:
    """مسیر آیکن برنامه (.ico) اگر موجود باشد."""
    ico = _base_dir() / "assets" / "icon.ico"
    return str(ico) if ico.exists() else None


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
