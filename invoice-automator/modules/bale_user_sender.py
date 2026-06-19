"""
ارسال پیش‌فاکتور با «اکانت شخصی» بله (نه ربات).

برخلاف نسخه‌ی ربات (bale_sender.py) که با Bot API کار می‌کند و مشتری باید
ابتدا ربات را استارت کند، این ماژول از کتابخانه‌ی aiobale و حساب شخصی
کاربر استفاده می‌کند. پیام مستقیماً از طرف حساب شما برای مشتری ارسال
می‌شود و یک «گفتگوی دوطرفه» در بله ایجاد می‌گردد (مثل روبیکا).

نشست ورود به‌صورت یک‌باره با شماره و کد تأیید ساخته و در فایل session
ذخیره می‌شود؛ این ماژول فقط از همان نشست برای ارسال استفاده می‌کند.

نکته: استفاده از حساب شخصی ممکن است طبق قوانین بله محدودیت داشته باشد؛
با احتیاط استفاده شود.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)


class BaleUserSender:
    def __init__(self, config: dict):
        # مسیر فایل نشستِ ساخته‌شده هنگام ورود یک‌باره
        self.session_file = config.get("session_file", "")
        self.enabled = bool(self.session_file)

    def _intl(self, phone: str) -> str:
        """شماره به قالب بین‌المللی بدون + و بدون صفر ابتدایی: 98XXXXXXXXXX"""
        p = (phone or "").strip().replace(" ", "").replace("-", "")
        if p.startswith("0098"):
            p = p[2:]
        if p.startswith("+"):
            p = p[1:]
        if p.startswith("0"):
            p = "98" + p[1:]
        return p

    async def _resolve_peer(self, client, phone: str):
        """یافتن کاربر بله از روی شماره؛ در صورت نبودن، افزودن به مخاطبین."""
        intl = self._intl(phone)
        # ۱) جستجو در مخاطبین/سراسری
        try:
            peer = await client.search_contact(intl)
            if peer is not None:
                return peer
        except Exception as e:
            logger.debug(f"search_contact: {e}")

        # ۲) افزودن به مخاطبین (هم کاربر را پیدا می‌کند، هم گفتگو می‌سازد)
        try:
            peers = await client.import_contacts([(int(intl), "مشتری")])
            if peers:
                return peers[0]
        except Exception as e:
            logger.debug(f"import_contacts: {e}")

        return None

    async def _send_async(self, phone: str, pdf_path: str, caption: str) -> dict:
        try:
            from aiobale import Client
            from aiobale.types import FileInput
            from aiobale.enums import ChatType
        except ImportError:
            logger.error("کتابخانه aiobale نصب نیست: pip install aiobale")
            return {"success": False, "error": "کتابخانه aiobale نصب نیست"}

        client = Client(session_file=self.session_file)
        try:
            peer = await self._resolve_peer(client, phone)
            if peer is None:
                return {"success": False,
                        "error": f"کاربر بله با شماره {phone} پیدا نشد"}

            await client.send_document(
                file=FileInput(pdf_path),
                chat_id=peer.id,
                chat_type=ChatType.PRIVATE,
                caption=caption,
            )
            logger.info(f"PDF با اکانت شخصی بله ارسال شد: {phone}")
            return {"success": True}
        except Exception as e:
            logger.error(f"خطا در ارسال بله (اکانت شخصی): {e}")
            return {"success": False, "error": str(e)}
        finally:
            try:
                await client.session.close()
            except Exception:
                pass

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش‌فاکتور از طریق اکانت شخصی بله."""
        if not self.enabled:
            return {"success": False, "error": "بله وارد نشده"}

        caption = (
            f"🔸 سلام و وقت بخیر 🔸\n\n"
            f"🔹 احتراما پیش فاکتور شماره {invoice_data.get('serial', '')} درخواستی جهت مشاهده و بررسی خدمتتان ارسال می گردد.\n\n"
            f"🔗 مشاهده آنلاین پیش فاکتور:\n"
            f"{short_link}\n\n"
            f"🙏 با تشکر\n"
            f"🏢 تاسیسات حرارتی و برودتی شوفاژ دات کام\n\n"
            f"📞 02188302400\n\n"
            f"📍 آدرس و راه های ارتباطی:\n"
            f"🌐 https://shofazh.com/contact/"
        )

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self._send_async(phone, pdf_path, caption))
        finally:
            loop.close()
