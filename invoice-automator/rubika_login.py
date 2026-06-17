#!/usr/bin/env python3
"""
اسکریپت لاگین روبیکا (یک بار)

معمولاً نیازی به اجرای دستی این فایل نیست؛ خودِ main.py در صورت نبودِ
session، همان ابتدا لاگین را انجام می‌دهد. اما اگر خواستی دستی لاگین کنی:

  python3 rubika_login.py

شماره را این‌طور وارد کن:  989XXXXXXXXX  (با کد کشور ۹۸، بدون + و بدون صفر)
session در فایل rubika.* کنار پروژه ذخیره می‌شود و main.py از همان استفاده می‌کند.

⚠️ این کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from modules.rubika_sender import interactive_login, session_exists


if __name__ == "__main__":
    if session_exists():
        print("✅ روبیکا قبلاً لاگین شده است. (فایل session موجود است)")
        raise SystemExit(0)
    try:
        ok = asyncio.run(interactive_login())
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        ok = False
    raise SystemExit(0 if ok else 1)
