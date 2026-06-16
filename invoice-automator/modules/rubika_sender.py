"""
ارسال پیش فاکتور از طریق روبیکا (غیرفعال - نیاز به تنظیم دستی)

مراحل راه‌اندازی:
1. python3 rubika_login.py  (یک بار برای لاگین و ذخیره session)
2. سپس config.yaml میں auth: "enabled" را تنظیم کن
3. main.py را اجرا کن

⚠️ rubpy کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent


class RubikaSender:
    def __init__(self, config: dict):
        self.enabled = config.get("auth", "") == "enabled"
        self._client = None

    async def _get_client(self):
        """کلاینت روبیکا"""
        if self._client is None:
            try:
                from rubpy import Client
                # rubpy بدون نیاز به تعامل (از session قبلی)
                self._client = Client()
                await self._client.start()
            except ImportError:
                logger.error("کتابخانه rubpy نصب نیست: pip install rubpy")
                raise
            except Exception as e:
                logger.error(f"خطا در اتصال به روبیکا: {e}")
                raise
        return self._client

    async def _get_guid(self, client, phone: str) -> str:
        """دریافت GUID کاربر"""
        phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone

        try:
            result = await client.add_address_book(phone=phone_intl, first_name="مشتری")
            guid = getattr(result, "user_guid", None)
            if guid:
                return guid
        except Exception as e:
            logger.debug(f"add_address_book: {e}")

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
        """ارسال فایل"""
        try:
            client = await self._get_client()
            guid = await self._get_guid(client, phone)
            if not guid:
                return {"success": False, "error": f"GUID برای {phone} پیدا نشد"}

            result = await client.send_document(guid, pdf_path, caption=caption)
            logger.info(f"PDF به روبیکا ارسال شد: {phone}")
            return {"success": True}

        except EOFError:
            # اگر session نیازمند interactive input باشد، skip کن
            logger.warning("روبیکا نیاز به دوباره لاگین دارد. اسکریپت rubika_login.py را مجدداً اجرا کنید.")
            return {"success": False, "error": "روبیکا نیاز به لاگین مجدد دارد"}
        except Exception as e:
            logger.error(f"خطا در ارسال به روبیکا: {e}")
            return {"success": False, "error": str(e)}

    def send_file(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل (sync wrapper)"""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self._send_file_async(phone, pdf_path, caption))
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
