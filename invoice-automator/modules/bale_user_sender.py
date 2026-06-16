"""
ارسال پیش فاکتور از طریق پیام‌رسان بله با اکانت شخصی (کتابخانه aiobale)
چت واقعی دو‌طرفه — مثل روبیکا، نه ربات.

راه‌اندازی: یک بار `python3 bale_login.py` تا session ساخته شود.

⚠️ این کتابخانه غیررسمی است. استفاده از اکانت شخصی برای ارسال انبوه
   ممکن است اکانت شما را محدود کند. با احتیاط استفاده کنید.
"""

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# پوشه‌ی پروژه (invoice-automator)
BASE_DIR = Path(__file__).resolve().parent.parent


async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x


class BaleUserSender:
    """ارسال پیام/فایل از طریق اکانت شخصی بله (نه ربات)"""

    def __init__(self, config: dict):
        session = config.get("user_session_file") or ""
        if session and not Path(session).is_absolute():
            session = str(BASE_DIR / session)

        # اگر فایل وجود ندارد، جستجو کن
        if session and not Path(session).exists():
            # جستجو ۱: دایرکتوری فعلی
            fallback = Path.cwd() / Path(session).name
            if fallback.exists():
                session = str(fallback)
            else:
                # جستجو ۲: پوشه والد دایرکتوری فعلی
                fallback = Path.cwd().parent / Path(session).name
                if fallback.exists():
                    session = str(fallback)

        self.session_file = session
        self.enabled = bool(session) and Path(session).exists()

        # پرینت برای دیباگ
        print(f"[BaleUserSender] session_file={session}, exists={Path(session).exists() if session else False}, enabled={self.enabled}")

    async def _resolve_peer(self, client, phone: str):
        """تبدیل شماره تلفن مشتری به مخاطب بله"""
        # تلاش ۱: جستجوی مستقیم در مخاطبین
        peer = await client.search_contact(phone_number=phone)
        if peer is not None:
            return peer

        # تلاش ۲: افزودن شماره به مخاطبین با نام = شماره، سپس جستجوی دوباره
        national = int(phone[1:]) if phone.startswith("0") else int(phone)
        try:
            await client.import_contacts([(national, phone)])
            logger.info(f"مخاطب {phone} اضافه شد")
        except Exception as e:
            logger.debug(f"import_contacts: {e}")
        return await client.search_contact(phone_number=phone)

    async def _send_async(self, phone: str, pdf_path: str, caption: str) -> dict:
        try:
            from aiobale import Client
            from aiobale.enums import ChatType
            from aiobale.types import FileInput
        except ImportError:
            return {"success": False, "error": "aiobale نصب نیست (pip install aiobale)"}

        client = Client(session_file=self.session_file)
        try:
            await _maybe_await(client.start(run_in_background=True))
            peer = await self._resolve_peer(client, phone)
            if peer is None:
                return {"success": False, "error": f"مخاطب {phone} در بله پیدا نشد"}

            chat_type = getattr(peer, "type", None) or ChatType.PRIVATE
            try:
                file_input = FileInput(pdf_path)
            except Exception:
                file_input = FileInput(path=pdf_path)

            await client.send_document(
                file=file_input,
                chat_id=peer.id,
                chat_type=chat_type,
                caption=caption,
            )
            logger.info(f"PDF به بله (شخصی) ارسال شد: {phone}")
            return {"success": True}

        except Exception as e:
            logger.error(f"خطا در ارسال به بله (شخصی): {e}")
            return {"success": False, "error": str(e)}
        finally:
            await _maybe_await(client.stop())

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور (چت دو‌طرفه با اکانت شخصی)"""
        if not self.enabled:
            return {
                "success": False,
                "error": "بله (اکانت شخصی) تنظیم نشده — اول bale_login.py را اجرا کنید",
            }

        from .pdf_parser import format_amount

        caption = (
            f"🔸 سلام و وقت بخیر 🔸\n\n"
            f"احتراماً پیش فاکتور شماره {invoice_data.get('serial', '')} "
            f"جهت مشاهده و بررسی خدمتتان ارسال می‌گردد.\n\n"
            f"🔗 مشاهده آنلاین:\n{short_link}\n\n"
            f"🏢 تاسیسات حرارتی و برودتی شوفاژ دات کام\n"
            f"📞 02188302400"
        )

        # asyncio.run مثل bale_test_send.py — ضروری برای لود شدن صحیح session
        return asyncio.run(self._send_async(phone, pdf_path, caption))
