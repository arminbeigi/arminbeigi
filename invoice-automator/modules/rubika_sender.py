"""
ارسال پیش فاکتور از طریق روبیکا (اکانت شخصی - کتابخانه rubpy)

راه‌اندازی:
1. python3 rubika_login.py   (یک بار برای لاگین و ذخیره session)
2. در config.yaml مقدار rubika.auth را "enabled" بگذار
3. main.py را اجرا کن

روبیکا خودش مخاطب را با نام = شماره تلفن مشتری اضافه می‌کند (addAddressBook).

⚠️ rubpy کتابخانه غیررسمی است؛ استفاده‌ی انبوه ممکن است اکانت را محدود کند.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent


def _to_international(phone: str) -> str:
    """تبدیل 09121056345 → 989121056345 (فرمت روبیکا)"""
    phone = phone.strip().replace(" ", "").replace("+", "")
    if phone.startswith("0098"):
        return phone[2:]
    if phone.startswith("98"):
        return phone
    if phone.startswith("0"):
        return "98" + phone[1:]
    return "98" + phone


class RubikaSender:
    def __init__(self, config: dict):
        self.enabled = config.get("auth", "") == "enabled"
        self._client = None

    async def _get_client(self):
        """کلاینت روبیکا (با ذخیره session؛ بدون prompt تعاملی)"""
        if self._client is None:
            from rubpy import Client
            self._client = Client(name=str(BASE_DIR / "rubika"))

            # جلوگیری از prompt تعاملی: stdin را به /dev/null هدایت کن
            old_stdin = sys.stdin
            try:
                sys.stdin = open(os.devnull, "r")
                await asyncio.wait_for(self._client.start(), timeout=15.0)
            finally:
                sys.stdin = old_stdin
        return self._client

    async def _get_guid(self, client, phone: str) -> str:
        """
        گرفتن GUID کاربر روبیکا.
        روش اصلی: addAddressBook — مخاطب را با نام = شماره تلفن می‌سازد و GUID برمی‌گرداند.
        """
        intl = _to_international(phone)   # 989121056345

        # روش ۱: افزودن به دفترچه آدرس با نام = شماره تلفن
        for candidate in (intl, "+" + intl):
            try:
                result = await client.add_address_book(phone=candidate, first_name=phone)
                guid = result.user_guid
                if guid:
                    logger.info(f"روبیکا: مخاطب {phone} اضافه شد")
                    return guid
            except Exception as e:
                logger.debug(f"add_address_book({candidate}): {e}")

        # روش ۲: جستجو در مخاطبین موجود
        try:
            contacts = await client.get_contacts_updates()
            for user in getattr(contacts, "users", []) or []:
                user_phone = str(getattr(user, "phone", "") or "")
                if phone[-10:] in user_phone:
                    return user.user_guid
        except Exception as e:
            logger.debug(f"get_contacts_updates: {e}")

        return None

    async def _send_file_async(self, phone: str, pdf_path: str, caption: str = "") -> dict:
        try:
            client = await self._get_client()
            guid = await self._get_guid(client, phone)
            if not guid:
                return {"success": False,
                        "error": f"شماره {phone} کاربر روبیکا نیست یا یافت نشد"}

            await client.send_document(guid, pdf_path, caption=caption)
            logger.info(f"PDF به روبیکا ارسال شد: {phone}")
            return {"success": True}

        except asyncio.TimeoutError:
            logger.warning("روبیکا timeout - لاگین مجدد لازم است (python3 rubika_login.py)")
            return {"success": False, "error": "روبیکا timeout - لاگین مجدد کنید"}
        except ImportError:
            logger.error("کتابخانه rubpy نصب نیست: pip install rubpy")
            return {"success": False, "error": "rubpy نصب نیست"}
        except Exception as e:
            logger.error(f"خطا در ارسال به روبیکا: {e}")
            return {"success": False, "error": str(e)}

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور از طریق روبیکا"""
        if not self.enabled:
            return {"success": False, "error": "روبیکا تنظیم نشده"}

        caption = (
            f"🔸 سلام و وقت بخیر 🔸\n\n"
            f"احتراماً پیش فاکتور شماره {invoice_data.get('serial', '')} "
            f"جهت مشاهده و بررسی خدمتتان ارسال می‌گردد.\n\n"
            f"🔗 مشاهده آنلاین:\n{short_link}\n\n"
            f"🏢 تاسیسات حرارتی و برودتی شوفاژ دات کام\n"
            f"📞 02188302400"
        )

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                asyncio.wait_for(self._send_file_async(phone, pdf_path, caption), timeout=30.0)
            )
        except asyncio.TimeoutError:
            logger.warning("روبیکا timeout شد")
            return {"success": False, "error": "روبیکا timeout"}
        except Exception as e:
            logger.error(f"خطا در Rubika: {e}")
            return {"success": False, "error": str(e)}
        finally:
            loop.close()
