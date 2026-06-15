#!/usr/bin/env python3
"""
اسکریپت لاگین برای بله (اکانت شخصی)
روی Mac اجرا کنید یک بار تا session ساخته شود.

استفاده:
  python3 bale_login.py

بعد شماره تلفن خود را وارد کنید و کد تأیید را بزنید.
فایل session (bale_session.json) خودکار ذخیره می‌شود.
"""

import asyncio
import json
import getpass
from pathlib import Path

SESSION_FILE = Path(__file__).parent / "bale_session.json"


async def login():
    """لاگین کاربر با شماره تلفن و کد تأیید"""
    try:
        from aiobale import Client
    except ImportError:
        print("❌ کتابخانه aiobale نصب نیست.")
        print("نصب کنید: pip install aiobale")
        return False

    print("\n" + "="*50)
    print("🔐 لاگین بله (اکانت شخصی)")
    print("="*50)
    print("\nشماره تلفن خود را با فرمت 09xx وارد کنید:\n")

    phone = input("📱 شماره تلفن: ").strip()
    if not phone.startswith("09"):
        print("❌ فرمت شماره تلفن غلط است.")
        return False

    try:
        # ساخت کلاینت و دریافت کد تأیید
        client = Client(session_file=str(SESSION_FILE))
        print("\n⏳ ارسال کد تأیید...")
        await client.send_code(phone)
        print("✅ کد تأیید به شماره شما ارسال شد.")

        # درخواست کد تأیید
        code = input("\n🔑 کد تأیید (۶ رقم): ").strip()

        print("\n⏳ تأیید کد...")
        await client.sign_in(phone, code)
        print("✅ لاگین موفق!")

        # ذخیره session
        print(f"\n💾 Session ذخیره شد: {SESSION_FILE}")
        print("✅ اکنون می‌توانید برنامه را اجرا کنید و فاکتورها ارسال شوند.")

        await client.disconnect()
        return True

    except Exception as e:
        print(f"\n❌ خطا: {e}")
        print("\nممکن است:")
        print("  • کد تأیید غلط باشد")
        print("  • شماره تلفن اشتباه باشد")
        print("  • اکانت بله مسدود باشد")
        return False


if __name__ == "__main__":
    success = asyncio.run(login())
    exit(0 if success else 1)
