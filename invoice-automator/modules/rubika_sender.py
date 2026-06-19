"""
ارسال پیش‌فاکتور از طریق روبیکا با اکانت شخصی (rubpy).

از نشستی استفاده می‌کند که کاربر یک‌بار با شماره + کد تأیید لاگین کرده
(در gui/messenger_login.py). پیام از همان شماره برای مشتری ارسال می‌شود
و یک چت شخصی ساخته می‌شود.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)


class RubikaSender:
    def __init__(self, config: dict):
        self.session_name = config.get("session_name", "")
        self.logged_in = bool(config.get("logged_in"))
        self.enabled = self.logged_in and bool(self.session_name)

    async def _send_async(self, phone: str, pdf_path: str, text: str) -> dict:
        from rubpy import Client
        client = Client(name=self.session_name)
        try:
            await client.connect()
            # یافتن GUID مشتری از روی شماره (افزودن به مخاطبین)
            phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone
            guid = None
            try:
                res = await client.add_address_book(phone=phone_intl, first_name="مشتری")
                guid = getattr(res, "user_guid", None)
            except Exception as e:
                logger.debug(f"add_address_book: {e}")
            if not guid:
                return {"success": False, "error": f"شماره {phone} در روبیکا یافت نشد"}

            # ارسال متن خوش‌آمد + سپس فایل
            if text:
                try:
                    await client.send_message(guid, text)
                except Exception as e:
                    logger.debug(f"send_message: {e}")
            await client.send_document(guid, pdf_path, caption=text or "")
            return {"success": True}
        except Exception as e:
            logger.error(f"خطا در ارسال روبیکا: {e}")
            return {"success": False, "error": str(e)}
        finally:
            try:
                await client.disconnect()
            except Exception:
                pass

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str,
                     welcome: str = "") -> dict:
        if not self.enabled:
            return {"success": False, "error": "روبیکا لاگین نشده"}

        serial = invoice_data.get("serial", "")
        parts = []
        if welcome:
            parts.append(welcome)
        if serial:
            parts.append(f"پیش‌فاکتور شماره {serial}")
        if short_link:
            parts.append(short_link)
        text = "\n".join(parts)

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._send_async(phone, pdf_path, text))
        finally:
            loop.close()
