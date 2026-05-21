#!/usr/bin/env python3
"""ورود به روبیکا و ذخیره session"""
import asyncio
from rubpy import Client

async def login():
    print("🔄 درحال اتصال به روبیکا...")
    print("⏳ کد تایید به روبیکای 09381006062 ارسال می‌شود...")
    print("   کد رو که دریافت کردید اینجا وارد کنید.\n")

    async with Client(name="shofazh", phone_number="09381006062") as client:
        me = await client.get_me()
        print(f"\n✅ لاگین موفق!")
        print(f"   نام: {me.first_name} {me.last_name or ''}")
        print(f"   session ذخیره شد!")

asyncio.run(login())
