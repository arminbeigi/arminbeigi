"""
ارسال پیش فاکتور از طریق پیام‌رسان بله با اکانت شخصی
(دقیقاً مثل روبیکا — نه ربات)

مراحل راه‌اندازی:
1. روی Mac: python3 rubika_login.py (یا اسکریپت نویی برای بله)
2. وارد شدن با شماره تلفن + کد تأیید
3. فایل session ذخیره می‌شود
4. برنامه از آن session برای ارسال استفاده می‌کند

⚠️ هشدار: این کتابخانه غیررسمی است. استفاده از اکانت شخصی برای ارسال انبوه
          ممکن است اکانت شما را محدود کند. با احتیاط استفاده کنید.
"""

import os
import asyncio
import logging

logger = logging.getLogger(__name__)


class BaleUserSender:
    """ارسال پیام/فایل از طریق اکانت شخصی بله (نه ربات)"""

    def __init__(self, config: dict):
        self.session_file = config.get("session_file", "bale_session.json")
        self.enabled = bool(self.session_file)
        self._client = None

    async def _get_client(self):
        """ساخت/بازیابی کلاینت بله با session موجود"""
        if self._client is None:
            try:
                from aiobale import Client
                # فرض: session به‌صورت JSON در فایل ذخیره شده است
                # (دقیق کردن راه‌اندازی باید روی Mac انجام شود)
                self._client = Client(session_file=self.session_file)
                await self._client.start()
                logger.info("✅ اتصال بله برقرار شد")
            except ImportError:
                logger.error("کتابخانه aiobale نصب نیست: pip install aiobale")
                raise
            except Exception as e:
                logger.error(f"خطا در اتصال به بله: {e}")
                raise
        return self._client

    def _format_phone(self, phone: str) -> str:
        """فرمت شماره برای بله"""
        if phone.startswith("09"):
            return phone  # بله فرمت 09xx می‌خواهد
        return phone

    async def _send_document_async(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل PDF به‌صورت async"""
        try:
            client = await self._get_client()
            formatted_phone = self._format_phone(phone)

            # ارسال فایل
            # نام دقیق متد ممکن است متفاوت باشد — باید با aiobale تأیید شود
            result = await client.send_document(
                peer=formatted_phone,  # یا phone_number یا user_id
                file_path=pdf_path,
                caption=caption
            )
            logger.info(f"PDF به بله ارسال شد: {phone}")
            return {"success": True, "data": str(result)}

        except Exception as e:
            logger.error(f"خطا در ارسال به بله: {e}")
            return {"success": False, "error": str(e)}

    async def _send_text_async(self, phone: str, text: str) -> dict:
        """ارسال پیام متنی"""
        try:
            client = await self._get_client()
            formatted_phone = self._format_phone(phone)
            result = await client.send_message(
                peer=formatted_phone,
                text=text
            )
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_document(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل (sync wrapper)"""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._send_document_async(phone, pdf_path, caption))
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
        """ارسال پیش فاکتور (دو طرفه، چت واقعی)"""
        if not self.enabled:
            return {"success": False, "error": "بله (اکانت شخصی) تنظیم نشده"}

        from .pdf_parser import format_amount

        caption = (
            f"📄 پیش فاکتور شماره {invoice_data.get('serial', '')}\n"
            f"💰 مبلغ: {format_amount(invoice_data.get('total', ''))} ریال\n"
            f"🔗 لینک: {short_link}\n\n"
            f"🏢 شوفاژ دات کام"
        )

        return self.send_document(phone, pdf_path, caption)

    async def close(self):
        """بستن اتصال"""
        if self._client:
            try:
                await self._client.disconnect()
            except Exception:
                pass
            self._client = None
