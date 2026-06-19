"""
ارسال پیش‌فاکتور از طریق بله با اکانت شخصی (aiobale) — نه ربات.

از نشستی استفاده می‌کند که کاربر یک‌بار با شماره + کد تأیید لاگین کرده
(در gui/messenger_login.py). پیام از همان شماره برای مشتری ارسال می‌شود
و یک چت دوطرفه‌ی واقعی ساخته می‌شود.
"""

import asyncio
import logging

from . import disable_ssl_verify

disable_ssl_verify()  # رفع خطای گواهی TLS در شبکه‌ی ایران

logger = logging.getLogger(__name__)


def _to_intl_int(phone: str) -> int:
    p = (phone or "").strip().replace(" ", "")
    if p.startswith("0"):
        p = "98" + p[1:]
    elif p.startswith("+98"):
        p = p[1:]
    return int(p)


class BaleSender:
    def __init__(self, config: dict):
        self.session_file = config.get("session_file", "")
        self.logged_in = bool(config.get("logged_in"))
        self.enabled = self.logged_in and bool(self.session_file)

    async def _send_async(self, phone: str, pdf_path: str, text: str,
                          contact_name: str) -> dict:
        from aiobale import Client
        from aiobale.enums import ChatType
        # aiobale نیازی به connect ندارد
        client = Client(session_file=self.session_file)
        try:
            intl_int = _to_intl_int(phone)
            intl_str = str(intl_int)
            chat_id = None
            # ۱. ساخت مخاطب (با نام مشتری یا شماره) — چت دوطرفه
            try:
                peers = await client.import_contacts([(intl_int, contact_name)])
                if peers:
                    chat_id = peers[0].id
            except Exception as e:
                logger.debug(f"import_contacts: {e}")
            # ۲. در صورت نبود، جستجوی مخاطب بر اساس شماره
            if chat_id is None:
                try:
                    peer = await client.search_contact(intl_str)
                    if peer:
                        chat_id = peer.id
                except Exception as e:
                    logger.debug(f"search_contact: {e}")
            if chat_id is None:
                return {"success": False, "error": f"ساخت/یافتن مخاطب بله ناموفق بود ({phone})"}

            if text:
                await client.send_message(text=text, chat_id=chat_id,
                                          chat_type=ChatType.PRIVATE)
            await client.send_document(file=pdf_path, chat_id=chat_id,
                                       chat_type=ChatType.PRIVATE, caption=text or None)
            return {"success": True}
        except Exception as e:
            logger.error(f"خطا در ارسال بله: {e}")
            return {"success": False, "error": str(e)}
        finally:
            try:
                await client.session.close()
            except Exception:
                pass

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str,
                     welcome: str = "") -> dict:
        if not self.enabled:
            return {"success": False, "error": "بله لاگین نشده"}

        serial = invoice_data.get("serial", "")
        parts = []
        if welcome:
            parts.append(welcome)
        if serial:
            parts.append(f"پیش‌فاکتور شماره {serial}")
        if short_link:
            parts.append(short_link)
        text = "\n".join(parts)
        # نام مخاطب: نام مشتری اگر باشد، وگرنه شماره تماس
        contact_name = (invoice_data.get("name") or "").strip() or phone

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self._send_async(phone, pdf_path, text, contact_name))
        finally:
            loop.close()
