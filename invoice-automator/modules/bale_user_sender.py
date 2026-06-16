"""
ارسال پیش فاکتور از طریق پیام‌رسان بله با اکانت شخصی (کتابخانه aiobale)
چت واقعی دو‌طرفه — نه ربات.

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


def _to_international(phone: str) -> str:
    """تبدیل 09121056345 → 989121056345 (فرمت موردنیاز بله: بدون + و بدون صفر اول)"""
    phone = phone.strip().replace(" ", "").replace("+", "")
    if phone.startswith("0098"):
        return phone[2:]
    if phone.startswith("98"):
        return phone
    if phone.startswith("0"):
        return "98" + phone[1:]
    return "98" + phone


class BaleUserSender:
    """ارسال پیام/فایل از طریق اکانت شخصی بله (نه ربات)"""

    def __init__(self, config: dict):
        session = config.get("user_session_file") or ""
        if session and not Path(session).is_absolute():
            session = str(BASE_DIR / session)

        # اگر فایل در مسیر پروژه نبود، در دایرکتوری فعلی هم بگرد
        if session and not Path(session).exists():
            fallback = Path.cwd() / Path(session).name
            if fallback.exists():
                session = str(fallback)

        self.session_file = session
        self.enabled = bool(session) and Path(session).exists()

    async def _resolve_peer(self, client, phone: str):
        """
        پیدا کردن یا ساختن مخاطب بله از روی شماره تلفن.
        نام مخاطب = شماره تلفن مشتری.
        خروجی: InfoPeer (دارای id و type) یا None
        """
        intl = _to_international(phone)            # 989121056345
        intl_int = int(intl)                       # 989121056345 (عدد)

        # تلاش ۱: جستجوی مستقیم (شاید قبلاً مخاطب باشد)
        try:
            peer = await client.search_contact(phone_number=intl)
            if peer is not None:
                return peer
        except Exception as e:
            logger.debug(f"search_contact: {e}")

        # تلاش ۲: افزودن به مخاطبین با نام = شماره تلفن، سپس استفاده از خروجی
        try:
            imported = await client.import_contacts([(intl_int, phone)])
            if imported:
                logger.info(f"بله: مخاطب {phone} ساخته شد")
                return imported[0]
        except Exception as e:
            logger.debug(f"import_contacts: {e}")

        # تلاش ۳: جستجوی دوباره بعد از import
        try:
            return await client.search_contact(phone_number=intl)
        except Exception as e:
            logger.debug(f"search_contact(2): {e}")
            return None

    async def _send_async(self, phone: str, pdf_path: str, caption: str, doc_caption: str) -> dict:
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
                return {"success": False,
                        "error": f"شماره {phone} در بله یافت نشد (احتمالاً کاربر بله نیست)"}

            chat_id = peer.id
            chat_type = getattr(peer, "type", None) or ChatType.PRIVATE

            # ابتدا متن کامل پیام
            try:
                await client.send_message(text=caption, chat_id=chat_id, chat_type=chat_type)
            except Exception as e:
                logger.debug(f"send_message: {e}")

            # سپس فایل PDF با یک کپشن کوتاه (تا متن تکرار نشود)
            await client.send_document(
                file=FileInput(pdf_path),
                chat_id=chat_id,
                chat_type=chat_type,
                caption=doc_caption,
            )
            logger.info(f"PDF به بله (اکانت شخصی) ارسال شد: {phone}")
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

        serial = invoice_data.get("serial", "")
        caption = (
            f"🔸 سلام و وقت بخیر 🔸\n\n"
            f"احتراماً پیش فاکتور شماره {serial} "
            f"جهت مشاهده و بررسی خدمتتان ارسال می‌گردد.\n\n"
            f"🔗 مشاهده آنلاین:\n{short_link}\n\n"
            f"🏢 تاسیسات حرارتی و برودتی شوفاژ دات کام\n"
            f"📞 02188302400"
        )
        doc_caption = f"📄 پیش فاکتور شماره {serial}"

        # asyncio.run ضروری است تا session درست لود شود
        return asyncio.run(self._send_async(phone, pdf_path, caption, doc_caption))
