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
import os
import sys
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
            session_file = BASE_DIR / "rubika_session.json"
            if not session_file.exists():
                logger.warning("روبیکا: فایل session یافت نشد")
                raise RuntimeError("روبیکا: ابتدا python3 rubika_login.py را اجرا کنید")

            try:
                from rubpy import Client
                self._client = Client()
                try:
                    old_stdin = sys.stdin
                    sys.stdin = open(os.devnull, 'r')
                    try:
                        await asyncio.wait_for(self._client.start(), timeout=10.0)
                    finally:
                        sys.stdin = old_stdin
                except asyncio.TimeoutError:
                    logger.warning("روبیکا timeout")
                    raise RuntimeError("روبیکا timeout - لاگین مجدد لازم است")
                except EOFError:
                    logger.warning("روبیکا نیاز به لاگین مجدد دارد")
                    raise RuntimeError("روبیکا نیاز به لاگین است")
            except ImportError:
                logger.error("کتابخانه rubpy نصب نیست: pip install rubpy")
                raise
            except Exception as e:
                logger.error(f"خطا در اتصال به روبیکا: {e}")
                raise
        return self._client

    async def _get_guid(self, client, phone: str) -> str:
        """دریافت GUID از مخاطبین موجود"""
        phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone

        try:
            contacts = await client.get_contacts_updates()
            for user in getattr(contacts, "user_list", []):
                user_phone = getattr(user, "phone", "") or ""
                if phone in user_phone or phone_intl in user_phone:
                    logger.info(f"مخاطب یافت شد: {phone}")
                    return user.user_guid
        except Exception as e:
            logger.debug(f"get_contacts_updates: {e}")

        return None

    async def _send_file_async(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل مستقیم به شماره"""
        try:
            client = await self._get_client()
            phone_intl = "+98" + phone[1:] if phone.startswith("0") else phone

            # تلاش ۱: جستجو در مخاطبین
            guid = await self._get_guid(client, phone)

            # تلاش ۲: اگر GUID نیافتیم، سعی کن مستقیم ارسال کن
            if not guid:
                try:
                    # برخی نسخه‌های rubpy از send_document مستقیم پشتیبانی می‌کنند
                    result = await client.send_document(phone_intl, pdf_path, caption=caption)
                    logger.info(f"PDF به روبیکا ارسال شد (مستقیم): {phone}")
                    return {"success": True}
                except Exception as e:
                    logger.debug(f"ارسال مستقیم شکست: {e}")
                    return {"success": False, "error": f"شماره {phone} در روبیکا یافت نشد"}

            result = await client.send_document(guid, pdf_path, caption=caption)
            logger.info(f"PDF به روبیکا ارسال شد: {phone}")
            return {"success": True}

        except EOFError:
            logger.warning("روبیکا نیاز به دوباره لاگین دارد")
            return {"success": False, "error": "روبیکا نیاز به لاگین مجدد دارد"}
        except Exception as e:
            logger.error(f"خطا در ارسال به روبیکا: {e}")
            return {"success": False, "error": str(e)}

    def send_file(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل (sync wrapper با timeout)"""
        loop = asyncio.new_event_loop()
        try:
            # Timeout 8 ثانیه - اگر interactive prompt بود، timeout می‌شود
            return loop.run_until_complete(
                asyncio.wait_for(self._send_file_async(phone, pdf_path, caption), timeout=8.0)
            )
        except asyncio.TimeoutError:
            logger.warning("روبیکا timeout شد - احتمالاً نیاز به دوباره لاگین")
            return {"success": False, "error": "روبیکا timeout - دوباره لاگین کنید"}
        except Exception as e:
            logger.error(f"خطا در Rubika: {e}")
            return {"success": False, "error": str(e)}
        finally:
            loop.close()

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور (با timeout برای جلوگیری از hanging)"""
        if not self.enabled:
            return {"success": False, "error": "روبیکا تنظیم نشده"}

        from .pdf_parser import format_amount

        caption = (
            f"📄 پیش فاکتور شماره {invoice_data.get('serial', '')}\n"
            f"💰 مبلغ: {format_amount(invoice_data.get('total', ''))} ریال\n"
            f"🔗 لینک: {short_link}"
        )

        # Timeout 8 ثانیه - اگر timeout شد، بقیه سیستم متوقف نمی‌شود
        return self.send_file(phone, pdf_path, caption)

    async def close(self):
        """بستن اتصال"""
        if self._client:
            try:
                await self._client.disconnect()
            except Exception:
                pass
            self._client = None
