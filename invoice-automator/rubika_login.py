#!/usr/bin/env python3
"""
اسکریپت لاگین روبیکا (یک بار)

استفاده:
  python3 rubika_login.py

روبیکا شماره تلفن و کد تأیید را می‌پرسد:
  - شماره را این‌طور وارد کن:  989XXXXXXXXX  (با کد کشور 98، بدون + و بدون صفر)
session در فایل rubika.rbs کنار پروژه ذخیره می‌شود و main.py از همان استفاده می‌کند.

⚠️ این کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import asyncio
from pathlib import Path

# همان نام session که rubika_sender.py استفاده می‌کند
SESSION_NAME = str(Path(__file__).resolve().parent / "rubika")


async def login():
    try:
        from rubpy import Client
    except ImportError:
        print("❌ کتابخانه rubpy نصب نیست → pip3 install rubpy")
        return False

    print("\n" + "=" * 50)
    print("🔐 لاگین روبیکا (اکانت شخصی)")
    print("=" * 50)
    print("\nروبیکا شماره و کد را می‌پرسد.")
    print("شماره را این‌طور وارد کن:  989XXXXXXXXX\n")

    async with Client(name=SESSION_NAME) as client:
        me = await client.get_me()
        name = getattr(me, "first_name", "") or ""
        print("\n" + "=" * 50)
        print("✅ لاگین موفق!")
        print(f"👤 نام: {name}")
        print("✅ اکنون main.py را اجرا کن؛ روبیکا از این session استفاده می‌کند.")
        print("=" * 50)
        return True


if __name__ == "__main__":
    try:
        ok = asyncio.run(login())
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        ok = False
    raise SystemExit(0 if ok else 1)
