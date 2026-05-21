"""
ارسال پیش فاکتور از طریق پیام‌رسان بله
استفاده از Bale Bot API (مشابه Telegram Bot API)

مراحل راه‌اندازی:
1. در بله به @BotFather پیام دهید
2. /newbot را ارسال کنید
3. نام و یوزرنیم ربات را وارد کنید
4. توکن دریافتی را در config.yaml وارد کنید
5. مشتری باید ابتدا ربات را /start کند

نکته مهم: در بله (مانند تلگرام) ربات فقط می‌تواند به کسی پیام بدهد
که قبلاً ربات را استارت کرده باشد. برای حل این مشکل:
- لینک ربات را در پیامک برای مشتری ارسال کنید
- یا از دیپ‌لینک استفاده کنید
"""

import os
import requests
import logging

logger = logging.getLogger(__name__)

BALE_API_URL = "https://tapi.bale.ai/bot{token}"


class BaleSender:
    def __init__(self, config: dict):
        self.token = config.get("bot_token", "")
        self.base_url = BALE_API_URL.format(token=self.token)
        self.enabled = bool(self.token)

        # کش chat_id ها (شماره تلفن -> chat_id)
        self._chat_id_cache = {}

    def _format_phone(self, phone: str) -> str:
        """فرمت شماره تلفن"""
        if phone.startswith("09"):
            return "+98" + phone[1:]
        return phone

    def get_chat_id_by_phone(self, phone: str) -> str:
        """
        پیدا کردن chat_id از شماره تلفن

        نکته: بله مستقیماً API جستجو با شماره تلفن ندارد.
        chat_id از آپدیت‌های ربات (وقتی کاربر /start می‌زند) بدست می‌آید.
        """
        if phone in self._chat_id_cache:
            return self._chat_id_cache[phone]

        # بررسی آپدیت‌های اخیر ربات
        try:
            response = requests.get(f"{self.base_url}/getUpdates", timeout=15)
            if response.status_code == 200:
                data = response.json()
                for update in data.get("result", []):
                    msg = update.get("message", {})
                    user = msg.get("from", {})
                    contact = msg.get("contact", {})

                    # اگر کاربر شماره تلفن را ارسال کرده
                    if contact.get("phone_number"):
                        user_phone = contact["phone_number"]
                        chat_id = str(msg.get("chat", {}).get("id", ""))
                        self._chat_id_cache[user_phone] = chat_id
                        # نرمال‌سازی و ذخیره
                        normalized = user_phone.replace("+", "").replace(" ", "")
                        self._chat_id_cache[normalized] = chat_id

                    # ذخیره chat_id با user_id
                    if user.get("id"):
                        chat_id = str(msg.get("chat", {}).get("id", ""))
                        if chat_id:
                            self._chat_id_cache[str(user["id"])] = chat_id

        except Exception as e:
            logger.error(f"خطا در دریافت آپدیت‌های بله: {e}")

        # جستجوی شماره با فرمت‌های مختلف
        phone_variants = [
            phone,
            phone.replace("+", ""),
            "98" + phone[1:] if phone.startswith("0") else phone,
            "+98" + phone[1:] if phone.startswith("0") else phone,
        ]

        for variant in phone_variants:
            if variant in self._chat_id_cache:
                return self._chat_id_cache[variant]

        return None

    def send_document(self, chat_id: str, pdf_path: str, caption: str = "") -> dict:
        """ارسال فایل PDF به یک چت"""
        url = f"{self.base_url}/sendDocument"

        with open(pdf_path, "rb") as f:
            files = {"document": (os.path.basename(pdf_path), f, "application/pdf")}
            data = {
                "chat_id": chat_id,
                "caption": caption,
            }

            try:
                response = requests.post(url, data=data, files=files, timeout=60)
                if response.status_code == 200 and response.json().get("ok"):
                    logger.info(f"PDF به بله ارسال شد - chat_id: {chat_id}")
                    return {"success": True, "data": response.json()}
                else:
                    logger.error(f"خطا: {response.text}")
                    return {"success": False, "error": response.text}
            except Exception as e:
                logger.error(f"خطا در ارسال به بله: {e}")
                return {"success": False, "error": str(e)}

    def send_text(self, chat_id: str, text: str) -> dict:
        """ارسال پیام متنی"""
        url = f"{self.base_url}/sendMessage"
        data = {"chat_id": chat_id, "text": text}

        try:
            response = requests.post(url, json=data, timeout=15)
            if response.status_code == 200:
                return {"success": True}
            return {"success": False, "error": response.text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور کامل"""
        if not self.enabled:
            return {"success": False, "error": "ربات بله تنظیم نشده"}

        from .pdf_parser import format_amount

        chat_id = self.get_chat_id_by_phone(phone)

        if not chat_id:
            # اگر مشتری ربات را استارت نکرده، لینک ربات را برگردان
            bot_link = f"https://ble.ir/{self.token.split(':')[0]}" if ':' in self.token else ""
            logger.warning(
                f"chat_id برای {phone} یافت نشد. "
                f"مشتری باید ابتدا ربات را استارت کند: {bot_link}"
            )
            return {
                "success": False,
                "error": "مشتری هنوز ربات بله را استارت نکرده",
                "bot_link": bot_link,
                "suggestion": "لینک ربات را در پیامک ارسال کنید تا مشتری استارت کند",
            }

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

        return self.send_document(chat_id, pdf_path, caption)

    def get_bot_start_link(self, ref: str = "") -> str:
        """ساخت لینک استارت ربات با پارامتر"""
        if ':' in self.token:
            bot_id = self.token.split(':')[0]
            if ref:
                return f"https://ble.ir/{bot_id}?start={ref}"
            return f"https://ble.ir/{bot_id}"
        return ""
