#!/usr/bin/env python3
"""
اسکریپت لاگین بله با اکانت شخصی (کتابخانه aiobale)
یک بار روی Mac اجرا کنید تا session ساخته شود.

استفاده:
  python3 bale_login.py

خودِ aiobale به‌صورت تعاملی شماره تلفن و کد تأیید را می‌پرسد:
  - شماره را به فرمت بین‌المللی وارد کنید: 98XXXXXXXXXX  (بدون + و بدون 0)
  - سپس کدی که بله می‌فرستد را وارد کنید
فایل session (bale_session.bale) خودکار ذخیره می‌شود.

⚠️ این کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import asyncio
from pathlib import Path

SESSION_FILE = Path(__file__).parent / "bale_session.bale"


async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x


async def login():
    try:
        from aiobale import Client
    except ImportError:
        print("❌ کتابخانه aiobale نصب نیست → pip3 install aiobale")
        return False

    print("\n" + "=" * 50)
    print("🔐 لاگین بله (اکانت شخصی)")
    print("=" * 50)
    print("\nخودِ بله شماره و کد را می‌پرسد.")
    print("شماره را این‌طور وارد کن:  98XXXXXXXXXX  (بدون + و بدون صفر اول)\n")

    client = Client(session_file=str(SESSION_FILE))
    try:
        # aiobale خودش لاگین تعاملی را انجام می‌دهد و session را ذخیره می‌کند
        await _maybe_await(client.start(run_in_background=True))
        await asyncio.sleep(1)  # فرصت برای ذخیره‌ی session
        print("\n" + "=" * 50)
        print("✅ session آماده است:", SESSION_FILE.name)
        print("✅ اکنون main.py را اجرا کن؛ بله از این اکانت ارسال می‌کند.")
        print("=" * 50)
        return True
    except Exception as e:
        print(f"\n❌ خطا: {e}")
        return False
    finally:
        await _maybe_await(client.stop())


if __name__ == "__main__":
    ok = asyncio.run(login())
    raise SystemExit(0 if ok else 1)
