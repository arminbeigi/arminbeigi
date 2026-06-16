"""
ارسال پیش فاکتور از طریق پیام‌رسان روبیکا

روش‌ها:
1. rubpy (کتابخانه غیررسمی) - ارسال مستقیم با اکانت شخصی
2. Rubika Bot API (رسمی) - نیاز به ساخت ربات

نکته: rubpy از اکانت شخصی استفاده می‌کند و ممکن است
      اکانت شما محدود شود. استفاده با احتیاط.
"""

import os
import asyncio
import logging

logger = logging.getLogger(__name__)


class RubikaSender:
    def __init__(self, config: dict):
        self.auth = config.get("auth", "")
        self.enabled = bool(self.auth)
        self._client = None

    async def _get_client(self):
        """ساخت/بازیابی کلاینت روبیکا"""
        if self._client is None:
            try:
                from rubpy import Client
                # rubpy 7.3+ API
                self._client = Client()
                await self._client.start()
            except ImportError:
                logger.error("کتابخانه rubpy نصب نیست: pip install rubpy")
                raise
            except Exception as e:
                logger.error(f"خطا در اتصال به روبیکا: {e}")
                raise
        return self._client

    def _format_phone(self, phone: str) -> str:
        """فرمت شماره برای روبیکا"""
        if phone.startswith("09"):
            return "0" + phone[1:]  # روبیکا فرمت 09xx می‌خواهد
        return phone

    async def _get_guid(self, client, phone: str) -> str:
        """دریافت GUID کاربر از شماره تلفن"""
        phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone

        # روش ۱: اضافه کردن به مخاطبین و دریافت GUID
        try:
            result = await client.add_address_book(phone=phone_intl, first_name="مشتری")
            guid = getattr(result, "user_guid", None)
            if guid:
                return guid
        except Exception as e:
            logger.debug(f"add_address_book: {e}")

        # روش ۲: جستجو در مخاطبین موجود
        try:
            contacts = await client.get_contacts_updates()
            for user in getattr(contacts, "user_list", []):
                user_phone = getattr(user, "phone", "") or ""
                if phone in user_phone or phone_intl in user_phone:
                    return user.user_guid
        except Exception as e:
            logger.debug(f"get_contacts_updates: {e}")

        return None

    async def _send_file_async(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل به صورت async"""
        try:
            client = await self._get_client()

            guid = await self._get_guid(client, phone)
            if not guid:
                return {"success": False, "error": f"GUID برای {phone} در مخاطبین روبیکا پیدا نشد"}

            result = await client.send_document(guid, pdf_path, caption=caption)
            logger.info(f"PDF به روبیکا ارسال شد: {phone}")
            return {"success": True, "data": str(result)}

        except Exception as e:
            logger.error(f"خطا در ارسال به روبیکا: {e}")
            return {"success": False, "error": str(e)}

    async def _send_text_async(self, phone: str, text: str) -> dict:
        """ارسال متن به صورت async"""
        try:
            client = await self._get_client()
            formatted_phone = self._format_phone(phone)
            result = await client.send_message(formatted_phone, text)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_file(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل (sync wrapper)"""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._send_file_async(phone, pdf_path, caption))
        finally:
            loop.close()

    def send_text(self, phone: str, text: str) -> dict:
        """ارسال متن (sync wrapper)"""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._send_text_async(phone, text))
        finally:
            loop.close()

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور"""
        if not self.enabled:
            return {"success": False, "error": "روبیکا تنظیم نشده"}

        from .pdf_parser import format_amount

        caption = (
            f"📄 پیش فاکتور شماره {invoice_data.get('serial', '')}\n"
            f"💰 مبلغ: {format_amount(invoice_data.get('total', ''))} ریال\n"
            f"🔗 لینک: {short_link}"
        )

        return self.send_file(phone, pdf_path, caption)

    async def close(self):
        """بستن اتصال"""
        if self._client:
            try:
                await self._client.disconnect()
            except Exception:
                pass
            self._client = None
