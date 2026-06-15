#!/usr/bin/env python3
"""
اسکریپت لاگین بله با اکانت شخصی (کتابخانه aiobale)
یک بار روی Mac اجرا کنید تا session ساخته شود.

استفاده:
  python3 bale_login.py

سپس شماره تلفن (مثل 09123456789) و کد تأییدی که بله می‌فرستد را وارد کنید.
فایل session (bale_session.bale) خودکار ذخیره می‌شود.

⚠️ این کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import asyncio
from pathlib import Path

SESSION_FILE = Path(__file__).parent / "bale_session.bale"


async def _maybe_await(x):
    """اگر مقدار coroutine بود، await کن"""
    if asyncio.iscoroutine(x):
        return await x
    return x


def _to_int_phone(raw: str) -> int:
    """تبدیل شماره به عددِ ملی (بدون صفر و بدون کد کشور)
    مثال: 09123456789 → 9123456789
    """
    raw = raw.strip().replace(" ", "").replace("+", "")
    if raw.startswith("0098"):
        raw = raw[4:]
    elif raw.startswith("98") and len(raw) == 12:
        raw = raw[2:]
    elif raw.startswith("0"):
        raw = raw[1:]
    return int(raw)


async def login():
    try:
        from aiobale import Client
    except ImportError:
        print("❌ کتابخانه aiobale نصب نیست → pip3 install aiobale")
        return False

    print("\n" + "=" * 50)
    print("🔐 لاگین بله (اکانت شخصی)")
    print("=" * 50)

    phone_raw = input("\n📱 شماره تلفن (مثل 09123456789): ").strip()
    if not phone_raw:
        print("❌ شماره خالی است.")
        return False

    phone_int = _to_int_phone(phone_raw)
    print(f"→ شماره ارسالی به بله: {phone_int}")

    client = Client(session_file=str(SESSION_FILE))
    await _maybe_await(client.start(run_in_background=True))

    try:
        print("\n⏳ درخواست کد تأیید...")
        resp = await client.start_phone_auth(phone_number=phone_int)
        registered = getattr(resp, "is_registered", "?")
        print(f"✅ کد تأیید ارسال شد.  (اکانت ثبت‌شده: {registered})")

        code = input("\n🔑 کد تأییدی که بله فرستاد: ").strip()

        print("\n⏳ بررسی کد...")
        result = await client.validate_code(
            code=code, transaction_hash=resp.transaction_hash
        )
        user = getattr(result, "user", None)

        # کمی صبر تا session روی دیسک نوشته شود
        await asyncio.sleep(1)

        print("\n✅ لاگین موفق بود!")
        print(f"👤 کاربر: {user}")
        print(f"💾 session ذخیره شد: {SESSION_FILE.name}")
        print("✅ اکنون main.py را اجرا کنید؛ بله از این اکانت ارسال می‌کند.")
        return True

    except Exception as e:
        print(f"\n❌ خطا: {e}")
        print("\nاگر کد به دستت نرسید یا خطای شماره گرفتی، به من بگو تا فرمت")
        print("شماره (با/بدون کد کشور 98) را عوض کنیم.")
        return False
    finally:
        await _maybe_await(client.stop())


if __name__ == "__main__":
    ok = asyncio.run(login())
    raise SystemExit(0 if ok else 1)
