#!/usr/bin/env python3
"""
تست ارسال بله با اکانت شخصی (aiobale)

استفاده:
  python3 bale_test_send.py self                  # ارسال به «پیام‌های ذخیره‌شده» خودت
  python3 bale_test_send.py 09123456789           # ارسال به یک شماره
  python3 bale_test_send.py 09123456789 file.pdf  # با فایل مشخص
"""
import sys
import glob
import asyncio
import traceback
from pathlib import Path

BASE = Path(__file__).resolve().parent
SESSION = str(BASE / "bale_session.bale")


async def _aw(x):
    if asyncio.iscoroutine(x):
        return await x
    return x


def find_pdf(arg=None):
    if arg and Path(arg).exists():
        return arg
    for pat in [
        "/Users/armin/Desktop/ارسال پیش فاکتور/ارسال شده/*.pdf",
        "/Users/armin/Desktop/ارسال پیش فاکتور/*.pdf",
    ]:
        g = glob.glob(pat)
        if g:
            return g[0]
    return None


async def main():
    from aiobale import Client
    from aiobale.enums import ChatType
    from aiobale.types import FileInput

    target = sys.argv[1] if len(sys.argv) > 1 else "self"
    pdf = find_pdf(sys.argv[2] if len(sys.argv) > 2 else None)
    print("📄 PDF:", pdf)
    if not pdf:
        print("❌ هیچ فایل PDF پیدا نشد.")
        return

    client = Client(session_file=SESSION)
    await _aw(client.start(run_in_background=True))
    try:
        caption = "📄 تست ارسال پیش فاکتور — شوفاژ دات کام"

        # ساخت ورودی فایل
        try:
            fi = FileInput(pdf)
        except Exception as e:
            print("⚠️ FileInput(path) جواب نداد:", e)
            print("   تلاش با FileInput(path=...)")
            fi = FileInput(path=pdf)

        if target == "self":
            me = await _aw(client.get_me())
            chat_id = getattr(me, "id", None)
            print("👤 my id:", chat_id, "| me:", me)
            await client.send_document(
                file=fi, chat_id=chat_id, chat_type=ChatType.PRIVATE, caption=caption
            )
            print("✅ به «پیام‌های ذخیره‌شده» ارسال شد — بله را چک کن.")
        else:
            peer = await client.search_contact(phone_number=target)
            print("🔎 peer:", peer)
            if peer is None:
                national = int(target[1:]) if target.startswith("0") else int(target)
                await client.import_contacts([(national, "مشتری تست")])
                peer = await client.search_contact(phone_number=target)
                print("🔎 peer (بعد از import):", peer)
            if peer is None:
                print(f"❌ مخاطب {target} در بله پیدا نشد.")
                return
            ct = getattr(peer, "type", None) or ChatType.PRIVATE
            await client.send_document(
                file=fi, chat_id=peer.id, chat_type=ct, caption=caption
            )
            print(f"✅ ارسال شد به {target}")

    except Exception as e:
        print("\n❌ خطا:")
        traceback.print_exc()
    finally:
        await _aw(client.stop())


if __name__ == "__main__":
    asyncio.run(main())
