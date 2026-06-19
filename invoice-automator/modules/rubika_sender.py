"""
ارسال پیش‌فاکتور از طریق روبیکا با اکانت شخصی (rubpy).

از نشستی استفاده می‌کند که کاربر یک‌بار با شماره + کد تأیید لاگین کرده
(در gui/messenger_login.py). پیام از همان شماره برای مشتری ارسال می‌شود
و یک چت شخصی ساخته می‌شود.
"""

import asyncio
import logging

from . import disable_ssl_verify

disable_ssl_verify()  # رفع خطای گواهی TLS در شبکه‌ی ایران

logger = logging.getLogger(__name__)


class RubikaSender:
    def __init__(self, config: dict):
        self.session_name = config.get("session_name", "")
        self.logged_in = bool(config.get("logged_in"))
        self.enabled = self.logged_in and bool(self.session_name)

    @staticmethod
    def _extract_guid(res):
        """استخراج GUID کاربر از پاسخ addAddressBook با مسیرهای مختلف."""
        if res is None:
            return None
        candidates = [
            lambda r: r.user.user_guid,
            lambda r: r.user_guid,
            lambda r: r.contact_user.user_guid,
            lambda r: r.abuser_user.user_guid,
            lambda r: r["user"]["user_guid"],
            lambda r: r["user_guid"],
        ]
        for fn in candidates:
            try:
                g = fn(res)
                if g:
                    return g
            except Exception:
                pass
        return None

    async def _send_async(self, phone: str, pdf_path: str, text: str,
                          contact_name: str) -> dict:
        from rubpy import Client
        client = Client(name=self.session_name)
        try:
            await client.connect()
            # یافتن GUID مشتری از روی شماره (افزودن به مخاطبین با نام یا شماره)
            phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone
            guid = None
            try:
                res = await client.add_address_book(phone=phone_intl, first_name=contact_name)
                guid = self._extract_guid(res)
            except Exception as e:
                logger.debug(f"add_address_book: {e}")
            # fallback: جستجو در مخاطبین موجود
            if not guid:
                try:
                    contacts = await client.get_contacts()
                    for u in getattr(contacts, "users", None) or getattr(contacts, "user", []) or []:
                        up = getattr(u, "phone", "") or ""
                        if phone[1:] in up:
                            guid = getattr(u, "user_guid", None)
                            break
                except Exception as e:
                    logger.debug(f"get_contacts: {e}")
            if not guid:
                return {"success": False, "error": f"یافتن مخاطب روبیکا ناموفق بود (شماره {phone})"}

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
        contact_name = (invoice_data.get("name") or "").strip() or phone

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self._send_async(phone, pdf_path, text, contact_name))
        finally:
            loop.close()
