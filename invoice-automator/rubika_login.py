#!/usr/bin/env python3
"""
اسکریپت لاگین روبیکا (یک بار)

استفاده:
  python3 rubika_login.py

سپس شماره تلفن بین‌المللی را وارد کن: 98XXXXXXXXXX
فایل session خودکار ذخیره می‌شود.

⚠️ این کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import asyncio
from pathlib import Path

SESSION_FILE = Path(__file__).parent / "rubika_session.json"


async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x


async def login():
    try:
        from rubpy import Client
    except ImportError:
        print("❌ کتابخانه rubpy نصب نیست → pip3 install rubpy")
        return False

    print("\n" + "=" * 50)
    print("🔐 لاگین روبیکا (اکانت شخصی)")
    print("=" * 50)
    print("\nروبیکا شماره تلفن را می‌پرسد.")
    print("شماره را این‌طور وارد کن:  98XXXXXXXXXX\n")

    client = Client()
    try:
        # روبیکا خودش لاگین تعاملی را انجام می‌دهد
        await _maybe_await(client.start())
        await asyncio.sleep(1)
        print("\n" + "=" * 50)
        print("✅ لاگین موفق!")
        print("✅ اکنون main.py را اجرا کن؛ روبیکا از این session استفاده می‌کند.")
        print("=" * 50)
        return True
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        return False
    finally:
        await _maybe_await(client.disconnect())


if __name__ == "__main__":
    ok = asyncio.run(login())
    raise SystemExit(0 if ok else 1)
