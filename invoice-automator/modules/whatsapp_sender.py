"""
ارسال پیش فاکتور از طریق واتساپ بیزنسی
دو روش:
  ۱. WhatsApp Business Cloud API (رسمی)
  ۲. باز کردن لینک wa.me (دستی - فالبک)
"""

import os
import requests
import logging
import base64

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://graph.facebook.com/v18.0"


class WhatsAppSender:
    def __init__(self, config: dict):
        self.phone_number_id = config.get("phone_number_id")
        self.access_token = config.get("access_token")
        self.api_available = bool(self.phone_number_id and self.access_token)

        if not self.api_available:
            logger.warning(
                "واتساپ API تنظیم نشده. فقط لینک wa.me ساخته می‌شود."
            )

    def _format_phone(self, phone: str) -> str:
        """تبدیل 09xx به 989xx"""
        if phone.startswith("09"):
            return "98" + phone[1:]
        elif phone.startswith("+98"):
            return phone[1:]
        elif phone.startswith("98"):
            return phone
        return phone

    # ========================================
    #  روش ۱: WhatsApp Business Cloud API
    # ========================================

    def send_document_api(self, phone: str, pdf_path: str,
                          caption: str = "", invoice_serial: str = None) -> dict:
        """ارسال PDF از طریق واتساپ Cloud API"""
        if not self.api_available:
            return {"success": False, "error": "API تنظیم نشده", "fallback_link": self.get_wa_link(phone, caption)}

        wa_phone = self._format_phone(phone)

        # مرحله ۱: آپلود فایل به واتساپ
        media_id = self._upload_media(pdf_path)
        if not media_id:
            return {"success": False, "error": "آپلود فایل ناموفق"}

        # مرحله ۲: ارسال سند
        filename = f"پیش_فاکتور_{invoice_serial}.pdf" if invoice_serial else os.path.basename(pdf_path)

        url = f"{WHATSAPP_API_URL}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": wa_phone,
            "type": "document",
            "document": {
                "id": media_id,
                "caption": caption,
                "filename": filename,
            }
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                logger.info(f"PDF با موفقیت به واتساپ {phone} ارسال شد")
                return {"success": True, "data": response.json()}
            else:
                logger.error(f"خطا: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"خطا در ارسال واتساپ: {e}")
            return {"success": False, "error": str(e)}

    def send_text_with_link(self, phone: str, message: str) -> dict:
        """ارسال پیام متنی با لینک"""
        if not self.api_available:
            return {"success": False, "fallback_link": self.get_wa_link(phone, message)}

        wa_phone = self._format_phone(phone)
        url = f"{WHATSAPP_API_URL}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": wa_phone,
            "type": "text",
            "text": {"body": message}
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                return {"success": True}
            return {"success": False, "error": response.text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _upload_media(self, file_path: str) -> str:
        """آپلود فایل به Media API واتساپ"""
        url = f"{WHATSAPP_API_URL}/{self.phone_number_id}/media"
        headers = {"Authorization": f"Bearer {self.access_token}"}

        with open(file_path, "rb") as f:
            files = {
                "file": (os.path.basename(file_path), f, "application/pdf"),
            }
            data = {"messaging_product": "whatsapp"}

            try:
                response = requests.post(url, headers=headers, files=files, data=data, timeout=60)
                if response.status_code == 200:
                    return response.json().get("id")
            except Exception as e:
                logger.error(f"خطا در آپلود media: {e}")

        return None

    # ========================================
    #  روش ۲: لینک wa.me (فالبک دستی)
    # ========================================

    def get_wa_link(self, phone: str, message: str = "") -> str:
        """ساخت لینک wa.me برای باز کردن چت واتساپ"""
        import urllib.parse
        wa_phone = self._format_phone(phone)
        encoded_msg = urllib.parse.quote(message)
        return f"https://wa.me/{wa_phone}?text={encoded_msg}"

    # ========================================
    #  ارسال ترکیبی (PDF + لینک)
    # ========================================

    def send_invoice(self, phone: str, pdf_path: str,
                     invoice_data: dict, short_link: str) -> dict:
        """ارسال پیش فاکتور ترکیبی"""
        from .pdf_parser import format_amount

        caption = (
            f"پیش فاکتور شماره {invoice_data.get('serial', '')}\n"
            f"مبلغ: {format_amount(invoice_data.get('total', ''))} ریال\n"
            f"لینک دانلود: {short_link}"
        )

        # تلاش با API
        result = self.send_document_api(
            phone, pdf_path, caption, invoice_data.get("serial")
        )

        if not result.get("success") and result.get("fallback_link"):
            logger.info(f"لینک فالبک واتساپ: {result['fallback_link']}")

        return result
